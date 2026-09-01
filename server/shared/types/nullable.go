// Package types traz tipos compartilhados entre modulos.
package types

import "encoding/json"

// Optional distingue as tres situacoes de um PATCH/PUT parcial, que um ponteiro
// simples nao consegue separar:
//
//	campo ausente no JSON      -> Set=false          -> nao mexe na coluna
//	campo presente como null   -> Set=true, Null     -> grava NULL
//	campo presente com valor   -> Set=true, Value    -> grava o valor
//
// Sem isso, "limpar as observacoes" (notes: null) fica indistinguivel de "nao
// mandei observacoes", e um dos dois comportamentos se perde.
type Optional[T any] struct {
	Value T
	Set   bool
	Null  bool
}

func (o *Optional[T]) UnmarshalJSON(b []byte) error {
	o.Set = true
	if string(b) == "null" {
		o.Null = true
		return nil
	}
	return json.Unmarshal(b, &o.Value)
}

func (o Optional[T]) MarshalJSON() ([]byte, error) {
	if !o.Set || o.Null {
		return []byte("null"), nil
	}
	return json.Marshal(o.Value)
}

// Ptr devolve o valor como ponteiro para passar ao sqlc: nil quando o campo
// nao veio ou veio null.
func (o Optional[T]) Ptr() *T {
	if !o.Set || o.Null {
		return nil
	}
	v := o.Value
	return &v
}
