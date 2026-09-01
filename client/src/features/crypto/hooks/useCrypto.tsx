import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

export function useCrypto() {
  const { user } = useAuth(); const qc = useQueryClient();
  const query = useQuery({ queryKey: ["crypto", user?.id], queryFn: () => API.get("/crypto").then(r => r.data), enabled: !!user });
  const add = useMutation({ mutationFn: (c: any) => API.post("/crypto", c), onSuccess: () => { qc.invalidateQueries({ queryKey: ["crypto"] }); toast.success("Holding criado!"); }, onError: (e: any) => toast.error(e.message) });
  const update = useMutation({ mutationFn: ({ id, ...d }: any) => API.put(`/crypto/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["crypto"] }); toast.success("Atualizado!"); }, onError: (e: any) => toast.error(e.message) });
  const del = useMutation({ mutationFn: (id: string) => API.del(`/crypto/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["crypto"] }); toast.success("Removido!"); }, onError: (e: any) => toast.error(e.message) });
  return { ...query, data: query.data ?? [], addCrypto: add, updateCrypto: update, deleteCrypto: del, livePrices: { data: {}, isPending: false, isFetching: false, error: null, refetch: () => {} } };
}
