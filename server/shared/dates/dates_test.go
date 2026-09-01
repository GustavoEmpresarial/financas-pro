package dates

import "testing"

func mustParse(t *testing.T, s string) (y, m, d int) {
	t.Helper()
	parsed, err := Parse(s)
	if err != nil {
		t.Fatalf("data invalida no teste: %s", s)
	}
	return parsed.Year(), int(parsed.Month()), parsed.Day()
}

func TestAddMonthsKeepingDay(t *testing.T) {
	cases := []struct {
		name, from string
		months     int
		day        int
		want       string
	}{
		{"mes comum", "2026-01-15", 1, 15, "2026-02-15"},
		{"dia 31 para fevereiro", "2026-01-31", 1, 31, "2026-02-28"},
		{"dia 31 para fevereiro bissexto", "2028-01-31", 1, 31, "2028-02-29"},
		{"dia 31 para abril", "2026-03-31", 1, 31, "2026-04-30"},
		{"do dia 28 volta para 31", "2026-02-28", 1, 31, "2026-03-31"},
		{"tres meses", "2026-01-31", 3, 31, "2026-04-30"},
		{"virada de ano", "2026-12-31", 1, 31, "2027-01-31"},
		{"zero meses", "2026-01-31", 0, 31, "2026-01-31"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			parsed, err := Parse(c.from)
			if err != nil {
				t.Fatal(err)
			}
			if got := AddMonthsKeepingDay(parsed, c.months, c.day); got != c.want {
				t.Errorf("AddMonthsKeepingDay(%s, %d, %d) = %s, esperava %s", c.from, c.months, c.day, got, c.want)
			}
		})
	}
}

// Meses consecutivos nunca podem colidir: o parcelamento gerava duas parcelas
// no mesmo mes por causa disso.
func TestAddMonthsKeepingDayNaoColide(t *testing.T) {
	base, _ := Parse("2026-01-31")
	seen := map[string]bool{}
	for i := 0; i < 24; i++ {
		got := AddMonthsKeepingDay(base, i, 31)
		if seen[got] {
			t.Fatalf("data repetida na parcela %d: %s", i+1, got)
		}
		seen[got] = true
		y, m, _ := mustParse(t, got)
		wantMonth := (1+i-1)%12 + 1
		wantYear := 2026 + (i)/12
		if m != wantMonth || y != wantYear {
			t.Fatalf("parcela %d caiu em %04d-%02d, esperava %04d-%02d", i+1, y, m, wantYear, wantMonth)
		}
	}
}

func TestValid(t *testing.T) {
	for _, ok := range []string{"2026-01-01", "2028-02-29"} {
		if !Valid(ok) {
			t.Errorf("%s deveria ser valida", ok)
		}
	}
	for _, bad := range []string{"2026-02-30", "2026-13-01", "01/01/2026", "", "2026-1-1"} {
		if Valid(bad) {
			t.Errorf("%s nao deveria ser valida", bad)
		}
	}
}
