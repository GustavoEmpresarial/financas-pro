import { useQuery } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";

export type ErrorReport = {
  id: string;
  source: "server" | "client";
  level: "error" | "warning" | "fatal";
  message: string;
  stack: string | null;
  method: string | null;
  path: string | null;
  context: Record<string, unknown> | null;
  userId: string | null;
  createdAt: string;
};

// REFRESH_INTERVAL_MS: a tela e "o que quebrou agora", entao atualiza
// sozinha em vez de exigir F5 -- mas de leve, e so uma consulta de leitura.
const REFRESH_INTERVAL_MS = 30_000;

export function useErrorReports(source?: "server" | "client") {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["error-reports", source],
    queryFn: () =>
      API.get(`/diagnostics/errors${source ? `?source=${source}` : ""}`).then(r => r.data as ErrorReport[]),
    enabled: !!user,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  return { ...query, data: query.data ?? [] };
}
