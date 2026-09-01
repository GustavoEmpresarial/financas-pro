// Package diagnostics e o ponto de captura de erro que o resto do core/http
// chama, sem conhecer banco de dados nem o modulo que persiste.
//
// A dependencia e invertida de proposito: core/http/responses e
// core/http/middleware chamam Capture() em todo erro 5xx e panic. Quem
// implementa a gravacao de verdade (server/modules/diagnostics) se registra
// uma vez no boot via Set(). Sem isso, core/http teria que importar um
// modulo de dominio, o que inverteria a arquitetura inteira do projeto (ver
// docs/architecture/visao-geral.md).
package diagnostics

import "context"

// Report e um erro capturado, pronto para gravar. Client e server preenchem
// campos diferentes -- os dois passam pelo mesmo caminho.
type Report struct {
	Source  string // "server" ou "client"
	Level   string // "error", "warning" ou "fatal"
	Message string
	Stack   string
	Method  string
	Path    string
	UserID  *string
	// Context e um payload livre (JSON) com o que for util para depurar:
	// user agent, versao do app, url do client, etc.
	Context map[string]any
}

// Reporter persiste um Report. Implementado por
// server/modules/diagnostics/service.
type Reporter interface {
	Report(ctx context.Context, r Report)
}

type noop struct{}

func (noop) Report(context.Context, Report) {}

var current Reporter = noop{}

// Set registra o Reporter de verdade. Chamado uma vez, no boot
// (server/bootstrap/app.go). Antes disso, Capture nao faz nada -- nunca
// panica por falta de registro.
func Set(r Reporter) { current = r }

// Reset volta para o no-op. Existe para teste: um teste que chama Set com um
// fake precisa devolver o pacote ao estado neutro no t.Cleanup, senao o
// proximo teste do binario herda o fake de quem rodou antes.
func Reset() { current = noop{} }

// Capture registra um erro. Nunca bloqueia o caminho de resposta por muito
// tempo: quem implementa Reporter e responsavel por gravar em background.
func Capture(ctx context.Context, r Report) { current.Report(ctx, r) }
