// Package validate traz as checagens que os modulos CRUD repetem.
//
// Contexto: no backend legado, server/src/lib/validation.ts existia com schemas
// zod que **nao eram importados por nenhuma rota** — a validacao real era um
// punhado de `if (!x)` soltos, e o resto chegava no Prisma cru. Este pacote
// existe para que isso deixe de ser opcional.
//
// As funcoes normalizam no lugar (trim, default) alem de checar, porque o
// legado tambem normalizava (`name.trim()`, `color ?? "#64748b"`) e as telas
// contam com isso.
package validate

import (
	"fmt"
	"strings"

	httperrors "financaspro/server/core/http/errors"
	"financaspro/server/shared/dates"
)

// Body e o corpo generico validado. Igual a crud.Body; declarado aqui para o
// pacote nao depender de shared/crud e criar ciclo.
type Body = map[string]any

// Required exige a chave presente e nao vazia. Aplica trim em string.
func Required(b Body, key, label string) error {
	v, ok := b[key]
	if !ok || v == nil {
		return httperrors.BadRequest(label + " é obrigatório")
	}
	if s, isStr := v.(string); isStr {
		trimmed := strings.TrimSpace(s)
		if trimmed == "" {
			return httperrors.BadRequest(label + " é obrigatório")
		}
		b[key] = trimmed
	}
	return nil
}

// Trim normaliza a chave, se ela veio como string. Nao exige presenca.
func Trim(b Body, keys ...string) {
	for _, k := range keys {
		if s, ok := b[k].(string); ok {
			b[k] = strings.TrimSpace(s)
		}
	}
}

// Default preenche a chave se ela nao veio ou veio nula.
func Default(b Body, key string, val any) {
	if v, ok := b[key]; !ok || v == nil {
		b[key] = val
	}
}

// Number exige, se a chave estiver presente, que ela seja numerica.
// JSON entrega numero como float64.
func Number(b Body, key, label string) (float64, bool, error) {
	v, ok := b[key]
	if !ok || v == nil {
		return 0, false, nil
	}
	f, isNum := v.(float64)
	if !isNum {
		return 0, false, httperrors.BadRequest(label + " precisa ser um número")
	}
	return f, true, nil
}

// Positive exige que a chave, se presente, seja um numero maior que zero.
func Positive(b Body, key, label string) error {
	f, present, err := Number(b, key, label)
	if err != nil || !present {
		return err
	}
	if f <= 0 {
		return httperrors.BadRequest(label + " precisa ser maior que zero")
	}
	return nil
}

// NotNegative exige que a chave, se presente, nao seja negativa.
func NotNegative(b Body, key, label string) error {
	f, present, err := Number(b, key, label)
	if err != nil || !present {
		return err
	}
	if f < 0 {
		return httperrors.BadRequest(label + " não pode ser negativo")
	}
	return nil
}

// IntRange exige que a chave, se presente, seja inteira e esteja no intervalo.
func IntRange(b Body, key, label string, min, max int) error {
	f, present, err := Number(b, key, label)
	if err != nil || !present {
		return err
	}
	if f != float64(int(f)) || int(f) < min || int(f) > max {
		return httperrors.BadRequest(fmt.Sprintf("%s precisa ser um número entre %d e %d", label, min, max))
	}
	return nil
}

// OneOf exige que a chave, se presente, esteja na lista.
func OneOf(b Body, key, label string, allowed ...string) error {
	v, ok := b[key]
	if !ok || v == nil {
		return nil
	}
	s, isStr := v.(string)
	if !isStr {
		return httperrors.BadRequest(label + " inválido")
	}
	for _, a := range allowed {
		if s == a {
			return nil
		}
	}
	return httperrors.BadRequest(fmt.Sprintf("%s inválido: use um de %s", label, strings.Join(allowed, ", ")))
}

// Date exige que a chave, se presente, seja "YYYY-MM-DD" e exista no calendario.
func Date(b Body, key, label string) error {
	v, ok := b[key]
	if !ok || v == nil {
		return nil
	}
	s, isStr := v.(string)
	if !isStr || !dates.Valid(s) {
		return httperrors.BadRequest(label + " precisa estar no formato AAAA-MM-DD")
	}
	return nil
}

// Month exige que a chave, se presente, seja "YYYY-MM".
func Month(b Body, key, label string) error {
	v, ok := b[key]
	if !ok || v == nil {
		return nil
	}
	s, isStr := v.(string)
	if !isStr || !dates.Valid(s+"-01") {
		return httperrors.BadRequest(label + " precisa estar no formato AAAA-MM")
	}
	return nil
}

// First devolve o primeiro erro nao nulo, para encadear checagens sem uma
// escada de ifs.
func First(errs ...error) error {
	for _, err := range errs {
		if err != nil {
			return err
		}
	}
	return nil
}
