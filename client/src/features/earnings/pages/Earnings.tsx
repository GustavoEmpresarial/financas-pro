import { useState } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign, Plus, Pencil, Trash2, TrendingUp, Link2, AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { CurrencyInput } from "@/shared/components/CurrencyInput";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { MonthPicker } from "@/shared/components/MonthPicker";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell,
} from "recharts";
import { useEarnings, EARNING_CATEGORIES, type Earning } from "@/features/earnings/hooks/useEarnings";
import { useCategories } from "@/features/categories/hooks/useCategories";
import { useAltInvestments } from "@/features/alt-investments/hooks/useAltInvestments";
import { useInvestments } from "@/features/investments/hooks/useInvestments";
import { useAccounts } from "@/features/accounts/hooks/useAccounts";

const CURRENCIES = ["BRL", "BTC", "ETH", "USDT", "SOL"];

function formatCurrency(v: number, currency = "BRL") {
  if (["BTC", "ETH", "SOL", "USDT"].includes(currency)) {
    return `${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${currency}`;
  }
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function getCategoryLabel(val: string) {
  return EARNING_CATEGORIES.find((c) => c.value === val)?.label || val;
}

// ─── Add/Edit form ───────────────────────────────────────────────

type FormProps = {
  initial?: Partial<Earning>;
  onSubmit: (data: any) => void;
  isPending: boolean;
  altInvestments: { id: string; name: string }[];
  tradInvestments: { id: string; name: string }[];
  accounts: { id: string; name: string }[];
  incomeCategories: { id: string; name: string }[];
  onAddCategory: (name: string) => void;
};

function EarningForm({ initial, onSubmit, isPending, altInvestments, tradInvestments, accounts, incomeCategories, onAddCategory }: FormProps) {
  const [sourceName, setSourceName] = useState(initial?.sourceName || "");
  const [amount, setAmount] = useState(initial?.amount?.toString() || "");
  const [currency, setCurrency] = useState(initial?.currency || "BRL");
  const [date, setDate] = useState(initial?.date || format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState(initial?.description || "");
  const [category, setCategory] = useState(initial?.category || "other");
  const [linkedAlt, setLinkedAlt] = useState(initial?.linkedInvestmentId || "__none__");
  const [linkedTrad, setLinkedTrad] = useState(initial?.linkedTraditionalInvestmentId || "__none__");
  const [accountId, setAccountId] = useState(initial?.accountId || "__none__");
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const dateWarning = (() => {
    if (!date) return null;
    const parts = date.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const now = new Date();
    if (d > now) return "Data no futuro";
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (d < twoYearsAgo) return "Data anterior a 2 anos";
    return null;
  })();

  const handleSubmit = () => {
    onSubmit({
      sourceName,
      amount: parseFloat(amount),
      currency,
      date,
      description: description || null,
      category,
      linkedInvestmentId: linkedAlt === "__none__" ? null : linkedAlt,
      linkedTraditionalInvestmentId: linkedTrad === "__none__" ? null : linkedTrad,
      accountId: accountId === "__none__" ? null : accountId,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Fonte / Investimento *</Label>
          <Input value={sourceName} onChange={(e) => setSourceName(e.target.value)} maxLength={200} placeholder="Ex: Yield Guild, CDB Banco X" />
        </div>
        <div className="space-y-1.5">
          <Label>Categoria *</Label>
          <Select value={category} onValueChange={(v) => { if (v === "__new__") { setNewCatOpen(true); return; } setCategory(v); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {incomeCategories.length > 0 ? (
                incomeCategories.map((c) => (
                  <SelectItem key={c.id} value={c.name.toLowerCase()}>{c.name}</SelectItem>
                ))
              ) : (
                EARNING_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))
              )}
              <SelectItem value="__new__" className="text-primary font-medium">+ Nova categoria</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Dialog open={newCatOpen} onOpenChange={setNewCatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova Categoria de Receita</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Ex: Dividendos, Royalties" onKeyDown={(e) => { if (e.key === "Enter" && newCatName.trim()) { onAddCategory(newCatName.trim()); setNewCatOpen(false); setNewCatName(""); } }} />
            </div>
            <Button className="w-full" disabled={!newCatName.trim()} onClick={() => { onAddCategory(newCatName.trim()); setNewCatOpen(false); setNewCatName(""); }}>
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {accounts.length > 0 && (
        <div className="space-y-1.5">
          <Label>Conta (opcional)</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhuma</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Valor *</Label>
          <CurrencyInput value={amount} onValueChange={setAmount} placeholder="0,00" />
        </div>
        <div className="space-y-1.5">
          <Label>Moeda</Label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Data *</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          {dateWarning && (
            <p className="flex items-center gap-1 text-xs text-warning">
              <AlertTriangle className="h-3 w-3" />{dateWarning}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Vincular Invest. Alternativo</Label>
          <Select value={linkedAlt} onValueChange={setLinkedAlt}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {altInvestments.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Vincular Invest. Tradicional</Label>
          <Select value={linkedTrad} onValueChange={setLinkedTrad}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Nenhum</SelectItem>
              {tradInvestments.map((i) => (
                <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} rows={2} placeholder="Detalhes do ganho..." />
      </div>

      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isPending || !sourceName.trim() || !amount || parseFloat(amount) <= 0}>
          {initial?.id ? "Salvar alterações" : "Registrar ganho"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────

export default function Earnings() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: earnings, allData, isLoading, addEarning, updateEarning, deleteEarning } = useEarnings(month);
  const { investments: altInvs } = useAltInvestments();
  const { data: tradInvs = [] } = useInvestments();
  const { data: accounts = [] } = useAccounts();
  const { incomeCategories, addCategory } = useCategories();

  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<Earning | null>(null);

  // Monthly total (BRL only for simplicity)
  const monthlyBRL = earnings.filter((e) => e.currency === "BRL").reduce((s, e) => s + e.amount, 0);
  const monthlyCrypto = earnings.filter((e) => !["BRL"].includes(e.currency)).length;

  // Average daily earnings
  const daysInMonth = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).getDate();
  const avgDaily = daysInMonth > 0 ? monthlyBRL / daysInMonth : 0;

  // Yearly total
  const year = month.split("-")[0];
  const yearlyBRL = allData.filter((e) => e.date.startsWith(year) && e.currency === "BRL").reduce((s, e) => s + e.amount, 0);

  // ROI calculation for linked investments
  const roiMap = new Map<string, { invested: number; earned: number; name: string }>();
  allData.forEach((e) => {
    const invId = e.linkedInvestmentId || e.linkedTraditionalInvestmentId;
    if (!invId) return;
    const inv = altInvs.find((i) => i.id === invId) || tradInvs.find((i) => i.id === invId);
    if (!inv) return;
    const existing = roiMap.get(invId) || { invested: "investedAmount" in inv ? inv.investedAmount : 0, earned: 0, name: inv.name };
    existing.earned += e.currency === "BRL" ? e.amount : 0;
    roiMap.set(invId, existing);
  });
  const roiList = Array.from(roiMap.entries())
    .map(([id, v]) => ({ id, ...v, roi: v.invested > 0 ? ((v.earned / v.invested) * 100) : 0 }))
    .filter((r) => r.earned > 0)
    .sort((a, b) => b.roi - a.roi);

  // Evolution chart (last 6 months)
  const evolutionData = Array.from({ length: 6 }, (_, i) => {
    const [y, mo] = month.split("-").map(Number);
    const d = subMonths(new Date(y, mo - 1, 1), 5 - i);
    const m = format(d, "yyyy-MM");
    const total = allData.filter((e) => e.date.startsWith(m) && e.currency === "BRL").reduce((s, e) => s + e.amount, 0);
    return { month: format(d, "MMM", { locale: ptBR }), total };
  });

  // Category breakdown
  const catMap = new Map<string, number>();
  earnings.filter((e) => e.currency === "BRL").forEach((e) => {
    catMap.set(e.category, (catMap.get(e.category) || 0) + e.amount);
  });
  const catData = Array.from(catMap.entries()).map(([cat, value]) => ({
    name: getCategoryLabel(cat),
    value,
  })).sort((a, b) => b.value - a.value);

  const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#6b7280"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Receitas</h1>
          <p className="text-sm text-muted-foreground">Registre e acompanhe todas as suas receitas de investimentos e outras fontes</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker value={month} onChange={setMonth} />
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" />Nova Receita</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Registrar Receita</DialogTitle></DialogHeader>
              <EarningForm
                onSubmit={(data) => { addEarning.mutate(data, { onSuccess: () => setAddOpen(false) }); }}
                isPending={addEarning.isPending}
                altInvestments={altInvs.map((i) => ({ id: i.id, name: i.name }))}
                tradInvestments={tradInvs.map((i) => ({ id: i.id, name: i.name }))}
                accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
                incomeCategories={incomeCategories.map((c: any) => ({ id: c.id, name: c.name }))}
                onAddCategory={(name: string) => addCategory.mutate({ name, type: "income" })}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-income" />
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Mensal</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-income">{formatCurrency(monthlyBRL)}</p></CardContent>
        </Card>
        <Card className="glass-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Média Diária</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-amber-400">{formatCurrency(avgDaily)}</p></CardContent>
        </Card>
        <Card className="glass-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receitas em Cripto</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-primary">{monthlyCrypto} registros</p></CardContent>
        </Card>
        <Card className="glass-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-violet-500" />
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Acumulado {year}</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-violet-400">{formatCurrency(yearlyBRL)}</p></CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />Evolução de Lucros (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="total" stroke="hsl(152, 69%, 40%)" strokeWidth={2} dot={{ r: 3 }} name="Ganhos" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />Por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {catData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nenhum ganho em BRL neste mês</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={catData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" fontSize={12} tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`} />
                  <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Valor">
                    {catData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROI */}
      {roiList.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Link2 className="h-4 w-4 text-primary" />ROI por Investimento Vinculado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {roiList.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border bg-background/50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Investido: {formatCurrency(r.invested)} · Ganho: {formatCurrency(r.earned)}
                    </p>
                  </div>
                  <Badge variant={r.roi >= 100 ? "default" : "secondary"} className="text-sm">
                    ROI {r.roi.toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings list */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Registros do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhum ganho registrado neste mês</p>
          ) : (
            <div className="space-y-2">
              {earnings.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-lg border bg-background/50 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-income/10 text-income flex-shrink-0">
                      <DollarSign className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{e.sourceName}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">{getCategoryLabel(e.category)}</Badge>
                        {(e.linkedInvestmentId || e.linkedTraditionalInvestmentId) && (
                          <Link2 className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {e.description ? `${e.description} · ` : ""}
                        {format(new Date(e.date + "T12:00:00"), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="text-sm font-semibold text-income">+{formatCurrency(e.amount, e.currency)}</p>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem(e)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir ganho?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o ganho de {formatCurrency(e.amount, e.currency)} de {e.sourceName}? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteEarning.mutate(e.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Ganho</DialogTitle></DialogHeader>
          {editItem && (
            <EarningForm
              initial={editItem}
              onSubmit={(data) => {
                updateEarning.mutate({ id: editItem.id, ...data }, { onSuccess: () => setEditItem(null) });
              }}
              isPending={updateEarning.isPending}
              altInvestments={altInvs.map((i) => ({ id: i.id, name: i.name }))}
              tradInvestments={tradInvs.map((i) => ({ id: i.id, name: i.name }))}
              accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
              incomeCategories={incomeCategories.map((c: any) => ({ id: c.id, name: c.name }))}
              onAddCategory={(name: string) => addCategory.mutate({ name, type: "income" })}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
