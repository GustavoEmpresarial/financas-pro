import { API_BASE } from "@/shared/services/api";

type Level = "error" | "warning" | "fatal";

interface Report {
  level: Level;
  message: string;
  stack?: string;
  path?: string;
  context?: Record<string, unknown>;
}

// Erro de render em loop (ex.: um componente que quebra, o React tenta de
// novo, quebra nas mesmas 5000 vezes por segundo) nao pode virar 5000
// requests por segundo para o servidor. A mesma mensagem+path so e enviada
// uma vez a cada MIN_INTERVAL_MS.
const MIN_INTERVAL_MS = 10_000;
const recentlySent = new Map<string, number>();

function shouldSend(key: string): boolean {
  const now = Date.now();
  const last = recentlySent.get(key);
  if (last && now - last < MIN_INTERVAL_MS) return false;
  recentlySent.set(key, now);
  // Evita o Map crescer para sempre numa sessao longa.
  if (recentlySent.size > 200) {
    const oldest = [...recentlySent.entries()].sort((a, b) => a[1] - b[1])[0];
    if (oldest) recentlySent.delete(oldest[0]);
  }
  return true;
}

function send(report: Report) {
  const key = `${report.level}:${report.message}:${report.path ?? ""}`;
  if (!shouldSend(key)) return;

  const token = localStorage.getItem("financaspro_token");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const body = JSON.stringify({
    ...report,
    path: report.path ?? window.location.pathname,
    context: {
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      ...report.context,
    },
  });

  // fetch, nao sendBeacon: precisa do header Authorization para o erro vir
  // associado ao usuario, e sendBeacon nao permite headers customizados.
  // O proprio erro de rede desse fetch NUNCA pode re-entrar aqui (senao um
  // backend fora do ar vira loop infinito reportando "falha ao reportar
  // falha") -- por isso o catch fica vazio, de proposito.
  fetch(`${API_BASE}/api/diagnostics/errors`, { method: "POST", headers, body, keepalive: true }).catch(() => {});
}

/** Reporta um erro pego manualmente (try/catch, .catch() de uma promise). */
export function reportError(error: unknown, context?: Record<string, unknown>) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  send({ level: "error", message, stack, context });
}

/** Reporta o crash pego por um ErrorBoundary do React. */
export function reportBoundaryError(error: Error, componentStack: string | null) {
  send({
    level: "fatal",
    message: error.message,
    stack: error.stack,
    context: componentStack ? { componentStack } : undefined,
  });
}

/**
 * Liga os dois coletores globais que um ErrorBoundary sozinho nao cobre:
 * erro assincrono fora de qualquer render (setTimeout, listener de evento) e
 * promise rejeitada sem .catch(). Chame uma vez, no boot (main.tsx).
 */
export function installGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    send({
      level: "error",
      message: event.message || "Erro desconhecido",
      stack: event.error instanceof Error ? event.error.stack : undefined,
      context: { filename: event.filename, line: event.lineno, col: event.colno },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    send({
      level: "error",
      message: reason instanceof Error ? reason.message : `Promise rejeitada: ${String(reason)}`,
      stack: reason instanceof Error ? reason.stack : undefined,
      context: { unhandledRejection: true },
    });
  });

  // Deploy novo troca o hash dos chunks. Uma aba aberta de antes ainda tem o
  // index.html velho e, ao navegar para uma rota lazy, pede um chunk que nao
  // existe mais -> "Failed to fetch dynamically imported module". Recarregar
  // busca o index.html novo e resolve. O guard evita loop se o chunk sumiu
  // por outro motivo (servidor fora do ar): recarrega no maximo uma vez.
  window.addEventListener("vite:preloadError", (event) => {
    const KEY = "financaspro_chunk_reload";
    send({
      level: "warning",
      message: "Chunk defasado apos deploy; recarregando",
      context: { vitePreloadError: true },
    });
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");
    (event as Event & { preventDefault: () => void }).preventDefault();
    window.location.reload();
  });

  // Navegacao bem-sucedida limpa o guard, liberando um proximo reload.
  window.addEventListener("load", () => {
    setTimeout(() => sessionStorage.removeItem("financaspro_chunk_reload"), 5_000);
  });
}
