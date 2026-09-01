package service

import (
	"testing"

	"financaspro/server/shared/dates"
)

func day(d int32) *int32 { return &d }

func mustDate(t *testing.T, s string) dates.Date {
	t.Helper()
	d, err := dates.ParseDate(s)
	if err != nil {
		t.Fatalf("data invalida no teste: %s", s)
	}
	return d
}

func TestAdvanceDate(t *testing.T) {
	cases := []struct {
		name, date, frequency, want string
		billingDay                  *int32
	}{
		{name: "semanal", date: "2026-01-05", frequency: "weekly", want: "2026-01-12"},
		{name: "mensal", date: "2026-01-15", frequency: "monthly", want: "2026-02-15"},
		{name: "trimestral", date: "2026-01-15", frequency: "quarterly", want: "2026-04-15"},
		{name: "anual", date: "2026-01-15", frequency: "yearly", want: "2027-01-15"},
		{name: "frequencia desconhecida cai em mensal", date: "2026-01-15", frequency: "vaiSaber", want: "2026-02-15"},

		// O bug do legado: o Date do JavaScript normaliza estouro de dia, entao
		// 31/01 + 1 mes virava 03/03 e a cobranca ia andando para frente.
		{name: "31 de janeiro nao vira marco", date: "2026-01-31", frequency: "monthly", want: "2026-02-28"},
		{name: "30 de janeiro nao vira marco", date: "2026-01-30", frequency: "monthly", want: "2026-02-28"},
		{name: "fevereiro bissexto", date: "2028-01-31", frequency: "monthly", want: "2028-02-29"},
		{name: "31 de marco vira 30 de abril", date: "2026-03-31", frequency: "monthly", want: "2026-04-30"},
		{name: "29 de fevereiro no ano seguinte", date: "2028-02-29", frequency: "yearly", want: "2029-02-28"},

		// billingDay manda quando informado.
		{name: "billingDay recupera o dia contratado", date: "2026-02-28", frequency: "monthly", billingDay: day(31), want: "2026-03-31"},
		{name: "billingDay fora da faixa e ignorado", date: "2026-01-15", frequency: "monthly", billingDay: day(99), want: "2026-02-15"},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := AdvanceDate(mustDate(t, c.date), c.frequency, c.billingDay)
			if got.String() != c.want {
				t.Errorf("AdvanceDate(%q, %q) = %q, esperava %q", c.date, c.frequency, got, c.want)
			}
		})
	}
}

// Com billingDay, cobrar varias vezes seguidas mantem o dia contratado: passar
// por fevereiro nao pode prender a assinatura no dia 28 para sempre.
func TestAdvanceDateNaoAcumulaDesvio(t *testing.T) {
	date := mustDate(t, "2026-01-31")
	want := []string{"2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"}
	for i, expected := range want {
		date = AdvanceDate(date, "monthly", day(31))
		if date.String() != expected {
			t.Fatalf("cobranca %d: %q, esperava %q", i+1, date, expected)
		}
	}
}
