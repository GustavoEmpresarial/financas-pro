import { useState, useMemo } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, TrendingDown, Download, Pencil, Calendar, CreditCard, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { CurrencyInput } from "@/shared/components/CurrencyInput";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/shared/components/ui/dialog";
import { Switch } from "@/shared/components/ui/switch";
import { MonthPicker } from "@/shared/components/MonthPicker";
import { useTransactions, Transaction } from "@/features/transactions/hooks/useTransactions";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useCreditCards } from "@/features/credit-cards/hooks/useCreditCards";
import { useAccounts } from "@/features/accounts/hooks/useAccounts";
import { Badge } from "@/shared/components/ui/badge";
import { API } from "@/shared/services/api";
import { generateUUID } from "@/shared/lib/uuid";
import { addMonthsKeepingDay } from "@/shared/lib/dates";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";

const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "cash", label: "Dinheiro" },
  { value: "debit", label: "Débito" },
  { value: "credit_card", label: "Cartão de Crédito" },
  { value: "transfer", label: "Transferência" },
];

const CHART_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#06b6d4", "#f97316", "#6b7280"];

export default function Transactions() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: transactions = [], deleteTransaction, addTransaction, updateTransaction } = useTransactions(month);
  const { user } = useAuth();
  const { data: categories = [] } = useCategories();
  const { data: cards = [] } = useCreditCards();
  const { data: accounts = [] } = useAccounts();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [installmentCount, setInstallmentCount] = useState("1");
  const [isFixed, setIsFixed] = useState(false);
  const [isEditFixed, setIsEditFixed] = useState(false);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const getMethodLabel = (m: string) => PAYMENT_METHODS.find((p) => p.value === m)?.label || m;
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const expenses = transactions.filter((t) => t.type === "expense");
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
  const daysInMonth = new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate();
  const avgDaily = daysInMonth > 0 ? totalExpenses / daysInMonth : 0;

  const { data: allTransactions = [] } = useQuery({
    queryKey: ["transactions", user?.id, "all"],
    queryFn: () => API.get("/transactions?type=expense").then(r => r.data as Transaction[]),
    enabled: !!user,
  });

  const yearlyTotal = useMemo(() => {
    const year = month.split("-")[0];
    return allTransactions.filter(t => t.date.startsWith(year)).reduce((s, t) => s + t.amount, 0);
  }, [allTransactions, month]);

  const evolutionData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const [y, mo] = month.split("-").map(Number);
      const d = subMonths(new Date(y, mo - 1, 1), 5 - i);
      const m = format(d, "yyyy-MM");
      const mStart = format(d, "yyyy-MM-01");
      const mNext = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const mEnd = format(mNext, "yyyy-MM-dd");
      const total = allTransactions
        .filter(t => t.date >= mStart && t.date < mEnd)
        .reduce((s, t) => s + t.amount, 0);
      return {
        month: format(d, "MMM", { locale: ptBR }),
        total: Math.round(total * 100) / 100,
      };
    });
  }, [allTransactions, month]);

  const catData = useMemo(() => {
    const map = new Map<string, { value: number; color: string }>();
    expenses.forEach(t => {
      const cat = t.category?.name || "Outros";
      const existing = map.get(cat);
      map.set(cat, {
        value: (existing?.value || 0) + t.amount,
        color: existing?.color || t.category?.color || CHART_COLORS[map.size % CHART_COLORS.length],
      });
    });
    return Array.from(map.entries())
      .map(([name, d]) => ({ name, value: d.value, fill: d.color }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [expenses]);

  const methodData = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach(t => {
      const m = t.paymentMethod || "pix";
      map.set(m, (map.get(m) || 0) + t.amount);
    });
    return Array.from(map.entries())
      .map(([method, value]) => ({ name: getMethodLabel(method), value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const totalAmount = parseFloat(form.get("amount") as string);
    const numInstallments = parseInt(installmentCount) || 1;
    const baseDate = form.get("date") as string;
    const categoryId = form.get("category_id") as string;
    const description = (form.get("description") as string) || undefined;
    const accountId = (form.get("account_id") as string) || null;
    const creditCardId = paymentMethod === "credit_card" ? selectedCardId || null : null;

    if (numInstallments > 1 && paymentMethod === "credit_card") {
      const groupId = generateUUID();
      const CENTS_PER_UNIT = 100; // moeda tem 2 casas decimais — nao e um numero "escolhido"
      const roundToCents = (n: number) => Math.round(n * CENTS_PER_UNIT) / CENTS_PER_UNIT;
      const installmentAmount = roundToCents(totalAmount / numInstallments);
      // A ultima parcela absorve o resto do arredondamento, para a soma das
      // parcelas fechar exatamente com totalAmount (mesma regra do backend
      // em server/modules/bills/service, funcao Split).
      const lastInstallmentAmount = roundToCents(
        totalAmount - installmentAmount * (numInstallments - 1),
      );

      for (let i = 0; i < numInstallments; i++) {
        const dateStr = addMonthsKeepingDay(baseDate, i);
        const isLast = i === numInstallments - 1;
        await addTransaction.mutateAsync({
          type: "expense",
          amount: isLast ? lastInstallmentAmount : installmentAmount,
          categoryId, date: dateStr,
          description: description ? `${description} (${i + 1}/${numInstallments})` : `Parcela ${i + 1}/${numInstallments}`,
          isFixed, isRecurring: isFixed, createSubscription: isFixed,
          paymentMethod, creditCardId, accountId,
          // Sem estes tres campos as parcelas eram gravadas soltas, sem
          // vinculo nenhuma entre si — groupId era gerado e nunca enviado.
          installmentGroup: groupId,
          installmentCount: numInstallments,
          installmentNumber: i + 1,
        });
      }
    } else {
      await addTransaction.mutateAsync({
        type: "expense", amount: totalAmount,
        categoryId, description, date: baseDate,
        isFixed, isRecurring: isFixed, createSubscription: isFixed,
        paymentMethod, creditCardId, accountId,
      });
    }
    setOpen(false);
    setPaymentMethod("pix"); setSelectedCardId(""); setInstallmentCount("1"); setIsFixed(false);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTransaction) return;
    const form = new FormData(e.currentTarget);
    const hadSubscription = !!editingTransaction.subscriptionId;
    await updateTransaction.mutateAsync({
      id: editingTransaction.id,
      amount: parseFloat(form.get("amount") as string),
      categoryId: form.get("category_id") as string,
      description: (form.get("description") as string) || null,
      isFixed: isEditFixed, isRecurring: isEditFixed,
      recurrenceInterval: isEditFixed ? "monthly" : null,
      paymentMethod, creditCardId: paymentMethod === "credit_card" ? selectedCardId || null : null,
      accountId: (form.get("account_id") as string) || null,
      date: form.get("date") as string,
    });
    if (isEditFixed && !hadSubscription) {
      await API.post(`/transactions/${editingTransaction.id}/convert-recurring`, { frequency: "monthly" });
    }
    if (!isEditFixed && hadSubscription && editingTransaction.subscriptionId) {
      await API.put(`/subscriptions/${editingTransaction.subscriptionId}`, { isActive: false, status: "canceled" });
      await API.put(`/transactions/${editingTransaction.id}`, { subscriptionId: null });
    }
    setEditOpen(false); setEditingTransaction(null);
    setPaymentMethod("pix"); setSelectedCardId(""); setInstallmentCount("1"); setIsEditFixed(false);
  };

  const openEditDialog = (t: Transaction) => {
    setEditingTransaction(t);
    setPaymentMethod(t.paymentMethod || "pix");
    setSelectedCardId(t.creditCardId || "");
    setInstallmentCount(t.installmentCount ? String(t.installmentCount) : "1");
    setIsEditFixed(t.isFixed || false);
    setEditOpen(true);
  };

  const handleExportCSV = () => {
    const headers = ["Data", "Categoria", "Descrição", "Método", "Valor"];
    const rows = expenses.map(t => [
      format(new Date(t.date + "T12:00:00"), "dd/MM/yyyy"),
      t.category?.name || "Sem categoria",
      t.description || "",
      getMethodLabel(t.paymentMethod),
      t.amount.toFixed(2),
    ]);
    const csv = [headers, ...rows].map(r => r.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `despesas_${month}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Despesas</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas despesas mensais</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <MonthPicker value={month} onChange={setMonth} />
          <Button size="sm" variant="outline" onClick={handleExportCSV} disabled={expenses.length === 0}>
            <Download className="mr-2 h-4 w-4" />CSV
          </Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setPaymentMethod("pix"); setSelectedCardId(""); setInstallmentCount("1"); setIsFixed(false); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Nova Despesa</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Despesa</DialogTitle>
                <DialogDescription>Adicione uma nova despesa ao seu mês.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2"><Label>Valor (R$) *</Label><CurrencyInput name="amount" required placeholder="0,00" /></div>
                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select name="category_id" required>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>{expenseCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Método de Pagamento *</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {paymentMethod === "credit_card" && (<>
                  <div className="space-y-2"><Label>Cartão *</Label>
                    <Select value={selectedCardId} onValueChange={setSelectedCardId} required>
                      <SelectTrigger><SelectValue placeholder="Selecione o cartão..." /></SelectTrigger>
                      <SelectContent>{cards.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} {c.brand ? `(${c.brand})` : ""}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Parcelas</Label>
                    <Select value={installmentCount} onValueChange={setInstallmentCount}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Array.from({ length: 24 }, (_, i) => i + 1).map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </>)}
                {accounts.length > 0 && paymentMethod !== "credit_card" && (
                  <div className="space-y-2"><Label>Conta (opcional)</Label>
                    <Select name="account_id"><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
                  </div>
                )}
                <div className="space-y-2"><Label>Data *</Label><Input name="date" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} /></div>
                <div className="space-y-2"><Label>Descrição (opcional)</Label><Input name="description" placeholder="Ex: Almoço no restaurante" /></div>
                <div className="flex items-center gap-2">
                  <Switch id="is_fixed" checked={isFixed} onCheckedChange={setIsFixed} />
                  <Label htmlFor="is_fixed" className="text-sm">Despesa fixa / recorrente</Label>
                </div>
                <Button type="submit" className="w-full" disabled={addTransaction.isPending || (paymentMethod === "credit_card" && !selectedCardId)}>
                  {parseInt(installmentCount) > 1 ? `Salvar em ${installmentCount}x` : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditingTransaction(null); setPaymentMethod("pix"); setSelectedCardId(""); setInstallmentCount("1"); setIsEditFixed(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Despesa</DialogTitle><DialogDescription>Altere os dados da despesa.</DialogDescription></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Valor (R$) *</Label><CurrencyInput name="amount" required placeholder="0,00" defaultValue={editingTransaction?.amount} /></div>
            <div className="space-y-2"><Label>Categoria *</Label>
              <Select name="category_id" required defaultValue={editingTransaction?.categoryId || ""}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{expenseCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Método de Pagamento *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PAYMENT_METHODS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {paymentMethod === "credit_card" && (
              <div className="space-y-2"><Label>Cartão *</Label>
                <Select value={selectedCardId} onValueChange={setSelectedCardId} required>
                  <SelectTrigger><SelectValue placeholder="Selecione o cartão..." /></SelectTrigger>
                  <SelectContent>{cards.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} {c.brand ? `(${c.brand})` : ""}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {accounts.length > 0 && paymentMethod !== "credit_card" && (
              <div className="space-y-2"><Label>Conta (opcional)</Label>
                <Select name="account_id" defaultValue={editingTransaction?.accountId || ""}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2"><Label>Data *</Label><Input name="date" type="date" required defaultValue={editingTransaction?.date || ""} /></div>
            <div className="space-y-2"><Label>Descrição (opcional)</Label><Input name="description" placeholder="Ex: Almoço no restaurante" defaultValue={editingTransaction?.description || ""} /></div>
            <div className="flex items-center gap-2">
              <Switch id="edit_is_fixed" checked={isEditFixed} onCheckedChange={setIsEditFixed} />
              <Label htmlFor="edit_is_fixed" className="text-sm">Despesa fixa / recorrente</Label>
            </div>
            <Button type="submit" className="w-full" disabled={updateTransaction.isPending || (paymentMethod === "credit_card" && !selectedCardId)}>Salvar alterações</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-expense" />
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total do Mês</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-expense">{formatCurrency(totalExpenses)}</p></CardContent>
        </Card>
        <Card className="glass-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Média Diária</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-amber-400">{formatCurrency(avgDaily)}</p></CardContent>
        </Card>
        <Card className="glass-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Transações</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{expenses.length}</p></CardContent>
        </Card>
        <Card className="glass-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Acumulado {month.slice(0,4)}</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-violet-400">{formatCurrency(yearlyTotal)}</p></CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base font-semibold flex items-center gap-2"><TrendingDown className="h-4 w-4 text-expense" />Evolução 6 Meses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(value: number) => [formatCurrency(value), "Total"]} />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={50}>
                  {evolutionData.map((_, i) => <Cell key={i} fill="hsl(var(--expense))" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base font-semibold">Por Categoria</CardTitle></CardHeader>
          <CardContent>
            {catData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma despesa neste mês</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={catData} layout="vertical" margin={{ top: 5, right: 30, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                  <YAxis type="category" dataKey="name" fontSize={12} tick={{ fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} formatter={(value: number) => [formatCurrency(value), "Gasto"]} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {catData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base font-semibold">Por Método de Pagamento</CardTitle></CardHeader>
          <CardContent>
            {methodData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum dado</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {methodData.map((m, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${CHART_COLORS[i]}18` }}>
                      {m.name === "Cartão de Crédito" ? <CreditCard className="h-4 w-4" style={{ color: CHART_COLORS[i] }} /> :
                       m.name === "Pix" ? <Wallet className="h-4 w-4" style={{ color: CHART_COLORS[i] }} /> :
                       <TrendingDown className="h-4 w-4" style={{ color: CHART_COLORS[i] }} />}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{m.name}</p>
                      <p className="text-sm font-semibold">{formatCurrency(m.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {expenses.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma despesa neste mês</p>
          ) : (
            <div className="divide-y">
              {expenses.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-expense/10 text-expense">
                      <TrendingDown className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{t.category?.name || "Sem categoria"}</p>
                        {t.isFixed && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Fixa</Badge>}
                        {t.installmentCount > 1 && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{t.installmentNumber}/{t.installmentCount}</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t.description ? `${t.description} · ` : ""}
                        {format(new Date(t.date + "T12:00:00"), "dd/MM/yyyy")}
                        {t.paymentMethod && ` · ${getMethodLabel(t.paymentMethod)}`}
                        {t.creditCard?.name && <span className="ml-1 text-primary">({t.creditCard.name})</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-semibold text-expense">-{formatCurrency(t.amount)}</p>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openEditDialog(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense" onClick={() => deleteTransaction.mutate(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
