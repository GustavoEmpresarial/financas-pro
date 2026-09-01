import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { toast } from "sonner";

export type Category = {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  color: string | null;
  type: string;
  parentId: string | null;
  isDefault: boolean;
  sortOrder: number;
};

export const CATEGORY_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
  "#10b981", "#14b8a6", "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6",
  "#a855f7", "#d946ef", "#ec4899", "#64748b",
];

export function useCategories() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["categories", user?.id],
    queryFn: () => API.get("/categories").then(r => r.data as Category[]),
    enabled: !!user,
  });

  const all = query.data ?? [];
  const parents = all.filter((c) => !c.parentId);
  const expenseCategories = parents.filter((c) => c.type === "expense");
  const incomeCategories = parents.filter((c) => c.type === "income");

  const addCategory = useMutation({
    mutationFn: (input: { name: string; type: string; color?: string; icon?: string; parentId?: string }) => API.post("/categories", input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Categoria criada!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, ...updates }: Partial<Category> & { id: string }) => API.put(`/categories/${id}`, updates),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Categoria atualizada!"); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => API.del(`/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["categories"] }); qc.invalidateQueries({ queryKey: ["transactions"] }); toast.success("Categoria excluída!"); },
    onError: (e: any) => toast.error(e.message),
  });

  return { ...query, data: all, parents, expenseCategories, incomeCategories, subcategoriesOf: (parentId?: string | null) => parentId ? all.filter((c) => c.parentId === parentId) : [], addCategory, updateCategory, deleteCategory };
}
