import { useMemo } from "react";
import { Building2, TrendingUp, TrendingDown, Landmark, Bitcoin, CreditCard, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { useAccounts } from "@/features/accounts/hooks/useAccounts";
import { useInvestments } from "@/features/investments/hooks/useInvestments";
import { useCrypto } from "@/features/crypto/hooks/useCrypto";
import { useAltInvestments } from "@/features/alt-investments/hooks/useAltInvestments";
import { useCreditCards } from "@/features/credit-cards/hooks/useCreditCards";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { useEarnings } from "@/features/earnings/hooks/useEarnings";
import { useBills } from "@/features/bills/hooks/useBills";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function NetWorth() {
  const { data: accounts = [] } = useAccounts();
  const { data: investments = [] } = useInvestments();
  const { data: cryptoHoldings = [], livePrices } = useCrypto();
  const { investments: altInvs = [] } = useAltInvestments();
  const { data: cards = [] } = useCreditCards();
  const { data: allTx = [] } = useTransactions();
  const { allData: allEarnings = [] } = useEarnings();
  const { data: bills = [] } = useBills();

  const { format: fmt, formatCompact } = useCurrency();

  const getPrice = (sym: string) => livePrices.data?.[sym.toLowerCase()]?.brl || 0;

  // Assets
  const accountsTotal = accounts.reduce((s, a) => s + a.balance, 0);
  const investmentTotal = investments.reduce((s, i) => s + i.current_value, 0);
  const altTotal = altInvs.reduce((s, i) => s + i.investedAmount, 0);
  const cryptoTotal = cryptoHoldings.reduce((s, h) => s + h.quantity * (getPrice(h.symbol) || h.current_price), 0);
  const totalAssets = accountsTotal + investmentTotal + altTotal + cryptoTotal;

  // Liabilities
  const cardDebt = cards.reduce((s, c) => {
    const used = allTx.filter((t: any) => t.type === "expense" && t.creditCardId === c.id).reduce((sum: number, t: any) => sum + t.amount, 0);
    return s + used;
  }, 0);
  const pendingBills = bills.filter((b) => !b.isPaid && b.status !== "canceled").reduce((s, b) => s + b.amount, 0);
  const totalLiabilities = cardDebt + pendingBills;

  const unlinkedIncome = allEarnings.filter((e: any) => !e.accountId && e.currency === "BRL").reduce((s: number, e: any) => s + e.amount, 0);
  const unlinkedExpenses = allTx.filter((t: any) => t.type === "expense" && !t.accountId && !t.creditCardId).reduce((s: number, t: any) => s + t.amount, 0);

  const netWorth = totalAssets - totalLiabilities + unlinkedIncome - unlinkedExpenses;

  // All-time cash flow (total historical impact, regardless of linkage)
  const lifetimeExpenses = allTx.filter((t: any) => t.type === "expense").reduce((s: number, t: any) => s + t.amount, 0);
  const lifetimeIncome = allEarnings.filter((e: any) => e.currency === "BRL").reduce((s: number, e: any) => s + e.amount, 0);
  const lifetimeNet = lifetimeIncome - lifetimeExpenses;

  // Historical estimation (simple: net worth - cumulative monthly delta)
  const historyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, 11 - i);
      const m = format(d, "yyyy-MM");
      const monthExpenses = allTx.filter((t) => t.type === "expense" && t.date.startsWith(m)).reduce((s, t) => s + t.amount, 0);
      const monthIncome = allEarnings.filter((e: any) => e.currency === "BRL" && e.date.startsWith(m)).reduce((s: number, e: any) => s + e.amount, 0);
      return {
        month: format(d, "MMM yy", { locale: ptBR }),
        delta: monthIncome - monthExpenses,
      };
    });
  }, [allTx, allEarnings]);

  // Build cumulative net worth estimate (current NW working backwards)
  const chartData = useMemo(() => {
    const result = [...historyData];
    const cumulative: { month: string; netWorth: number }[] = [];
    let running = netWorth;
    // Walk backwards from most recent
    for (let i = result.length - 1; i >= 0; i--) {
      cumulative.unshift({ month: result[i].month, netWorth: running });
      running -= result[i].delta;
    }
    return cumulative;
  }, [historyData, netWorth]);

  const assetBreakdown = [
    { label: "Contas Bancárias", value: accountsTotal, icon: Landmark, color: "hsl(162, 63%, 41%)" },
    { label: "Investimentos Tradicionais", value: investmentTotal, icon: TrendingUp, color: "hsl(199, 89%, 48%)" },
    { label: "Investimentos Alternativos", value: altTotal, icon: Building2, color: "hsl(262, 80%, 50%)" },
    { label: "Criptomoedas", value: cryptoTotal, icon: Bitcoin, color: "hsl(38, 92%, 50%)" },
  ];

  const liabilityBreakdown = [
    { label: "Dívida de Cartões", value: cardDebt, icon: CreditCard, color: "hsl(0, 72%, 51%)" },
    { label: "Contas a Pagar Pendentes", value: pendingBills, icon: DollarSign, color: "hsl(24, 90%, 55%)" },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-primary" />
            Patrimônio Líquido
          </h1>
          <p className="text-sm text-muted-foreground">Patrimônio líquido consolidado em tempo real</p>
        </div>
      </div>

      {/* Main Net Worth */}
      <Card className="glass-card border-primary/20">
        <CardContent className="pt-6 pb-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Patrimônio Líquido</p>
            <p className={`text-4xl font-black ${netWorth >= 0 ? "text-primary" : "text-expense"}`}>
              {fmt(netWorth)}
            </p>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-income" />
                <span className="text-muted-foreground">Ativos:</span>
                <span className="font-semibold text-income">{fmt(totalAssets)}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-expense" />
                <span className="text-muted-foreground">Passivos:</span>
                <span className="font-semibold text-expense">{fmt(totalLiabilities)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lifetime cash flow */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Fluxo de Caixa Histórico (desde o início)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border bg-background/50 px-4 py-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Recebido</p>
              <p className="text-lg font-bold text-income">{fmt(lifetimeIncome)}</p>
            </div>
            <div className="rounded-lg border bg-background/50 px-4 py-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Gasto</p>
              <p className="text-lg font-bold text-expense">-{fmt(lifetimeExpenses)}</p>
            </div>
            <div className="rounded-lg border bg-background/50 px-4 py-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Saldo Líquido</p>
              <p className={`text-lg font-bold ${lifetimeNet >= 0 ? "text-primary" : "text-expense"}`}>{fmt(lifetimeNet)}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Despesas vinculadas a uma conta já foram descontadas do saldo dessa conta em tempo real; este resumo mostra o impacto total acumulado de todas as receitas e despesas já registradas.
          </p>
        </CardContent>
      </Card>

      {/* Net Worth Evolution Chart */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Evolução do Patrimônio (12 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="nwGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(199, 89%, 48%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} tickFormatter={(v) => formatCompact(v)} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="hsl(199, 89%, 48%)"
                fill="url(#nwGradient)"
                strokeWidth={2}
                name="Patrimônio Líquido"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Assets Breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-income" />
              Ativos
              <Badge variant="secondary" className="ml-auto">{fmt(totalAssets)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assetBreakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border bg-background/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span className="text-sm font-semibold">{fmt(item.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-expense" />
              Passivos
              <Badge variant="destructive" className="ml-auto">{fmt(totalLiabilities)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {liabilityBreakdown.map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg border bg-background/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-expense/10 text-expense">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                <span className="text-sm font-semibold text-expense">{fmt(item.value)}</span>
              </div>
            ))}
            {totalLiabilities === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">Nenhum passivo registrado 🎉</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
