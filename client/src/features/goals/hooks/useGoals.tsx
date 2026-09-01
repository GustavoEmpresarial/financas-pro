import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

export function useGoals(month?: string) {
  const { user } = useAuth(); const qc = useQueryClient();
  const query = useQuery({ queryKey: ["goals", user?.id, month], queryFn: () => API.get("/goals").then(r => r.data), enabled: !!user });
  const add = useMutation({ mutationFn: (g: any) => API.post("/goals", g), onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); toast.success("Meta criada!"); }, onError: (e: any) => toast.error(e.message) });
  const update = useMutation({ mutationFn: ({ id, ...d }: any) => API.put(`/goals/${id}`, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); toast.success("Atualizada!"); }, onError: (e: any) => toast.error(e.message) });
  const del = useMutation({ mutationFn: (id: string) => API.del(`/goals/${id}`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); toast.success("Removida!"); }, onError: (e: any) => toast.error(e.message) });
  return { ...query, data: query.data ?? [], addGoal: add, updateGoal: update, deleteGoal: del };
}
