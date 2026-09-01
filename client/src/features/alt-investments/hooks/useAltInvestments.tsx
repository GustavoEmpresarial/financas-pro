import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

export type AltInvestment = { id: string; name: string; type?: string; investedAmount: number; currentValue: number; purchaseDate?: string; maturityDate?: string; expectedReturn?: number; riskLevel?: string; platform?: string; notes?: string; logoUrl?: string; isActive: boolean; currency?: string; expirationDate?: string; };
export type AltEarning = { id: string; investmentId: string; amount: number; type: string; date: string; notes?: string; };

export function useAltInvestments() {
  const { user } = useAuth(); const qc = useQueryClient();
  const inv = () => { qc.invalidateQueries({ queryKey: ["alt-investments"] }); };
  const query = useQuery({ queryKey: ["alt-investments", user?.id], queryFn: () => API.get("/alt-investments").then(r => r.data as AltInvestment[]), enabled: !!user });
  const earningsQuery = useQuery({ queryKey: ["alt-investment-earnings"], queryFn: () => Promise.resolve([] as AltEarning[]), enabled: !!user });
  const addInvestment = useMutation({ mutationFn: (a: any) => API.post("/alt-investments", a), onSuccess: () => { inv(); toast.success("Investimento criado!"); }, onError: (e: any) => toast.error(e.message) });
  const updateInvestment = useMutation({ mutationFn: ({ id, ...d }: any) => API.put(`/alt-investments/${id}`, d), onSuccess: () => { inv(); toast.success("Atualizado!"); }, onError: (e: any) => toast.error(e.message) });
  const deleteInvestment = useMutation({ mutationFn: (id: string) => API.del(`/alt-investments/${id}`), onSuccess: () => { inv(); toast.success("Removido!"); }, onError: (e: any) => toast.error(e.message) });
  const addEarning = useMutation({ mutationFn: ({ invId, ...e }: any) => API.post(`/alt-investments/${invId}/earnings`, e), onSuccess: () => { inv(); toast.success("Rendimento registrado!"); }, onError: (e: any) => toast.error(e.message) });
  const updateEarning = useMutation({ mutationFn: (d: any) => API.put(`/alt-investments/${d.investmentId}/earnings`, d), onSuccess: () => inv(), onError: (e: any) => toast.error(e.message) });
  const deleteEarning = useMutation({ mutationFn: (id: string) => API.del(`/alt-investments/earnings/${id}`), onSuccess: () => inv(), onError: (e: any) => toast.error(e.message) });
  const uploadLogo = async (file: File) => { try { const { url } = await API.upload(file, "investment-logos"); return url; } catch { return null; } };
  return { ...query, investments: query.data ?? [] as AltInvestment[], earnings: earningsQuery.data ?? [] as AltEarning[], addInvestment, updateInvestment, deleteInvestment, addEarning, updateEarning, deleteEarning, uploadLogo };
}
