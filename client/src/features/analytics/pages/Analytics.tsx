import { useState } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Wallet, PieChart as PieIcon, BarChart3, AlertTriangle, Building2, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { MonthPicker } from "@/shared/components/MonthPicker";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { useEarnings } from "@/features/earnings/hooks/useEarnings";
import { useInvestments } from "@/features/investments/hooks/useInvestments";
import { useCrypto } from "@/features/crypto/hooks/useCrypto";
import { useAltInvestments } from "@/features/alt-investments/hooks/useAltInvestments";
import { useCategoryBudgets } from "@/features/categories/hooks/useCategoryBudgets";
import { useAccounts } from "@/features/accounts/hooks/useAccounts";
import { useCreditCards } from "@/features/credit-cards/hooks/useCreditCards";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { Badge } from "@/shared/components/ui/badge";
import { useCurrency } from "@/shared/hooks/useCurrency";

export default function Analytics() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: transactions = [] } = useTransactions(month);
  const { data: earnings = [] } = useEarnings(month);
  const { data: allTx = [] } = useTransactions();
  const { data: allEarnings = [] } = useEarnings();

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(Number(month.split("-")[0]), Number(month.split("-")[1]) - 1, 1), 5 - i);
    return format(d, "yyyy-MM");
  });

  const m0 = useTransactions(months[0]);
  const m1 = useTransactions(months[1]);
  const m2 = useTransactions(months[2]);
  const m3 = useTransactions(months[3]);
  const m4 = useTransactions(months[4]);
  const m5 = useTransactions(months[5]);
  const monthsData = [m0, m1, m2, m3, m4, m5];

  const { data: investments = [] } = useInvestments();
  const { data: cryptoHoldings = [], livePrices } = useCrypto();
  const { investments: altInvs = [] } = useAltInvestments();
  const { data: budgets = [] } = useCategoryBudgets(month);
  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCreditCards();
  const { format: fmt, formatCompact } = useCurrency();

  const formatCurrency = fmt;

  const income = earnings.filter((e) => e.currency === "BRL").reduce((s, e) => s + e.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // Net worth
  const accountsBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const investmentTotal = investments.reduce((s, i) => s + i.currentValue, 0);
  const altInvestmentTotal = altInvs.reduce((s, i) => s + i.investedAmount, 0);
  const getPrice = (symbol: string) => livePrices.data?.[symbol.toLowerCase()]?.brl || 0;
  const cryptoTotal = cryptoHoldings.reduce((s, h) => s + h.quantity * (getPrice(h.symbol) || h.currentPrice), 0);
  const cardDebt = cards.reduce((s, c) => {
    const used = allTx.filter((t: any) => t.type === "expense" && t.creditCardId === c.id).reduce((sum: number, t: any) => sum + t.amount, 0);
    return s + used;
  }, 0);
  const unlinkedIncome = allEarnings.filter((e) => !e.accountId && e.currency === "BRL").reduce((s, e) => s + e.amount, 0);
  const unlinkedExpenses = allTx.filter((t: any) => t.type === "expense" && !t.accountId && !t.creditCardId).reduce((sum: number, t: any) => sum + t.amount, 0);
  const netWorth = accountsBalance + investmentTotal + altInvestmentTotal + cryptoTotal - cardDebt + unlinkedIncome - unlinkedExpenses;

  // Evolution data
  const evolutionData = months.map((m, i) => {
    const txs = monthsData[i].data || [];
    const mEarnings = allEarnings.filter((e) => e.date.startsWith(m) && e.currency === "BRL");
    const inc = mEarnings.reduce((s, e) => s + e.amount, 0);
    const exp = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const d = new Date(Number(m.split("-")[0]), Number(m.split("-")[1]) - 1, 1);
    return { month: format(d, "MMM", { locale: ptBR }), receitas: inc, despesas: exp, saldo: inc - exp };
  });

  // Category breakdown
  const categoryMap = new Map<string, { name: string; value: number; color: string }>();
  transactions.filter((t) => t.type === "expense").forEach((t) => {
    const name = t.category?.name || "Outros";
    const color = t.category?.color || "#6b7280";
    const existing = categoryMap.get(name);
    if (existing) existing.value += t.amount;
    else categoryMap.set(name, { name, value: t.amount, color });
  });
  const pieData = Array.from(categoryMap.values());

  // Budget alerts
  const budgetAlerts = budgets
    .map((b) => {
      const spent = transactions.filter((t) => t.type === "expense" && t.categoryId === b.categoryId).reduce((s, t) => s + t.amount, 0);
      const pct = b.budgetAmount > 0 ? (spent / b.budgetAmount) * 100 : 0;
      return { ...b, spent, pct };
    })
    .filter((b) => b.pct >= 80);

  // Export
  const handleExportJSON = () => {
    const data = {
      month,
      netWorth,
      accounts: accounts.map(a => ({ name: a.name, type: a.accountType, balance: a.balance })),
      investments: investments.map(i => ({ name: i.name, type: i.type, invested: i.investedAmount, current: i.currentValue })),
      transactions: transactions.map(t => ({ date: t.date, type: t.type, amount: t.amount, category: t.category?.name, description: t.description })),
      earnings: earnings.map(e => ({ date: e.date, source: e.sourceName, amount: e.amount })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financas_${month}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Painel Analítico</h1>
          <p className="text-sm text-muted-foreground">Indicadores financeiros e análise comparativa</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker value={month} onChange={setMonth} />
          <Button size="sm" variant="outline" onClick={handleExportJSON}>
            <Download className="mr-2 h-4 w-4" />Exportar
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {budgetAlerts.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="py-3 space-y-1">
            {budgetAlerts.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
                <span>
                  <strong>{a.category?.name}</strong>: {formatCurrency(a.spent)} de {formatCurrency(a.budgetAmount)} ({a.pct.toFixed(0)}%)
                  {a.pct >= 100 && <Badge variant="destructive" className="ml-2 text-[10px]">Excedido!</Badge>}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Patrimony & Summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card sm:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Patrimônio Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatCurrency(netWorth)}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Contas: {formatCurrency(accountsBalance)}</span>
              <span>Invest: {formatCurrency(investmentTotal + altInvestmentTotal)}</span>
              <span>Crypto: {formatCurrency(cryptoTotal)}</span>
              {cardDebt > 0 && <span className="text-expense">Dívida: -{formatCurrency(cardDebt)}</span>}
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-income">{formatCurrency(income)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-expense">{formatCurrency(expenses)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />Evolução Mensal (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => formatCompact(v)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Area type="monotone" dataKey="receitas" stroke="hsl(152, 69%, 40%)" fill="hsl(152, 69%, 40%)" fillOpacity={0.1} strokeWidth={2} name="Receitas" />
                <Area type="monotone" dataKey="despesas" stroke="hsl(0, 72%, 51%)" fill="hsl(0, 72%, 51%)" fillOpacity={0.1} strokeWidth={2} name="Despesas" />
                <Line type="monotone" dataKey="saldo" stroke="hsl(199, 89%, 48%)" strokeWidth={2} dot={{ r: 3 }} name="Saldo" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <PieIcon className="h-4 w-4 text-primary" />Gastos por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma despesa neste mês</p>
            ) : (
              <div className="flex flex-col items-center gap-4 sm:flex-row">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={50}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 text-xs min-w-[140px]">
                  {pieData.sort((a, b) => b.value - a.value).map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                      <span className="text-muted-foreground truncate">{entry.name}</span>
                      <span className="ml-auto font-medium">{formatCurrency(entry.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparative bar */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base font-semibold">Comparativo Mensal</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={evolutionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => formatCompact(v)} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="receitas" fill="hsl(152, 69%, 40%)" radius={[4, 4, 0, 0]} name="Receitas" />
              <Bar dataKey="despesas" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Despesas" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Patrimony breakdown */}
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base font-semibold">Composição do Patrimônio</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={[
                  { name: "Saldo em Contas", value: Math.max(accountsBalance, 0) },
                  { name: "Invest. Tradicionais", value: investmentTotal },
                  { name: "Invest. Alternativos", value: altInvestmentTotal },
                  { name: "Criptomoedas", value: cryptoTotal },
                ].filter((d) => d.value > 0)}
                dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={45}
              >
                <Cell fill="hsl(162, 63%, 41%)" />
                <Cell fill="hsl(199, 89%, 48%)" />
                <Cell fill="hsl(262, 80%, 50%)" />
                <Cell fill="hsl(38, 92%, 50%)" />
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center flex-wrap gap-4 text-xs text-muted-foreground mt-2">
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(162, 63%, 41%)" }} />Contas</div>
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(199, 89%, 48%)" }} />Tradicionais</div>
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(262, 80%, 50%)" }} />Alternativos</div>
            <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(38, 92%, 50%)" }} />Criptomoedas</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
