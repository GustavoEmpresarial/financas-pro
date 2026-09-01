// Package utils traz os helpers de forma do legado (server/src/utils.ts).
package utils

import (
	"encoding/json"
	"strings"
	"unicode"
)

// SnakeToCamel: "payment_method_id" -> "paymentMethodId".
//
// Porte do regex /_([a-z])/g do legado: so converte quando a letra apos o
// underscore e minuscula, entao "_Foo" e "__x" ficam intactos, igual la.
func SnakeToCamel(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for i := 0; i < len(s); i++ {
		if s[i] == '_' && i+1 < len(s) && s[i+1] >= 'a' && s[i+1] <= 'z' {
			b.WriteByte(byte(unicode.ToUpper(rune(s[i+1]))))
			i++
			continue
		}
		b.WriteByte(s[i])
	}
	return b.String()
}

// CamelToSnake: "paymentMethodId" -> "payment_method_id".
func CamelToSnake(s string) string {
	var b strings.Builder
	b.Grow(len(s) + 4)
	for _, r := range s {
		if unicode.IsUpper(r) {
			b.WriteByte('_')
			b.WriteRune(unicode.ToLower(r))
			continue
		}
		b.WriteRune(r)
	}
	return b.String()
}

// ConvertKeys aplica conv em toda chave de objeto, recursivamente, atravessando
// arrays. Valores nao sao tocados.
func ConvertKeys(v any, conv func(string) string) any {
	switch t := v.(type) {
	case map[string]any:
		out := make(map[string]any, len(t))
		for k, val := range t {
			out[conv(k)] = ConvertKeys(val, conv)
		}
		return out
	case []any:
		for i := range t {
			t[i] = ConvertKeys(t[i], conv)
		}
		return t
	default:
		return v
	}
}

// NormalizeJSON converte as chaves de um corpo JSON de snake_case para
// camelCase. Devolve a entrada intacta se ela nao for JSON valido — quem decide
// o que fazer com corpo malformado e o handler, nao o normalizador.
func NormalizeJSON(body []byte) []byte {
	if len(body) == 0 {
		return body
	}
	var parsed any
	if err := json.Unmarshal(body, &parsed); err != nil {
		return body
	}
	out, err := json.Marshal(ConvertKeys(parsed, SnakeToCamel))
	if err != nil {
		return body
	}
	return out
}
