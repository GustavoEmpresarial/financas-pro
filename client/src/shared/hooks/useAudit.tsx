import { useQuery } from "@tanstack/react-query";
import { API } from "@/shared/services/api";
import { useAuth } from "@/features/auth/hooks/useAuth";

export type AuditEntry = {
  id: string; tableName: string; recordId: string; action: string; oldData: any; newData: any; changedFields: string[]; userId: string; createdAt: string;
};

export const FIELD_LABELS: Record<string, string> = {};

export function useRecordHistory(table?: string, recordId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["audit", table, recordId],
    queryFn: () => API.get(`/audit/${table}/${recordId}`).then(r => r.data as AuditEntry[]),
    enabled: !!user && !!table && !!recordId,
  });
}
