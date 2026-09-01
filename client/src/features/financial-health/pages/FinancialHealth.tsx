import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Heart, ShieldCheck, Flame, PiggyBank, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { MonthPicker } from "@/shared/components/MonthPicker";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { useEarnings } from "@/features/earnings/hooks/useEarnings";
import { useInvestments } from "@/features/investments/hooks/useInvestments";
import { useCrypto } from "@/features/crypto/hooks/useCrypto";
import { useAccounts } from "@/features/accounts/hooks/useAccounts";
import { useAltInvestments } from "@/features/alt-investments/hooks/useAltInvestments";
import { useCreditCards } from "@/features/credit-cards/hooks/useCreditCards";
import { useGoals } from "@/features/goals/hooks/useGoals";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { Progress } from "@/shared/components/ui/progress";
import { Badge } from "@/shared/components/ui/badge";

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "text-income" : score >= 50 ? "text-warning" : "text-expense";
  const bg = score >= 80 ? "bg-income/10" : score >= 50 ? "bg-warning/10" : "bg-expense/10";
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl p-6 ${bg}`}>
      <p className={`text-5xl font-black ${color}`}>{score}</p>
      <p className="text-xs text-muted-foreground mt-2 font-medium">{label}</p>
    </div>
  );
}

function RuleBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = Math.min((value / Math.max(target, 1)) * 100, 150);
  const isOver = value > target;
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className={isOver ? "text-expense font-semibold" : "text-muted-foreground"}>
          {value.toFixed(0)}% {isOver ? `(ideal: ${target}%)` : `/ ${target}%`}
        </span>
      </div>
      <div className="h-3 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export default function FinancialHealth() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: transactions = [] } = useTransactions(month);
  const { data: earningsData = [] } = useEarnings(month);
  const { data: allTx = [] } = useTransactions();
  const { data: allEarnings = [] } = useEarnings();
  const { data: investments = [] } = useInvestments();
  const { data: cryptoHoldings = [], livePrices } = useCrypto();
  const { data: accounts = [] } = useAccounts();
  const { investments: altInvs = [] } = useAltInvestments();
  const { data: cards = [] } = useCreditCards();
  const { data: goals = [] } = useGoals();
  const { format: fmt } = useCurrency();

  const formatCurrency = fmt;

  const income = earningsData.filter((e) => e.currency === "BRL").reduce((s, e) => s + e.amount, 0);
  const expenses = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // Category breakdown for 50/30/20
  const essentialCategories = [
    "Moradia", "Alimentação", "Transporte", "Saúde", "Educação",
    "Energia", "Água", "Luz", "Gás", "Internet", "Telefone", "Celular",
    "Mercado", "Supermercado", "Farmácia", "Aluguel", "Condomínio",
    "Seguro", "Impostos", "IPTU", "IPVA",
  ];
  const savingsCategories = ["Investimento", "Poupança"];

  const categoryExpenses = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter((t) => t.type === "expense").forEach((t) => {
      const name = t.category?.name || "Outros";
      map[name] = (map[name] || 0) + t.amount;
    });
    return map;
  }, [transactions]);

  const essentialTotal = Object.entries(categoryExpenses)
    .filter(([name]) => essentialCategories.some(c => name.toLowerCase().includes(c.toLowerCase())))
    .reduce((s, [, v]) => s + v, 0);

  const savingsTotal = Object.entries(categoryExpenses)
    .filter(([name]) => savingsCategories.some(c => name.toLowerCase().includes(c.toLowerCase())))
    .reduce((s, [, v]) => s + v, 0);

  const wantsTotal = Object.entries(categoryExpenses)
    .filter(([name]) => {
      const isEssential = essentialCategories.some(c => name.toLowerCase().includes(c.toLowerCase()));
      const isSavings = savingsCategories.some(c => name.toLowerCase().includes(c.toLowerCase()));
      return !isEssential && !isSavings;
    })
    .reduce((s, [, v]) => s + v, 0);

  const savingsFromTx = income - expenses + savingsTotal;
  const netExpenses = expenses - savingsTotal;

  const essentialPct = income > 0 ? (essentialTotal / income) * 100 : 0;
  const wantsPct = income > 0 ? (wantsTotal / income) * 100 : 0;
  const savingsPct = income > 0 ? (Math.max(savingsFromTx, 0) / income) * 100 : 0;

  // Burn rate
  const burnRate = income > 0 ? (expenses / income) * 100 : 0;
  const monthsRunway = savingsFromTx > 0 && netExpenses > 0 ? (savingsFromTx / Math.max(netExpenses, 1)) : 0;

  // Patrimony
  const accountsBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const investmentTotal = investments.reduce((s, i) => s + i.current_value, 0);
  const altTotal = altInvs.reduce((s, i) => s + i.investedAmount, 0);
  const getPrice = (symbol: string) => livePrices.data?.[symbol.toLowerCase()]?.brl || 0;
  const cryptoTotal = cryptoHoldings.reduce((s, h) => s + h.quantity * (getPrice(h.symbol) || h.current_price), 0);
  const cardDebt = cards.reduce((s, c) => {
    const used = allTx.filter((t: any) => t.type === "expense" && t.creditCardId === c.id).reduce((sum: number, t: any) => sum + t.amount, 0);
    return s + used;
  }, 0);
  const unlinkedIncome = allEarnings.filter((e) => !e.accountId && e.currency === "BRL").reduce((s, e) => s + e.amount, 0);
  const unlinkedExpenses = allTx.filter((t: any) => t.type === "expense" && !t.accountId && !t.creditCardId).reduce((s: number, t: any) => s + t.amount, 0);
  const totalPatrimony = accountsBalance + investmentTotal + altTotal + cryptoTotal - cardDebt + unlinkedIncome - unlinkedExpenses;

  // Financial independence (25x annual expenses)
  const annualExpenses = netExpenses * 12;
  const fiTarget = annualExpenses * 25;
  const fiProgress = fiTarget > 0 ? (totalPatrimony / fiTarget) * 100 : 0;

  // Financial Score (0-100)
  const score = useMemo(() => {
    let s = 50;
    // Savings rate bonus
    if (savingsPct >= 20) s += 15;
    else if (savingsPct >= 10) s += 8;
    else if (savingsPct < 0) s -= 15;
    // Burn rate
    if (burnRate <= 80) s += 10;
    else if (burnRate > 100) s -= 15;
    // Essential spending
    if (essentialPct <= 50) s += 10;
    else if (essentialPct > 70) s -= 10;
    // Has investments/assets
    if (investmentTotal > 0) s += 10;
    if (cryptoTotal > 0) s += 5;
    if (accountsBalance > 0) s += 5;
    // FI progress
    if (fiProgress >= 10) s += 5;
    if (fiProgress >= 50) s += 5;
    return Math.max(0, Math.min(100, Math.round(s)));
  }, [savingsPct, burnRate, essentialPct, investmentTotal, cryptoTotal, fiProgress]);

  const scoreLabel = score >= 80 ? "Excelente" : score >= 60 ? "Bom" : score >= 40 ? "Regular" : "Atenção";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="h-6 w-6 text-primary" />
            Saúde Financeira
          </h1>
          <p className="text-sm text-muted-foreground">Indicadores e diagnóstico das suas finanças</p>
        </div>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {/* Score + Key metrics */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <ScoreGauge score={score} label={`Score: ${scoreLabel}`} />
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <PiggyBank className="h-4 w-4" /> Taxa de Poupança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${savingsPct >= 20 ? "text-income" : savingsPct >= 0 ? "text-warning" : "text-expense"}`}>
              {savingsPct.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Ideal: ≥ 20%</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4" /> Burn Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${burnRate <= 80 ? "text-income" : burnRate <= 100 ? "text-warning" : "text-expense"}`}>
              {burnRate.toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses > 0 ? `${formatCurrency(expenses)} de ${formatCurrency(income)}` : "Sem dados"}
            </p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Scale className="h-4 w-4" /> Custo de Vida
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(expenses)}</p>
            <p className="text-xs text-muted-foreground mt-1">Média diária: {formatCurrency(expenses / 30)}</p>
          </CardContent>
        </Card>
      </div>

      {/* 50/30/20 Rule */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Regra 50/30/20
            {income === 0 && <Badge variant="secondary" className="text-[10px]">Sem receitas</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <RuleBar label="🏠 Necessidades" value={essentialPct} target={50} color="hsl(199, 89%, 48%)" />
          <RuleBar label="🎯 Desejos" value={wantsPct} target={30} color="hsl(262, 83%, 58%)" />
          <RuleBar label="💰 Sobra / Poupança" value={savingsPct} target={20} color="hsl(152, 69%, 40%)" />
          <p className="text-xs text-muted-foreground pt-2">
            Distribuição baseada nas suas categorias de despesa do mês. A referência 50/30/20 é uma meta — ajuste conforme sua realidade.
          </p>
        </CardContent>
      </Card>

      {/* Financial Independence */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base font-semibold">🏝️ Independência Financeira</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {investmentTotal === 0 && cryptoTotal === 0 && altTotal === 0 && goals.length === 0 ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-muted-foreground">Você ainda não definiu investimentos nem metas financeiras.</p>
              <p className="text-xs text-muted-foreground">
                Vá em <strong>Metas Financeiras</strong> para definir um objetivo ou <strong>Investimentos</strong> para registrar sua carteira.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Seu patrimônio atual em contas: <span className="font-semibold text-primary">{formatCurrency(totalPatrimony)}</span>
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Patrimônio atual</p>
                  <p className="text-2xl font-bold text-primary">{formatCurrency(totalPatrimony)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Meta (25x despesas anuais)</p>
                  <p className="text-lg font-semibold">{formatCurrency(fiTarget)}</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{fiProgress.toFixed(1)}% alcançado</span>
                  <span>{fiTarget > 0 ? formatCurrency(fiTarget - totalPatrimony) : "R$ 0"} restante</span>
                </div>
                <Progress value={Math.min(fiProgress, 100)} className="h-4" />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
