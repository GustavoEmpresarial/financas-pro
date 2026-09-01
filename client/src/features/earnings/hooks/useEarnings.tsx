import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

export type Earning = {
  id: string; userId: string; sourceName: string; amount: number; date: string; currency: string; category?: string; description?: string; isFixed: boolean; accountId?: string; notes?: string; linkedInvestmentId?: string; linkedTraditionalInvestmentId?: string;
};

export const EARNING_CATEGORIES = [
  { value: "salary", label: "Salário" },
  { value: "freelance", label: "Freelance" },
  { value: "investment", label: "Investimento" },
  { value: "rental", label: "Aluguel" },
  { value: "sale", label: "Venda" },
  { value: "refund", label: "Reembolso" },
  { value: "bonus", label: "Bônus" },
  { value: "other", label: "Outros" },
];

export function useEarnings(month?: string) {
  const { user } = useAuth(); const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["earnings", user?.id, month],
    queryFn: () => API.get(`/earnings${month ? `?month=${month}` : ""}`).then(r => r.data as Earning[]),
    enabled: !!user,
  });
  const add = useMutation({ mutationFn: (e: any) => API.post("/earnings", e), onSuccess: () => { qc.invalidateQueries({ queryKey: ["earnings"] }); toast.success("Receita registrada!"); }, onError: (e: any) => toast.error(e.message) });
  const update = useMutation({ mutationFn: ({ id, ...d }: any) => API.put(`/earnings/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["earnings"] }); toast.success("Atualizada!"); }, onError: (e: any) => toast.error(e.message) });
  const del = useMutation({ mutationFn: (id: string) => API.del(`/earnings/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["earnings"] }); toast.success("Removida!"); }, onError: (e: any) => toast.error(e.message) });
  return { ...query, data: query.data ?? [], allData: query.data ?? [], isLoading: query.isLoading, addEarning: add, updateEarning: update, deleteEarning: del };
}
