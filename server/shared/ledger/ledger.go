// Package ledger centraliza o efeito de um lancamento no saldo da conta.
//
// Por que existe: no backend legado, a mesma regra ("despesa debita, receita
// credita") estava copiada em seis lugares — criar, editar e apagar transacao,
// e criar, editar e apagar ganho — cada um com sua propria escada de ifs. Editar
// uma transacao fazia ate quatro UPDATEs soltos em `financial_accounts`, sem
// transacao de banco: se o processo caisse no meio, o saldo ficava errado e
// nada indicava isso.
//
// Aqui a regra e uma funcao so, e quem chama roda tudo dentro de uma transacao.
package ledger

import (
	"context"

	"financaspro/server/core/database/gen"
)

// Delta e quanto um lancamento muda o saldo da conta.
//
// Tipo desconhecido devolve 0 em vez de erro: o legado tratava so "expense" e
// "income" e ignorava o resto silenciosamente. Manter isso evita que um tipo
// novo em alguma tela quebre o lancamento inteiro.
func Delta(txType string, amount float64) float64 {
	switch txType {
	case "expense":
		return -amount
	case "income":
		return amount
	default:
		return 0
	}
}

// Apply soma delta ao saldo da conta. accountID nulo ou delta zero nao fazem
// nada — lancamento sem conta vinculada nao mexe em saldo nenhum.
//
// Uma conta que nao existe (ou e de outro dono) e ignorada em silencio, como no
// legado: apagar a conta e depois apagar uma transacao antiga dela nao pode
// falhar o request inteiro.
func Apply(ctx context.Context, q *gen.Queries, accountID *string, userID string, delta float64) error {
	if accountID == nil || *accountID == "" || delta == 0 {
		return nil
	}
	_, err := q.AdjustAccountBalance(ctx, gen.AdjustAccountBalanceParams{
		ID:     *accountID,
		UserID: userID,
		Delta:  delta,
	})
	return err
}

// Revert desfaz o efeito de um lancamento. Usado antes de editar ou apagar.
func Revert(ctx context.Context, q *gen.Queries, accountID *string, userID, txType string, amount float64) error {
	return Apply(ctx, q, accountID, userID, -Delta(txType, amount))
}
