import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

export function useCategoryBudgets(month?: string) {
  const { user } = useAuth(); const qc = useQueryClient();
  const query = useQuery({ queryKey: ["category-budgets", user?.id, month], queryFn: () => API.get(`/category-budgets${month ? `?month=${month}` : ""}`).then(r => r.data), enabled: !!user });
  const add = useMutation({ mutationFn: (b: any) => API.post("/category-budgets", b), onSuccess: () => { qc.invalidateQueries({ queryKey: ["category-budgets"] }); toast.success("Orçamento criado!"); }, onError: (e: any) => toast.error(e.message) });
  const del = useMutation({ mutationFn: (id: string) => API.del(`/category-budgets/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["category-budgets"] }); toast.success("Removido!"); }, onError: (e: any) => toast.error(e.message) });
  return { ...query, data: query.data ?? [], addCategoryBudget: add, deleteCategoryBudget: del };
}
