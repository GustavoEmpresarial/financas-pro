import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

export type Transaction = {
  id: string;
  userId: string;
  type: string;
  title: string | null;
  amount: number;
  categoryId: string | null;
  subcategoryId: string | null;
  description: string | null;
  notes: string | null;
  date: string;
  isFixed: boolean;
  paymentMethod: string;
  paymentMethodId: string | null;
  creditCardId: string | null;
  accountId: string | null;
  status: string;
  isRecurring: boolean;
  recurrenceInterval: string | null;
  paidAt: string | null;
  subscriptionId: string | null;
  tags: string[];
  installmentCount: number | null;
  installmentNumber: number | null;
  installmentGroup: string | null;
  category?: { name: string; icon: string | null; color: string | null } | null;
  creditCard?: { name: string; color: string | null } | null;
};

export type TransactionInput = {
  type?: string;
  title?: string | null;
  amount: number;
  categoryId?: string | null;
  subcategoryId?: string | null;
  description?: string | null;
  notes?: string | null;
  date: string;
  isFixed?: boolean;
  paymentMethod?: string;
  paymentMethodId?: string | null;
  creditCardId?: string | null;
  accountId?: string | null;
  status?: string;
  isRecurring?: boolean;
  recurrenceInterval?: string | null;
  tags?: string[];
  subscriptionId?: string | null;
  installmentCount?: number | null;
  installmentNumber?: number | null;
  installmentGroup?: string | null;
  createSubscription?: boolean;
};

export function useTransactions(month?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["audit"] });
  };

  const query = useQuery({
    queryKey: ["transactions", user?.id, month],
    queryFn: () => API.get(`/transactions${month ? `?month=${month}` : ""}`).then(r => r.data as Transaction[]),
    enabled: !!user,
  });

  const addTransaction = useMutation({
    mutationFn: (tx: TransactionInput) => API.post("/transactions", tx),
    onSuccess: () => { invalidate(); toast.success("Despesa registrada!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const updateTransaction = useMutation({
    mutationFn: ({ id, ...rest }: Partial<TransactionInput> & { id: string }) => API.put(`/transactions/${id}`, rest),
    onSuccess: () => { invalidate(); toast.success("Despesa atualizada!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteTransaction = useMutation({
    mutationFn: (id: string) => API.del(`/transactions/${id}`),
    onSuccess: () => { invalidate(); toast.success("Despesa removida!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => API.put(`/transactions/${id}/status`, { status }),
    onSuccess: () => { invalidate(); toast.success("Status atualizado!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const convertToRecurring = useMutation({
    mutationFn: ({ id, frequency }: { id: string; frequency: string }) => API.post(`/transactions/${id}/convert-recurring`, { frequency }),
    onSuccess: () => { invalidate(); toast.success("Convertida em assinatura!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => API.del("/transactions/bulk", { ids }),
    onSuccess: () => { invalidate(); toast.success("Despesas removidas!"); },
    onError: (err: any) => toast.error(err.message),
  });

  return {
    ...query,
    data: query.data ?? [] as Transaction[],
    addTransaction, updateTransaction, deleteTransaction, setStatus,
    convertToRecurring, bulkDelete,
  };
}
