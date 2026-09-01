import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

export type CreditCard = {
  id: string; userId: string; name: string; brand?: string; totalLimit: number; closingDay: number; dueDay: number; color?: string; cardType?: string; imageUrl?: string; cardNetwork?: string; isActive: boolean;
};

export function useCreditCards() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["credit-cards", user?.id],
    queryFn: () => API.get("/credit-cards").then(r => r.data as CreditCard[]),
    enabled: !!user,
  });
  const addCard = useMutation({
    mutationFn: (c: any) => API.post("/credit-cards", c),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["credit-cards"] }); toast.success("Cartão criado!"); },
    onError: (e: any) => toast.error(e.message),
  });
  const updateCard = useMutation({
    mutationFn: ({ id, ...d }: any) => API.put(`/credit-cards/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["credit-cards"] }); toast.success("Cartão atualizado!"); },
    onError: (e: any) => toast.error(e.message),
  });
  const deleteCard = useMutation({
    mutationFn: (id: string) => API.del(`/credit-cards/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["credit-cards"] }); toast.success("Cartão removido!"); },
    onError: (e: any) => toast.error(e.message),
  });
  const uploadCardImage = async (cardId: string, file: File) => {
    try {
      const { url } = await API.upload(file, "card-images");
      await API.put(`/credit-cards/${cardId}`, { image_url: url });
      qc.invalidateQueries({ queryKey: ["credit-cards"] });
      return url;
    } catch (e: any) {
      throw new Error(e.message || "Erro ao fazer upload da imagem");
    }
  };
  return { ...query, data: query.data ?? [] as CreditCard[], addCard, updateCard, deleteCard, uploadCardImage };
}
