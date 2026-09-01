// Package dates lida com as datas de negocio.
//
// No banco elas sao `date`; no JSON continuam sendo a string "AAAA-MM-DD" que o
// frontend espera. Quem faz essa ponte e o tipo Date, em date.go.
// Ver docs/decisions/0002-tipos-de-coluna.md.
package dates

import "time"

const Layout = "2006-01-02"

// Today devolve a data local de hoje no formato de negocio.
func Today() string { return time.Now().Format(Layout) }

// Valid diz se s esta em "YYYY-MM-DD" e e uma data que existe — "2026-02-30"
// e recusada.
func Valid(s string) bool {
	_, err := time.Parse(Layout, s)
	return err == nil
}

// Parse converte uma data de negocio para time.Time.
func Parse(s string) (time.Time, error) { return time.Parse(Layout, s) }

// AddMonthsKeepingDay anda n meses a partir de t e devolve a data de negocio
// com o dia pedido, preso ao ultimo dia do mes de destino.
//
// Esta e a unica forma correta de andar mes a mes neste projeto. Fazer
// `t.AddDate(0, n, 0)` direto e uma armadilha: o Go normaliza o estouro de dia,
// entao 31/01 + 1 mes vira 03/03, e nao 28/02. Duas telas ja tinham esse bug
// no backend legado — o adiamento de conta e o avanco de cobranca de
// assinatura — e o parcelamento chegava a gerar duas parcelas no mesmo mes.
//
// Por isso o calculo ancora no primeiro dia do mes, onde nao ha estouro
// possivel, e so entao aplica o dia.
func AddMonthsKeepingDay(t time.Time, n, day int) string {
	first := time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, t.Location())
	return ClampDay(first.AddDate(0, n, 0), day)
}

// ClampDay devolve a data no ano/mes de ref com o dia pedido, limitado ao
// ultimo dia daquele mes: dia 31 em fevereiro vira 28 (ou 29 em bissexto).
func ClampDay(ref time.Time, day int) string {
	if day < 1 {
		day = 1
	}
	last := time.Date(ref.Year(), ref.Month()+1, 0, 0, 0, 0, 0, ref.Location()).Day()
	if day > last {
		day = last
	}
	return time.Date(ref.Year(), ref.Month(), day, 0, 0, 0, 0, ref.Location()).Format(Layout)
}
