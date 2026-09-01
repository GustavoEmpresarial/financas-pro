package dates

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// Date e uma data de negocio: `date` no Postgres, "AAAA-MM-DD" no JSON.
//
// Existe para conciliar duas exigencias que brigam entre si:
//
//   - o banco precisa do tipo `date` de verdade, para recusar "2026-02-30" e
//     permitir comparacao e aritmetica de datas em SQL;
//   - o JSON precisa continuar sendo a string "AAAA-MM-DD", porque e o que o
//     frontend envia e exibe. Um time.Time cru sairia como
//     "2026-09-01T00:00:00Z" e quebraria toda tela que faz split("-").
//
// Sem hora e sem fuso de proposito: "vence dia 10" nao tem horario, e carregar
// um fuso junto faria a data mudar sozinha dependendo de onde o codigo roda.
type Date struct{ t time.Time }

// NewDate constroi a partir de um time.Time, descartando hora e fuso.
func NewDate(t time.Time) Date {
	return Date{t: time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)}
}

// ParseDate le "AAAA-MM-DD".
func ParseDate(s string) (Date, error) {
	t, err := time.Parse(Layout, s)
	if err != nil {
		return Date{}, fmt.Errorf("data invalida %q: esperado AAAA-MM-DD", s)
	}
	return Date{t: t}, nil
}

// TodayDate e a data local de hoje.
func TodayDate() Date { return NewDate(time.Now()) }

func (d Date) Time() time.Time { return d.t }
func (d Date) String() string  { return d.t.Format(Layout) }
func (d Date) IsZero() bool    { return d.t.IsZero() }

// Day, Month e Year expoem os componentes sem obrigar a passar por Time().
func (d Date) Day() int   { return d.t.Day() }
func (d Date) Year() int  { return d.t.Year() }
func (d Date) Month() int { return int(d.t.Month()) }

// AddMonths anda n meses preservando o dia, preso ao ultimo dia do mes de
// destino. Ver AddMonthsKeepingDay para o porque de nao usar AddDate direto.
func (d Date) AddMonths(n int) Date {
	s := AddMonthsKeepingDay(d.t, n, d.t.Day())
	out, _ := ParseDate(s)
	return out
}

// AddMonthsFixingDay e como AddMonths, mas ancora num dia contratado em vez do
// dia da propria data — para a cobranca de assinatura nao ficar presa no 28
// depois de passar por fevereiro.
func (d Date) AddMonthsFixingDay(n, day int) Date {
	s := AddMonthsKeepingDay(d.t, n, day)
	out, _ := ParseDate(s)
	return out
}

// --- banco ---

// Scan implementa sql.Scanner. O pgx entrega `date` como time.Time; a forma
// string aparece quando a query traz a coluna com cast para texto.
func (d *Date) Scan(src any) error {
	switch v := src.(type) {
	case nil:
		d.t = time.Time{}
		return nil
	case time.Time:
		d.t = v
		return nil
	case string:
		parsed, err := ParseDate(v)
		*d = parsed
		return err
	case []byte:
		parsed, err := ParseDate(string(v))
		*d = parsed
		return err
	}
	return fmt.Errorf("Date: nao sei ler %T", src)
}

// Value implementa driver.Valuer.
func (d Date) Value() (driver.Value, error) {
	if d.IsZero() {
		return nil, nil
	}
	return d.String(), nil
}

// --- JSON ---

func (d Date) MarshalJSON() ([]byte, error) {
	if d.IsZero() {
		return []byte("null"), nil
	}
	return json.Marshal(d.String())
}

func (d *Date) UnmarshalJSON(b []byte) error {
	s := strings.TrimSpace(string(b))
	if s == "null" || s == `""` {
		d.t = time.Time{}
		return nil
	}
	var raw string
	if err := json.Unmarshal(b, &raw); err != nil {
		return fmt.Errorf("data precisa ser uma string AAAA-MM-DD")
	}
	parsed, err := ParseDate(raw)
	*d = parsed
	return err
}
