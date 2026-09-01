import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

export type Bill = {
  id: string; userId: string; title: string; amount: number; dueDate: string; paidDate?: string; paidAmount: number; isPaid: boolean; status: string; priority: string; categoryId?: string; subcategoryId?: string; accountId?: string; paymentMethodId?: string; notes?: string; isRecurring: boolean; recurrenceInterval?: string; installmentCount?: number; installmentNumber?: number; installmentGroup?: string; tags?: string[];
};

export const BILL_STATUS = [
  { value: "pending", label: "Pendente" },
  { value: "paid", label: "Pago" },
  { value: "overdue", label: "Vencido" },
  { value: "canceled", label: "Cancelado" },
];

export const BILL_PRIORITIES = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

export function useBills(month?: string) {
  const { user } = useAuth(); const qc = useQueryClient();
  const inv = () => { qc.invalidateQueries({ queryKey: ["bills"] }); qc.invalidateQueries({ queryKey: ["transactions"] }); };
  const query = useQuery({
    queryKey: ["bills", user?.id, month],
    queryFn: () => API.get(`/bills${month ? `?month=${month}` : ""}`).then(r => r.data as Bill[]),
    enabled: !!user,
  });
  const addBill = useMutation({ mutationFn: (b: any) => API.post("/bills", b), onSuccess: () => { inv(); toast.success("Conta criada!"); }, onError: (e: any) => toast.error(e.message) });
  const updateBill = useMutation({ mutationFn: ({ id, ...d }: any) => API.put(`/bills/${id}`, d), onSuccess: () => { inv(); toast.success("Conta atualizada!"); }, onError: (e: any) => toast.error(e.message) });
  const duplicateBill = useMutation({ mutationFn: (b: any) => API.post("/bills", b), onSuccess: () => { inv(); toast.success("Conta duplicada!"); }, onError: (e: any) => toast.error(e.message) });
  const deleteBill = useMutation({ mutationFn: (id: string) => API.del(`/bills/${id}`), onSuccess: () => { inv(); toast.success("Conta removida!"); }, onError: (e: any) => toast.error(e.message) });
  const setStatus = useMutation({ mutationFn: ({ id, status }: { id: string; status: string; amount?: number }) => API.put(`/bills/${id}/toggle-paid`, { toggle: true }).catch(() => API.put(`/bills/${id}`, { status })), onSuccess: () => inv(), onError: (e: any) => toast.error(e.message) });
  const postponeBill = useMutation({ mutationFn: ({ id, days, due_date }: { id: string; days?: number; due_date?: string }) => API.post(`/bills/${id}/postpone`, { months: 1 }), onSuccess: () => { inv(); toast.success("Conta adiada!"); }, onError: (e: any) => toast.error(e.message) });
  const splitBill = useMutation({ mutationFn: ({ id, parcels }: { id: string; parcels: number }) => API.post(`/bills/${id}/split`, { parcels }), onSuccess: () => { inv(); toast.success("Conta parcelada!"); }, onError: (e: any) => toast.error(e.message) });
  const makeRecurring = useMutation({ mutationFn: ({ id }: { id: string }) => API.put(`/bills/${id}`, { isRecurring: true }), onSuccess: () => { inv(); toast.success("Recorrente ativado!"); }, onError: (e: any) => toast.error(e.message) });
  const bulkDelete = useMutation({ mutationFn: (ids: string[]) => API.del("/bills/bulk", { ids }), onSuccess: (_data: any, ids: string[]) => { inv(); toast.success(`${ids.length} contas removidas!`); }, onError: (e: any) => toast.error(e.message) });
  const bulkStatus = useMutation({ mutationFn: ({ ids, status }: { ids: string[]; status: string }) => API.put("/bills/bulk", { ids, updates: { status } }), onSuccess: () => inv(), onError: (e: any) => toast.error(e.message) });
  return { ...query, data: query.data ?? [] as Bill[], addBill, updateBill, duplicateBill, deleteBill, setStatus, postponeBill, splitBill, makeRecurring, bulkDelete, bulkStatus };
}
