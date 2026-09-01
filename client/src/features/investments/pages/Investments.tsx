import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, TrendingUp, TrendingDown, Pencil, PiggyBank, Building2, Landmark, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { CurrencyInput } from "@/shared/components/CurrencyInput";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/shared/components/ui/dialog";
import { useInvestments } from "@/features/investments/hooks/useInvestments";
import { Badge } from "@/shared/components/ui/badge";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const INVEST_TYPES: Record<string, { label: string; icon: typeof PiggyBank; color: string }> = {
  cdb: { label: "CDB", icon: PiggyBank, color: "#10b981" },
  lci: { label: "LCI", icon: Building2, color: "#3b82f6" },
  lca: { label: "LCA", icon: Building2, color: "#6366f1" },
  tesouro: { label: "Tesouro Direto", icon: Landmark, color: "#f59e0b" },
  acoes: { label: "Ações", icon: TrendingUp, color: "#8b5cf6" },
  fiis: { label: "FIIs", icon: Building2, color: "#06b6d4" },
  fundos: { label: "Fundos", icon: BarChart3, color: "#ec4899" },
  cripto: { label: "Cripto", icon: TrendingUp, color: "#f97316" },
  other: { label: "Outro", icon: PiggyBank, color: "#6b7280" },
};

const COLORS = ["#10b981", "#3b82f6", "#6366f1", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#f97316", "#6b7280"];

export default function Investments() {
  const { data: investments = [], addInvestment, updateInvestment, deleteInvestment } = useInvestments();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalInvested = investments.reduce((s: number, i: any) => s + (i.amountInvested || 0), 0);
  const totalCurrent = investments.reduce((s: number, i: any) => s + (i.currentValue || 0), 0);
  const totalReturn = totalCurrent - totalInvested;
  const returnPct = totalInvested > 0 ? ((totalReturn / totalInvested) * 100) : 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const type = form.get("type") as string;
    await addInvestment.mutateAsync({
      name: form.get("name") as string,
      ticker: (form.get("ticker") as string)?.toUpperCase() || null,
      type,
      broker: (form.get("broker") as string) || null,
      amount_invested: parseFloat(form.get("amount_invested") as string),
      current_value: parseFloat(form.get("current_value") as string) || parseFloat(form.get("amount_invested") as string),
      purchase_date: form.get("purchase_date") as string,
      category: (form.get("category") as string) || null,
      notes: (form.get("notes") as string) || null,
      color: INVEST_TYPES[type]?.color || COLORS[0],
    });
    setOpen(false);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    const form = new FormData(e.currentTarget);
    const type = form.get("type") as string;
    await updateInvestment.mutateAsync({
      id: editing.id,
      name: form.get("name") as string,
      ticker: (form.get("ticker") as string)?.toUpperCase() || null,
      type,
      broker: (form.get("broker") as string) || null,
      amount_invested: parseFloat(form.get("amount_invested") as string),
      current_value: parseFloat(form.get("current_value") as string),
      purchase_date: form.get("purchase_date") as string,
      category: (form.get("category") as string) || null,
      notes: (form.get("notes") as string) || null,
      color: INVEST_TYPES[type]?.color || COLORS[0],
    });
    setEditOpen(false);
    setEditing(null);
  };

  const openEdit = (inv: any) => {
    setEditing(inv);
    setEditOpen(true);
  };

  const chartData = useMemo(() => {
    const groups: Record<string, { name: string; value: number; color: string }> = {};
    investments.forEach((inv: any) => {
      const t = inv.type || "other";
      if (!groups[t]) {
        groups[t] = { name: INVEST_TYPES[t]?.label || "Outro", value: 0, color: INVEST_TYPES[t]?.color || "#6b7280" };
      }
      groups[t].value += inv.currentValue || 0;
    });
    return Object.values(groups).filter(g => g.value > 0);
  }, [investments]);

  const InvestmentForm = ({ isEdit }: { isEdit?: boolean }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Nome *</Label>
          <Input name="name" required placeholder="Ex: CDB 120% CDI" defaultValue={editing?.name || ""} />
        </div>
        <div className="space-y-2">
          <Label>Ticker</Label>
          <Input name="ticker" placeholder="Ex: ITSA4, BOVA11" defaultValue={editing?.ticker || ""} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo *</Label>
          <Select name="type" required defaultValue={editing?.type || ""}>
            <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {Object.entries(INVEST_TYPES).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select name="category" defaultValue={editing?.category || ""}>
            <SelectTrigger><SelectValue placeholder="Renda fixa, variável..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="renda_fixa">Renda Fixa</SelectItem>
              <SelectItem value="renda_variavel">Renda Variável</SelectItem>
              <SelectItem value="fundo">Fundos</SelectItem>
              <SelectItem value="previdencia">Previdência</SelectItem>
              <SelectItem value="outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Corretora / Banco</Label>
        <Input name="broker" placeholder="Ex: XP, Nubank, Inter" defaultValue={editing?.broker || ""} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Valor Investido (R$) *</Label>
          <CurrencyInput name="amount_invested" required defaultValue={editing?.amountInvested} />
        </div>
        <div className="space-y-2">
          <Label>Valor Atual (R$) *</Label>
          <CurrencyInput name="current_value" required defaultValue={editing?.currentValue} />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Data de Aplicação</Label>
        <Input name="purchase_date" type="date" required defaultValue={editing?.purchaseDate || format(new Date(), "yyyy-MM-dd")} />
      </div>
      <div className="space-y-2">
        <Label>Observações (opcional)</Label>
        <Input name="notes" placeholder="Ex: Taxa 120% CDI, vencimento 2028" defaultValue={editing?.notes || ""} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investimentos</h1>
          <p className="text-sm text-muted-foreground">CDB, ações, FIIs, fundos e tesouro direto</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo Investimento</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Novo Investimento</DialogTitle>
              <DialogDescription>Adicione um ativo à sua carteira.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <InvestmentForm />
              <Button type="submit" className="w-full" disabled={addInvestment.isPending}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Investido</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold">{formatCurrency(totalInvested)}</p></CardContent>
        </Card>
        <Card className="glass-card relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Valor Atual</CardTitle></CardHeader>
          <CardContent><p className="text-xl font-bold text-emerald-400">{formatCurrency(totalCurrent)}</p></CardContent>
        </Card>
        <Card className="glass-card relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1 h-full ${totalReturn >= 0 ? "bg-emerald-500" : "bg-red-500"}`} />
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rendimento</CardTitle></CardHeader>
          <CardContent className="flex items-center gap-2">
            <p className={`text-xl font-bold ${totalReturn >= 0 ? "text-emerald-400" : "text-expense"}`}>
              {totalReturn >= 0 ? "+" : "-"}{formatCurrency(Math.abs(totalReturn))}
            </p>
            {totalReturn >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-400" /> : <TrendingDown className="h-4 w-4 text-expense" />}
          </CardContent>
        </Card>
        <Card className="glass-card relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-1 h-full ${returnPct >= 0 ? "bg-emerald-500" : "bg-red-500"}`} />
          <CardHeader className="pb-1"><CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Rentabilidade</CardTitle></CardHeader>
          <CardContent>
            <p className={`text-xl font-bold ${returnPct >= 0 ? "text-emerald-400" : "text-expense"}`}>
              {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {investments.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum investimento cadastrado</p>
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Adicionar primeiro investimento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Portfolio Chart */}
          <Card className="glass-card lg:col-span-1">
            <CardHeader><CardTitle className="text-base font-semibold">Distribuição da Carteira</CardTitle></CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={chartData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                        formatter={(value: number) => [formatCurrency(value), "Valor"]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1">
                    {chartData.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <span className="font-medium">{((item.value / totalCurrent) * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">Sem dados para exibir</p>
              )}
            </CardContent>
          </Card>

          {/* Investment List */}
          <div className="lg:col-span-2 space-y-4">
            {investments.map((inv: any) => {
              const ret = (inv.currentValue || 0) - (inv.amountInvested || 0);
              const retPct = (inv.amountInvested || 0) > 0 ? (ret / inv.amountInvested) * 100 : 0;
              const ti = INVEST_TYPES[inv.type] || INVEST_TYPES.other;
              const Icon = ti.icon;

              return (
                <Card key={inv.id} className="glass-card overflow-hidden hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-4 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: `${ti.color}18` }}>
                      <Icon className="h-5 w-5" style={{ color: ti.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{inv.name}</p>
                        {inv.ticker && <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">{inv.ticker}</Badge>}
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{ti.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <p className="text-xs text-muted-foreground">
                          {inv.broker && `${inv.broker} · `}
                          {inv.purchaseDate && `Desde ${format(new Date(inv.purchaseDate + "T12:00:00"), "MMM/yy", { locale: ptBR })}`}
                        </p>
                        {inv.notes && <p className="text-xs text-muted-foreground truncate max-w-[200px]">· {inv.notes}</p>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold">{formatCurrency(inv.currentValue || 0)}</p>
                      <div className="flex items-center gap-1 justify-end">
                        {ret >= 0 ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : <TrendingDown className="h-3 w-3 text-expense" />}
                        <p className={`text-xs font-medium ${ret >= 0 ? "text-emerald-400" : "text-expense"}`}>
                          {ret >= 0 ? "+" : ""}{formatCurrency(ret)}
                          <span className="ml-1 opacity-70">({retPct >= 0 ? "+" : ""}{retPct.toFixed(2)}%)</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openEdit(inv)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense" onClick={() => deleteInvestment.mutate(inv.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Investimento</DialogTitle>
            <DialogDescription>Altere os dados do ativo.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <InvestmentForm isEdit />
            <Button type="submit" className="w-full" disabled={updateInvestment.isPending}>Salvar alterações</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
