// Vazio (padrao) quando o build e servido pelo proprio backend Go: /api e
// /uploads resolvem contra a mesma origem. Definido via VITE_API_BASE_URL
// apenas no build do APK (Capacitor empacota os arquivos localmente, entao
// um caminho relativo resolveria contra o esquema local do WebView, nao
// contra o servidor real).
export const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

const TOKEN_KEY = "financaspro_token";

// Resolve uma URL de asset (imagem de cartao, logo de assinatura) vinda da
// API. Path relativo -> prefixado com API_BASE; URL absoluta -> devolvida
// como esta.
export function resolveAssetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return `${API_BASE}${path}`;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(method: string, path: string, body?: any, isFormData = false) {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let fetchBody: BodyInit | undefined;
  if (body !== undefined) {
    if (isFormData) {
      fetchBody = body as FormData;
    } else {
      headers["Content-Type"] = "application/json";
      fetchBody = JSON.stringify(body);
    }
  }

  const res = await fetch(`${API_BASE}${path}`, { method, headers, body: fetchBody });
  if (res.status === 401) {
    removeToken();
    window.location.href = "/auth";
    throw new Error("Não autorizado");
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro na requisição");
  return data;
}

export const API = {
  get: (path: string) => request("GET", `/api${path}`),
  post: (path: string, body?: any) => request("POST", `/api${path}`, body),
  put: (path: string, body?: any) => request("PUT", `/api${path}`, body),
  del: (path: string, body?: any) => request("DELETE", `/api${path}`, body),
  upload: (file: File, bucket = "uploads") => {
    const form = new FormData();
    form.append("file", file);
    form.append("bucket", bucket);
    return request("POST", "/api/upload", form, true) as Promise<{ url: string }>;
  },
};

// Auth helpers
export const AuthAPI = {
  register: (email: string, password: string, displayName?: string) =>
    request("POST", "/api/auth/register", { email, password, displayName }),
  login: (email: string, password: string) =>
    request("POST", "/api/auth/login", { email, password }),
  me: () => request("GET", "/api/auth/me"),
};
