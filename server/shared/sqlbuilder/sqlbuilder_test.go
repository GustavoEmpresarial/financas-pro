package sqlbuilder

import (
	"strings"
	"testing"

	"financaspro/server/shared/utils"
)

var cols = NewColumns("name", "amount", "notes")

func patch(body map[string]any) *Patch {
	return NewPatch(body, cols, utils.CamelToSnake)
}

func TestPatchIgnoraColunaForaDaAllowlist(t *testing.T) {
	// userId e id sao exatamente o que o stripProtected do legado removia.
	p := patch(map[string]any{"name": "Mercado", "userId": "outro", "id": "forjado", "hackzz": 1})
	q, args, err := p.UpdateOwned("bills", "b1", "u1")
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(q, "user_id =") && !strings.HasSuffix(q, "user_id = $3 AND deleted_at IS NULL") {
		t.Fatalf("user_id nao pode ser atribuido pelo cliente: %s", q)
	}
	if strings.Contains(q, "id = $1") {
		t.Fatalf("id nao pode ser atribuido pelo cliente: %s", q)
	}
	if len(args) != 3 { // name + id + userID
		t.Fatalf("esperava 3 args, veio %d: %v", len(args), args)
	}
}

func TestUpdateSempreFiltraDonoENaoApagado(t *testing.T) {
	q, _, err := patch(map[string]any{"name": "x"}).UpdateOwned("goals", "g1", "u1")
	if err != nil {
		t.Fatal(err)
	}
	for _, must := range []string{"user_id = $3", "deleted_at IS NULL", "updated_at = CURRENT_TIMESTAMP"} {
		if !strings.Contains(q, must) {
			t.Errorf("faltou %q em: %s", must, q)
		}
	}
}

func TestNullExplicitoLimpaOCampo(t *testing.T) {
	// Um COALESCE por coluna nao conseguiria expressar isso.
	_, args, err := patch(map[string]any{"notes": nil}).UpdateOwned("goals", "g1", "u1")
	if err != nil {
		t.Fatal(err)
	}
	if args[0] != nil {
		t.Fatalf("esperava nil para limpar a coluna, veio %#v", args[0])
	}
}

func TestPatchVazioEErro(t *testing.T) {
	if _, _, err := patch(map[string]any{"desconhecido": 1}).UpdateOwned("goals", "g1", "u1"); err == nil {
		t.Fatal("patch sem coluna valida deveria falhar, nao gerar UPDATE sem SET")
	}
}

func TestOrdemDeterministica(t *testing.T) {
	body := map[string]any{"notes": "n", "amount": 1, "name": "x"}
	q1, _, _ := patch(body).UpdateOwned("goals", "g1", "u1")
	for i := 0; i < 20; i++ {
		q2, _, _ := patch(body).UpdateOwned("goals", "g1", "u1")
		if q1 != q2 {
			t.Fatalf("SQL instavel entre execucoes:\n%s\n%s", q1, q2)
		}
	}
}

func TestIdVazioViraNull(t *testing.T) {
	// O select em branco do cliente manda "". Com coluna uuid + FK, gravar ""
	// seria erro de sintaxe; o que o usuario quis dizer e "nenhum".
	cols := NewColumns("name", "category_id", "account_id")
	p := NewPatch(map[string]any{
		"name":       "Conta de luz",
		"categoryId": "",
		"accountId":  "   ",
	}, cols, utils.CamelToSnake)

	_, args, err := p.UpdateOwned("bills", "b1", "u1")
	if err != nil {
		t.Fatal(err)
	}
	// Ordem alfabetica das colunas: account_id, category_id, name.
	if args[0] != nil {
		t.Errorf("account_id vazio deveria virar nil, veio %#v", args[0])
	}
	if args[1] != nil {
		t.Errorf("category_id vazio deveria virar nil, veio %#v", args[1])
	}
	if args[2] != "Conta de luz" {
		t.Errorf("name nao deveria ser tocado, veio %#v", args[2])
	}
}

func TestIdPreenchidoNaoEAlterado(t *testing.T) {
	cols := NewColumns("category_id")
	id := "3f2504e0-4f89-11d3-9a0c-0305e82c3301"
	_, args, err := NewPatch(map[string]any{"categoryId": id}, cols, utils.CamelToSnake).
		UpdateOwned("bills", "b1", "u1")
	if err != nil {
		t.Fatal(err)
	}
	if args[0] != id {
		t.Errorf("id valido foi alterado: %#v", args[0])
	}
}

// Uma coluna de texto vazia continua sendo string vazia: so ids viram NULL.
func TestTextoVazioNaoViraNull(t *testing.T) {
	cols := NewColumns("notes")
	_, args, err := NewPatch(map[string]any{"notes": ""}, cols, utils.CamelToSnake).
		UpdateOwned("bills", "b1", "u1")
	if err != nil {
		t.Fatal(err)
	}
	if args[0] != "" {
		t.Errorf("notes vazio deveria continuar \"\", veio %#v", args[0])
	}
}
