// Package sqlbuilder monta INSERT e UPDATE parciais a partir de um corpo JSON.
//
// Por que nao e tudo sqlc: as tabelas sao largas (transactions tem 28 colunas) e
// o PUT do cliente manda um subconjunto arbitrario de campos. Em SQL estatico
// isso vira ou COALESCE em toda coluna — que torna impossivel gravar NULL, ou
// seja, impossivel limpar um campo — ou um CASE WHEN por coluna, que dobra o
// numero de parametros. Nenhum dos dois se paga.
//
// Aqui o SQL e montado a partir de uma **allowlist de colunas declarada em
// codigo**. Nome de tabela e de coluna nunca vem do request: uma chave que nao
// esta na allowlist e simplesmente ignorada. Valor sempre vai como parametro
// $n. Isso torna injecao impossivel por construcao e, de quebra, substitui o
// stripProtected do legado: id, user_id e created_at nao estao em allowlist
// nenhuma, entao o cliente nao consegue escrever neles.
package sqlbuilder

import (
	"fmt"
	"sort"
	"strings"

	httperrors "financaspro/server/core/http/errors"
)

// Columns e o conjunto de colunas que o cliente pode escrever numa tabela.
type Columns map[string]struct{}

// NewColumns declara a allowlist. Use nomes de coluna do banco (snake_case).
func NewColumns(names ...string) Columns {
	c := make(Columns, len(names))
	for _, n := range names {
		c[n] = struct{}{}
	}
	return c
}

func (c Columns) Has(name string) bool {
	_, ok := c[name]
	return ok
}

// Patch e o corpo do request ja convertido para colunas do banco.
type Patch struct {
	cols []string
	vals []any
}

// NewPatch filtra um corpo JSON (chaves camelCase) pela allowlist e converte as
// chaves para snake_case.
//
// Chave fora da allowlist e descartada em silencio — mesmo comportamento
// pratico do legado, que ignorava campo desconhecido porque o Prisma so olhava
// o que existia no modelo.
func NewPatch(body map[string]any, allowed Columns, toColumn func(string) string) *Patch {
	p := &Patch{}
	keys := make([]string, 0, len(body))
	for k := range body {
		keys = append(keys, k)
	}
	// Ordem estavel: o SQL gerado para o mesmo corpo e sempre igual, o que
	// deixa o log legivel e o plano de query reaproveitavel.
	sort.Strings(keys)

	for _, k := range keys {
		col := toColumn(k)
		if !allowed.Has(col) {
			continue
		}
		p.cols = append(p.cols, col)
		p.vals = append(p.vals, normalize(col, body[k]))
	}
	return p
}

// normalize converte string vazia em NULL nas colunas de id.
//
// Os selects do cliente enviam "" quando estao em branco, e as colunas de id
// sao uuid com chave estrangeira: gravar "" daria erro de sintaxe de uuid, e
// nao "sem valor", que e o que o usuario quis dizer ao deixar o campo vazio.
//
// Vale para qualquer coluna terminada em _id — inclusive as que ainda nao tem
// FK, para que o comportamento seja o mesmo em todas.
func normalize(col string, v any) any {
	if !strings.HasSuffix(col, "_id") {
		return v
	}
	if s, ok := v.(string); ok && strings.TrimSpace(s) == "" {
		return nil
	}
	return v
}

// Set forca uma coluna, ignorando a allowlist. Para valores que o servidor
// decide (user_id, id), nunca para dados vindos do cliente.
func (p *Patch) Set(col string, val any) *Patch {
	p.cols = append(p.cols, col)
	p.vals = append(p.vals, val)
	return p
}

func (p *Patch) Empty() bool { return len(p.cols) == 0 }

// Insert monta "INSERT INTO t (...) VALUES (...) RETURNING id".
func (p *Patch) Insert(table string) (string, []any, error) {
	if p.Empty() {
		return "", nil, httperrors.BadRequest("Nenhum campo informado")
	}
	placeholders := make([]string, len(p.cols))
	for i := range p.cols {
		placeholders[i] = fmt.Sprintf("$%d", i+1)
	}
	q := fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES (%s) RETURNING id",
		table,
		strings.Join(p.cols, ", "),
		strings.Join(placeholders, ", "),
	)
	return q, p.vals, nil
}

// UpdateOwned monta o UPDATE de um registro do usuario.
//
// O WHERE carrega sempre user_id e deleted_at IS NULL: sem isso, conhecer um id
// bastaria para editar registro de outro dono, ou para reviver um registro
// apagado. Nao remova nenhuma das duas condicoes.
func (p *Patch) UpdateOwned(table, id, userID string) (string, []any, error) {
	if p.Empty() {
		return "", nil, httperrors.BadRequest("Nenhum campo para atualizar")
	}
	assignments := make([]string, 0, len(p.cols)+1)
	for i, col := range p.cols {
		assignments = append(assignments, fmt.Sprintf("%s = $%d", col, i+1))
	}
	assignments = append(assignments, "updated_at = CURRENT_TIMESTAMP")

	args := append([]any(nil), p.vals...)
	args = append(args, id, userID)

	q := fmt.Sprintf(
		"UPDATE %s SET %s WHERE id = $%d AND user_id = $%d AND deleted_at IS NULL",
		table,
		strings.Join(assignments, ", "),
		len(p.vals)+1,
		len(p.vals)+2,
	)
	return q, args, nil
}
