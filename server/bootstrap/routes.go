package bootstrap

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"financaspro/server/core/http/middleware"
	"financaspro/server/core/http/responses"
	"financaspro/server/modules/accounts"
	altinvestments "financaspro/server/modules/alt_investments"
	"financaspro/server/modules/audit"
	"financaspro/server/modules/auth"
	"financaspro/server/modules/bills"
	"financaspro/server/modules/categories"
	categorybudgets "financaspro/server/modules/category_budgets"
	creditcards "financaspro/server/modules/credit_cards"
	"financaspro/server/modules/crypto"
	"financaspro/server/modules/diagnostics"
	"financaspro/server/modules/earnings"
	"financaspro/server/modules/goals"
	"financaspro/server/modules/investments"
	paymentmethods "financaspro/server/modules/payment_methods"
	"financaspro/server/modules/subscriptions"
	"financaspro/server/modules/transactions"
	"financaspro/server/modules/transfers"
	"financaspro/server/modules/upload"
	"financaspro/server/modules/users"
)

// Router monta a arvore de rotas.
//
// A ordem de montagem espelha o legado (server/src/app.ts):
//  1. middlewares transversais
//  2. /api/health
//  3. /uploads/ estatico
//  4. os modulos, sob /api
//  5. o catch-all que serve a SPA
//
// O catch-all vem por ultimo de proposito: chi casa a rota mais especifica, mas
// deixar a SPA no fim mantem a leitura obvia de que ela e o ultimo recurso.
func (a *App) Router() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.Recover(a.Log))
	r.Use(middleware.RequestLogger(a.Log))
	r.Use(cors.Handler(cors.Options{
		// origin: true no legado — reflete qualquer origem. E um app pessoal
		// servido junto com a SPA, entao nao ha origem cruzada de verdade.
		AllowOriginFunc:  func(r *http.Request, origin string) bool { return true },
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(middleware.Normalize)

	r.Route("/api", func(api chi.Router) {
		api.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
			responses.JSON(w, http.StatusOK, map[string]any{
				"ok":   true,
				"time": time.Now().UTC().Format(time.RFC3339),
			})
		})

		a.mountModules(api)

		// Rota /api desconhecida nao pode cair na SPA: o cliente espera JSON e
		// receberia o index.html, quebrando o parse com um erro sem sentido.
		api.NotFound(func(w http.ResponseWriter, _ *http.Request) {
			responses.JSON(w, http.StatusNotFound, map[string]any{"error": "Rota não encontrada"})
		})
	})

	a.mountUploads(r)
	a.mountSPA(r)

	return r
}

// mountModules registra os modulos de dominio sob /api.
//
// Cada modulo recebe as dependencias ja construidas e monta as proprias
// camadas — bootstrap nao conhece controller, service nem repository.
func (a *App) mountModules(api chi.Router) {
	authMW := middleware.Auth(a.Signer)

	// Primeiro de tudo: diagnostics.New se registra em core/diagnostics como
	// o Reporter global. So depois disso um panic ou erro 5xx em QUALQUER
	// modulo (inclusive os montados antes desta linha, ja que Router() e
	// construido inteiro antes do primeiro request chegar) tem para onde ir.
	diagnosticsSvc := diagnostics.New(a.DB, a.Log)
	api.Group(func(pub chi.Router) {
		pub.Use(middleware.OptionalAuth(a.Signer))
		diagnostics.MountPublic(pub, diagnosticsSvc, a.Log)
	})

	auth.Mount(api, a.DB, a.Signer, a.Log, authMW)

	// Tudo daqui para baixo exige token.
	api.Group(func(private chi.Router) {
		private.Use(authMW)

		// CRUD simples, sobre o controller generico de shared/crud.
		categories.Mount(private, a.DB, a.Log)
		accounts.Mount(private, a.DB, a.Log)
		creditcards.Mount(private, a.DB, a.Log)
		crypto.Mount(private, a.DB, a.Log)
		paymentmethods.Mount(private, a.DB, a.Log)
		investments.Mount(private, a.DB, a.Log)
		goals.Mount(private, a.DB, a.Log)
		altinvestments.Mount(private, a.DB, a.Log)

		// Com regra propria.
		transactions.Mount(private, a.DB, a.Log)
		bills.Mount(private, a.DB, a.Log)
		subscriptions.Mount(private, a.DB, a.Log)
		earnings.Mount(private, a.DB, a.Log)
		transfers.Mount(private, a.DB, a.Log)
		categorybudgets.Mount(private, a.DB, a.Log)
		users.Mount(private, a.DB, a.Log)
		audit.Mount(private, a.DB, a.Log)
		upload.Mount(private, a.Config.UploadDir, a.Log)
		diagnostics.MountPrivate(private, diagnosticsSvc, a.Log)
	})
}

func (a *App) mountUploads(r chi.Router) {
	dir := a.Config.UploadDir
	fs := http.StripPrefix("/uploads/", http.FileServer(http.Dir(dir)))
	r.Handle("/uploads/*", fs)
}

// mountSPA serve o build do client, com fallback para index.html — sem ele, dar
// F5 em /transactions devolveria 404 em vez da aplicacao.
func (a *App) mountSPA(r chi.Router) {
	dir := a.Config.PublicDir
	index := filepath.Join(dir, "index.html")

	if _, err := os.Stat(index); err != nil {
		a.Log.Warn("SPA nao encontrada; servindo so a API", "publicDir", dir)
		return
	}

	r.Get("/*", func(w http.ResponseWriter, req *http.Request) {
		urlPath := strings.TrimPrefix(req.URL.Path, "/")
		if urlPath == "" {
			http.ServeFile(w, req, index)
			return
		}
		// filepath.Join limpa "..", entao um pedido a /../../etc/passwd nao
		// escapa de PublicDir.
		candidate := filepath.Join(dir, filepath.Clean("/"+urlPath))
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			http.ServeFile(w, req, candidate)
			return
		}
		http.ServeFile(w, req, index)
	})
}
