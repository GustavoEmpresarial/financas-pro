import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

export function useTransfers() {
  const { user } = useAuth(); const qc = useQueryClient();
  const inv = () => { qc.invalidateQueries({ queryKey: ["transfers"] }); qc.invalidateQueries({ queryKey: ["accounts"] }); };
  const query = useQuery({ queryKey: ["transfers", user?.id], queryFn: () => API.get("/transfers").then(r => r.data), enabled: !!user });
  const addTransfer = useMutation({ mutationFn: (t: any) => API.post("/transfers", t), onSuccess: () => { inv(); toast.success("Transferência realizada!"); }, onError: (e: any) => toast.error(e.message) });
  const deleteTransfer = useMutation({ mutationFn: (id: string) => API.del(`/transfers/${id}`), onSuccess: () => { inv(); toast.success("Estornada!"); }, onError: (e: any) => toast.error(e.message) });
  return { ...query, data: query.data ?? [], addTransfer, deleteTransfer };
}
