import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Mocks globais antes de importar qualquer hook
vi.mock("@/shared/services/api", () => ({
  API: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ ok: true }),
    del: vi.fn().mockResolvedValue({ ok: true }),
    upload: vi.fn().mockResolvedValue({ url: "/uploads/test.png" }),
  },
  getToken: vi.fn().mockReturnValue("fake-token"),
}));

vi.mock("@/features/auth/hooks/useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({ user: { id: "test-user-id" } }),
}));

// Mock react-query — hooks simples retornam o que as páginas esperam
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: vi.fn().mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    }),
    useMutation: vi.fn().mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
      isError: false,
      isSuccess: false,
      error: null,
    }),
    useQueryClient: vi.fn().mockReturnValue({
      invalidateQueries: vi.fn(),
    }),
  };
});

describe("Hook Contracts — cada hook exporta os campos que as páginas esperam", () => {

  it("useTransactions exporta data, addTransaction, updateTransaction, deleteTransaction", async () => {
    const { useTransactions } = await import("@/features/transactions/hooks/useTransactions");
    const result = useTransactions();
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.addTransaction).toBe("object");
    expect(typeof result.updateTransaction).toBe("object");
    expect(typeof result.deleteTransaction).toBe("object");
    expect(typeof result.setStatus).toBe("object");
    expect(typeof result.convertToRecurring).toBe("object");
    expect(typeof result.bulkDelete).toBe("object");
  });

  it("useCategories exporta data, parents, expenseCategories, incomeCategories, subcategoriesOf, mutations", async () => {
    const { useCategories } = await import("@/features/categories/hooks/useCategories");
    const result = useCategories();
    expect(Array.isArray(result.data)).toBe(true);
    expect(Array.isArray(result.parents)).toBe(true);
    expect(Array.isArray(result.expenseCategories)).toBe(true);
    expect(Array.isArray(result.incomeCategories)).toBe(true);
    expect(typeof result.subcategoriesOf).toBe("function");
    expect(typeof result.addCategory).toBe("object");
    expect(typeof result.updateCategory).toBe("object");
    expect(typeof result.deleteCategory).toBe("object");
  });

  it("useSubscriptions exporta data, addSubscription, updateSubscription, deleteSubscription, registerCharge", async () => {
    const { useSubscriptions } = await import("@/features/subscriptions/hooks/useSubscriptions");
    const result = useSubscriptions();
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.addSubscription).toBe("object");
    expect(typeof result.updateSubscription).toBe("object");
    expect(typeof result.deleteSubscription).toBe("object");
    expect(typeof result.registerCharge).toBe("object");
  });

  it("useBills exporta data + 11 mutations", async () => {
    const { useBills } = await import("@/features/bills/hooks/useBills");
    const result = useBills();
    expect(Array.isArray(result.data)).toBe(true);
    ["addBill", "updateBill", "duplicateBill", "deleteBill", "setStatus",
     "postponeBill", "splitBill", "makeRecurring", "bulkDelete", "bulkStatus"].forEach(k => {
      expect(typeof result[k]).toBe("object");
    });
  });

  it("useCreditCards exporta data, addCard, updateCard, deleteCard, uploadCardImage", async () => {
    const { useCreditCards } = await import("@/features/credit-cards/hooks/useCreditCards");
    const result = useCreditCards();
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.addCard).toBe("object");
    expect(typeof result.updateCard).toBe("object");
    expect(typeof result.deleteCard).toBe("object");
    expect(typeof result.uploadCardImage).toBe("function");
  });

  it("useAccounts exporta data, addAccount, updateAccount, deleteAccount", async () => {
    const { useAccounts } = await import("@/features/accounts/hooks/useAccounts");
    const result = useAccounts();
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.addAccount).toBe("object");
    expect(typeof result.updateAccount).toBe("object");
    expect(typeof result.deleteAccount).toBe("object");
  });

  it("useEarnings exporta data, allData, isLoading, addEarning, updateEarning, deleteEarning", async () => {
    const { useEarnings } = await import("@/features/earnings/hooks/useEarnings");
    const result = useEarnings();
    expect(Array.isArray(result.data)).toBe(true);
    expect(Array.isArray(result.allData)).toBe(true);
    expect(typeof result.isLoading).toBe("boolean");
    expect(typeof result.addEarning).toBe("object");
    expect(typeof result.updateEarning).toBe("object");
    expect(typeof result.deleteEarning).toBe("object");
  });

  it("useInvestments exporta data, addInvestment, updateInvestment, deleteInvestment", async () => {
    const { useInvestments } = await import("@/features/investments/hooks/useInvestments");
    const result = useInvestments();
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.addInvestment).toBe("object");
    expect(typeof result.updateInvestment).toBe("object");
    expect(typeof result.deleteInvestment).toBe("object");
  });

  it("useCrypto exporta data, addCrypto, deleteCrypto, livePrices com refetch", async () => {
    const { useCrypto } = await import("@/features/crypto/hooks/useCrypto");
    const result = useCrypto();
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.addCrypto).toBe("object");
    expect(typeof result.deleteCrypto).toBe("object");
    expect(result.livePrices).toHaveProperty("data");
    expect(result.livePrices).toHaveProperty("isPending");
    expect(result.livePrices).toHaveProperty("isFetching");
    expect(typeof result.livePrices.refetch).toBe("function");
  });

  it("useGoals exporta data, addGoal, updateGoal, deleteGoal", async () => {
    const { useGoals } = await import("@/features/goals/hooks/useGoals");
    const result = useGoals();
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.addGoal).toBe("object");
    expect(typeof result.updateGoal).toBe("object");
    expect(typeof result.deleteGoal).toBe("object");
  });

  it("useAltInvestments exporta investments, earnings, mutations, uploadLogo", async () => {
    const { useAltInvestments } = await import("@/features/alt-investments/hooks/useAltInvestments");
    const result = useAltInvestments();
    expect(Array.isArray(result.investments)).toBe(true);
    expect(Array.isArray(result.earnings)).toBe(true);
    expect(typeof result.addInvestment).toBe("object");
    expect(typeof result.updateInvestment).toBe("object");
    expect(typeof result.deleteInvestment).toBe("object");
    expect(typeof result.addEarning).toBe("object");
    expect(typeof result.updateEarning).toBe("object");
    expect(typeof result.deleteEarning).toBe("object");
    expect(typeof result.uploadLogo).toBe("function");
  });

  it("useTransfers exporta data, addTransfer, deleteTransfer", async () => {
    const { useTransfers } = await import("@/features/transfers/hooks/useTransfers");
    const result = useTransfers();
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.addTransfer).toBe("object");
    expect(typeof result.deleteTransfer).toBe("object");
  });

  it("usePaymentMethods exporta data, addPaymentMethod, updatePaymentMethod, deletePaymentMethod", async () => {
    const { usePaymentMethods } = await import("@/features/credit-cards/hooks/usePaymentMethods");
    const result = usePaymentMethods();
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.addPaymentMethod).toBe("object");
    expect(typeof result.updatePaymentMethod).toBe("object");
    expect(typeof result.deletePaymentMethod).toBe("object");
  });

  it("useCategoryBudgets exporta data, addCategoryBudget, deleteCategoryBudget", async () => {
    const { useCategoryBudgets } = await import("@/features/categories/hooks/useCategoryBudgets");
    const result = useCategoryBudgets();
    expect(Array.isArray(result.data)).toBe(true);
    expect(typeof result.addCategoryBudget).toBe("object");
    expect(typeof result.deleteCategoryBudget).toBe("object");
  });

  it("useAudit exporta useRecordHistory", async () => {
    const mod = await import("@/shared/hooks/useAudit");
    expect(typeof mod.useRecordHistory).toBe("function");
  });

  it("useCurrency exporta format, formatCompact, mode, symbol", async () => {
    const { useCurrency } = await import("@/shared/hooks/useCurrency");
    // renderHook, e nao useCurrency() direto: hook chamado fora de um
    // componente nao tem dispatcher do React e estoura em useCallback.
    const { result: hook } = renderHook(() => useCurrency());
    const result = hook.current;
    expect(typeof result.format).toBe("function");
    expect(typeof result.formatCompact).toBe("function");
    expect(result.mode).toBe("BRL");
    expect(result.symbol).toBe("R$");
  });
});
