import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

export function useInvestments() {
  const { user } = useAuth(); const qc = useQueryClient();
  const query = useQuery({ queryKey: ["investments", user?.id], queryFn: () => API.get("/investments").then(r => r.data), enabled: !!user });
  const add = useMutation({ mutationFn: (i: any) => API.post("/investments", i), onSuccess: () => { qc.invalidateQueries({ queryKey: ["investments"] }); toast.success("Investimento criado!"); }, onError: (e: any) => toast.error(e.message) });
  const update = useMutation({ mutationFn: ({ id, ...d }: any) => API.put(`/investments/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["investments"] }); toast.success("Atualizado!"); }, onError: (e: any) => toast.error(e.message) });
  const del = useMutation({ mutationFn: (id: string) => API.del(`/investments/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["investments"] }); toast.success("Removido!"); }, onError: (e: any) => toast.error(e.message) });
  return { ...query, data: query.data ?? [], addInvestment: add, updateInvestment: update, deleteInvestment: del };
}
