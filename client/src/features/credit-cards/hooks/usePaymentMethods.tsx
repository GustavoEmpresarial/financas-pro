import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

export function usePaymentMethods() {
  const { user } = useAuth(); const qc = useQueryClient();
  const query = useQuery({ queryKey: ["payment-methods", user?.id], queryFn: () => API.get("/payment-methods").then(r => r.data), enabled: !!user });
  const add = useMutation({ mutationFn: (p: any) => API.post("/payment-methods", p), onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-methods"] }); toast.success("Método criado!"); }, onError: (e: any) => toast.error(e.message) });
  const update = useMutation({ mutationFn: ({ id, ...d }: any) => API.put(`/payment-methods/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-methods"] }); toast.success("Atualizado!"); }, onError: (e: any) => toast.error(e.message) });
  const del = useMutation({ mutationFn: (id: string) => API.del(`/payment-methods/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-methods"] }); toast.success("Removido!"); }, onError: (e: any) => toast.error(e.message) });
  return { ...query, data: query.data ?? [], addPaymentMethod: add, updatePaymentMethod: update, deletePaymentMethod: del };
}
