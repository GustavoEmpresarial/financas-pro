import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// fetch precisa existir e ser espionavel antes do modulo carregar
const fetchMock = vi.fn().mockResolvedValue({ ok: true });
vi.stubGlobal("fetch", fetchMock);

describe("errorReporter", () => {
  beforeEach(() => {
    fetchMock.mockClear();
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  it("envia um erro reportado manualmente", async () => {
    const { reportError } = await import("@/shared/services/errorReporter");
    reportError(new Error("saldo indefinido"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/diagnostics/errors");
    const body = JSON.parse((opts as RequestInit).body as string);
    expect(body.message).toBe("saldo indefinido");
    expect(body.level).toBe("error");
  });

  // O motivo de existir: um componente que entra em loop de crash nao pode
  // virar uma requisicao por frame. Sem isso, um bug de render vira tambem
  // um ataque de negacao de servico contra o proprio backend.
  it("nao reenvia o mesmo erro dentro da janela de deduplicacao", async () => {
    const { reportError } = await import("@/shared/services/errorReporter");
    for (let i = 0; i < 20; i++) {
      reportError(new Error("mesmo erro em loop"));
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reenvia depois que a janela de deduplicacao passa", async () => {
    const { reportError } = await import("@/shared/services/errorReporter");
    reportError(new Error("erro intermitente"));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(11_000);
    reportError(new Error("erro intermitente"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("erros com mensagens diferentes nao se deduplicam entre si", async () => {
    const { reportError } = await import("@/shared/services/errorReporter");
    reportError(new Error("erro A"));
    reportError(new Error("erro B"));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("manda o token de autenticacao quando existe sessao", async () => {
    localStorage.setItem("financaspro_token", "token-de-teste");
    const { reportError } = await import("@/shared/services/errorReporter");
    reportError(new Error("erro autenticado"));
    const [, opts] = fetchMock.mock.calls[0];
    const headers = (opts as RequestInit).headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer token-de-teste");
  });

  it("nunca lanca, mesmo se o proprio fetch falhar", async () => {
    fetchMock.mockRejectedValueOnce(new Error("rede fora do ar"));
    const { reportError } = await import("@/shared/services/errorReporter");
    // Se isto lancar, o teste falha sozinho -- e exatamente o que nao pode
    // acontecer: reportar erro nao pode, ele mesmo, quebrar a tela.
    expect(() => reportError(new Error("qualquer coisa"))).not.toThrow();
  });
});
