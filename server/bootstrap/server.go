package bootstrap

import (
	"context"
	"errors"
	"net/http"
	"os/signal"
	"syscall"
	"time"
)

// Serve sobe o HTTP e so retorna quando o processo recebe SIGINT/SIGTERM,
// dando 10s para os requests em andamento terminarem.
func (a *App) Serve() error {
	srv := &http.Server{
		Addr:              a.Config.Addr(),
		Handler:           a.Router(),
		ReadHeaderTimeout: 10 * time.Second,
		// Sem WriteTimeout: upload de arquivo grande em rede lenta seria
		// cortado no meio. O limite de tamanho ja e imposto no handler.
		IdleTimeout: 120 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		a.Log.Info("API no ar", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		a.Log.Info("encerrando")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		return srv.Shutdown(shutdownCtx)
	}
}
