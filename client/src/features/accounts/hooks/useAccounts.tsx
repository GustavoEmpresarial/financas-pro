import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

export function useAccounts() {
  const { user } = useAuth(); const qc = useQueryClient();
  const query = useQuery({ queryKey: ["accounts", user?.id], queryFn: () => API.get("/accounts").then(r => r.data), enabled: !!user });
  const addAccount = useMutation({ mutationFn: (a: any) => API.post("/accounts", a), onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Conta criada!"); }, onError: (e: any) => toast.error(e.message) });
  const updateAccount = useMutation({ mutationFn: ({ id, ...d }: any) => API.put(`/accounts/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Conta atualizada!"); }, onError: (e: any) => toast.error(e.message) });
  const deleteAccount = useMutation({ mutationFn: (id: string) => API.del(`/accounts/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["accounts"] }); toast.success("Conta removida!"); }, onError: (e: any) => toast.error(e.message) });
  return { ...query, data: query.data ?? [], addAccount, updateAccount, deleteAccount };
}
