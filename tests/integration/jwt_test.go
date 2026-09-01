//go:build integration

package integration

import (
	"encoding/base64"
	"encoding/json"
	"strings"
	"testing"
)

// decodePayload le a segunda parte do JWT sem verificar a assinatura — do jeito
// exato que o browser faz em useAuth.tsx.
func decodePayload(t *testing.T, token string) map[string]any {
	t.Helper()
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		t.Fatalf("token nao tem tres partes: %q", token)
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		t.Fatalf("payload nao e base64url: %v", err)
	}
	var claims map[string]any
	if err := json.Unmarshal(raw, &claims); err != nil {
		t.Fatalf("payload nao e JSON: %v", err)
	}
	return claims
}
