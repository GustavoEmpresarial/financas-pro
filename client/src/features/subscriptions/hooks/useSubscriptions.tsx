import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

export type RecurringSubscription = {
  id: string;
  userId: string;
  name: string;
  amount: number;
  frequency: string;
  categoryId: string | null;
  accountId: string | null;
  paymentMethodId: string | null;
  nextBillingDate: string | null;
  lastChargedAt: string | null;
  billingDay: number | null;
  status: string;
  isActive: boolean;
  sourceTransactionId: string | null;
  notes: string | null;
  color: string | null;
  icon: string | null;
  logoUrl: string | null;
};

export const RECURRENCE_INTERVALS = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
];

export function useSubscriptions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const query = useQuery({
    queryKey: ["subscriptions", user?.id],
    queryFn: () => API.get("/subscriptions").then(r => r.data as RecurringSubscription[]),
    enabled: !!user,
  });

  const addSubscription = useMutation({
    mutationFn: (sub: Partial<RecurringSubscription> & { name: string; amount: number }) => API.post("/subscriptions", sub),
    onSuccess: () => { invalidate(); toast.success("Assinatura adicionada!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const updateSubscription = useMutation({
    mutationFn: ({ id, ...updates }: Partial<RecurringSubscription> & { id: string }) => API.put(`/subscriptions/${id}`, updates),
    onSuccess: () => { invalidate(); toast.success("Assinatura atualizada!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteSubscription = useMutation({
    mutationFn: (id: string) => API.del(`/subscriptions/${id}`),
    onSuccess: () => { invalidate(); toast.success("Assinatura removida!"); },
    onError: (err: any) => toast.error(err.message),
  });

  const registerCharge = useMutation({
    mutationFn: ({ subId, date }: { subId: string; date?: string }) => API.post(`/subscriptions/charge/${subId}`, { date }),
    onSuccess: () => { invalidate(); toast.success("Cobrança lançada!"); },
    onError: (err: any) => toast.error(err.message),
  });

  return { ...query, data: query.data ?? [] as RecurringSubscription[], addSubscription, updateSubscription, deleteSubscription, registerCharge };
}
