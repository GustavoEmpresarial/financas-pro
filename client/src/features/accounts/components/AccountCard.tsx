import { useMemo, useState } from "react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Pencil, Trash2, ChevronDown, ChevronUp, BarChart3, List,
  ArrowUpRight, ArrowDownRight, type LucideIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";
import type { Transaction } from "@/features/transactions/hooks/useTransactions";
import type { Earning } from "@/features/earnings/hooks/useEarnings";
import type { FinancialAccount } from "@/features/accounts/pages/Accounts";

// Meses do mini-grafico mensal do card: os ultimos 6, sempre. Nao e um
// numero "escolhido" a esmo -- e o que cabe legivel num BarChart de ~100px
// de altura dentro do card sem virar sopa de barras.
const MONTHLY_CHART_MONTHS = 6;
const RECENT_ITEMS_LIMIT = 10;
const CHART_COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#8b5cf6", "#10b981", "#ec4899", "#06b6d4", "#f97316"];

interface AccountCardProps {
  account: FinancialAccount;
  Icon: LucideIcon;
  typeColor: string;
  typeLabel: string;
  transactions: Transaction[];
  earnings: Earning[];
  formatCurrency: (v: number) => string;
  onEdit: (account: FinancialAccount) => void;
  onDelete: (id: string) => void;
}

// Um card por conta, com o proprio useMemo/useState -- extraido de dentro do
// `accounts.map()` do pai, onde esses hooks eram chamados por iteracao do
// loop. Isso violava a regra dos hooks: o numero de useMemo executados
// variava com a quantidade de contas, e o React derrubava a tela inteira
// (erro #310) toda vez que uma conta era criada, apagada, ou a lista
// carregava de forma assincrona. Hook so pode viver no topo de um
// componente que monta uma vez por item -- por isso este arquivo existe.
export function AccountCard({
  account, Icon, typeColor, typeLabel, transactions, earnings,
  formatCurrency, onEdit, onDelete,
}: AccountCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<"extrato" | "analise">("extrato");

  const txForAccount = useMemo(
    () => transactions.filter(t => t.accountId === account.id),
    [transactions, account.id],
  );
  const earningsForAccount = useMemo(
    () => earnings.filter(e => e.accountId === account.id),
    [earnings, account.id],
  );

  const recentItems = useMemo(() => {
    return [
      ...txForAccount.map(t => ({
        id: t.id,
        type: t.type === "expense" ? "expense" as const : "income" as const,
        label: t.category?.name || t.description || "Transação",
        amount: t.amount,
        date: t.date,
      })),
      ...earningsForAccount.map(e => ({
        id: e.id,
        type: "income" as const,
        label: e.sourceName,
        amount: e.amount,
        date: e.date,
      })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, RECENT_ITEMS_LIMIT);
  }, [txForAccount, earningsForAccount]);

  const totalIn = recentItems.filter(i => i.type === "income").reduce((s, i) => s + i.amount, 0);
  const totalOut = recentItems.filter(i => i.type === "expense").reduce((s, i) => s + i.amount, 0);

  const allAccountItems = useMemo(() => [
    ...txForAccount.map(t => ({
      type: t.type === "expense" ? "expense" as const : "income" as const,
      amount: t.amount,
      date: t.date,
      label: t.category?.name || t.description || "Transação",
    })),
    ...earningsForAccount.map(e => ({
      type: "income" as const,
      amount: e.amount,
      date: e.date,
      label: e.sourceName,
    })),
  ], [txForAccount, earningsForAccount]);

  const monthlyData = useMemo(() => {
    const months = Array.from({ length: MONTHLY_CHART_MONTHS }, (_, i) => {
      const d = subMonths(new Date(), MONTHLY_CHART_MONTHS - 1 - i);
      return format(d, "yyyy-MM");
    });
    return months.map(m => {
      const monthIn = allAccountItems.filter(i => i.date.startsWith(m) && i.type === "income").reduce((s, i) => s + i.amount, 0);
      const monthOut = allAccountItems.filter(i => i.date.startsWith(m) && i.type === "expense").reduce((s, i) => s + i.amount, 0);
      const d = new Date(Number(m.split("-")[0]), Number(m.split("-")[1]) - 1, 1);
      return {
        month: format(d, "MMM", { locale: ptBR }),
        entradas: monthIn,
        saídas: monthOut,
      };
    });
  }, [allAccountItems]);

  const catData = useMemo(() => {
    const map = new Map<string, number>();
    allAccountItems.filter(i => i.type === "expense").forEach(i => {
      map.set(i.label, (map.get(i.label) || 0) + i.amount);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [allAccountItems]);

  return (
    <Card className="glass-card overflow-hidden hover:border-primary/30 transition-colors">
      <div className="h-1.5" style={{ backgroundColor: account.color || typeColor }} />
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          {account.icon ? (
            <img src={account.icon} alt={account.name} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${typeColor}18` }}>
              <Icon className="h-4 w-4" style={{ color: typeColor }} />
            </div>
          )}
          <div>
            <CardTitle className="text-sm">{account.name}</CardTitle>
            <p className="text-xs text-muted-foreground">{typeLabel}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => onEdit(account)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense" onClick={() => onDelete(account.id)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className={`text-xl font-bold ${account.balance >= 0 ? "text-income" : "text-expense"}`}>
          {formatCurrency(account.balance)}
        </p>

        {recentItems.length > 0 && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>{recentItems.length} movimentações</span>
              <div className="flex gap-2">
                <span className="text-income">+{formatCurrency(totalIn)}</span>
                <span className="text-expense">-{formatCurrency(totalOut)}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-7"
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
              {expanded ? "Recolher" : "Extrato"}
            </Button>
            {expanded && (
              <div className="mt-2">
                <div className="flex border-b mb-2">
                  <button
                    className={`flex-1 text-xs py-1.5 font-medium flex items-center justify-center gap-1 ${tab === "extrato" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                    onClick={() => setTab("extrato")}
                  >
                    <List className="h-3 w-3" /> Extrato
                  </button>
                  <button
                    className={`flex-1 text-xs py-1.5 font-medium flex items-center justify-center gap-1 ${tab === "analise" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
                    onClick={() => setTab("analise")}
                  >
                    <BarChart3 className="h-3 w-3" /> Análise
                  </button>
                </div>

                {tab === "extrato" && (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {recentItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/30">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {item.type === "income" ? (
                            <ArrowUpRight className="h-3 w-3 text-income flex-shrink-0" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3 text-expense flex-shrink-0" />
                          )}
                          <span className="truncate">{item.label}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-muted-foreground">{format(new Date(item.date + "T12:00:00"), "dd/MM")}</span>
                          <span className={`font-medium ${item.type === "income" ? "text-income" : "text-expense"}`}>
                            {item.type === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {tab === "analise" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded bg-muted/30 py-1.5">
                        <p className="text-[10px] text-muted-foreground">Saldo</p>
                        <p className="text-xs font-bold text-primary">{formatCurrency(account.balance)}</p>
                      </div>
                      <div className="rounded bg-income/10 py-1.5">
                        <p className="text-[10px] text-muted-foreground">Entradas</p>
                        <p className="text-xs font-bold text-income">+{formatCurrency(totalIn)}</p>
                      </div>
                      <div className="rounded bg-expense/10 py-1.5">
                        <p className="text-[10px] text-muted-foreground">Saídas</p>
                        <p className="text-xs font-bold text-expense">-{formatCurrency(totalOut)}</p>
                      </div>
                    </div>

                    {monthlyData.some(d => d.entradas > 0 || d.saídas > 0) && (
                      <>
                        <p className="text-[10px] text-muted-foreground font-medium">Mensal ({MONTHLY_CHART_MONTHS} meses)</p>
                        <ResponsiveContainer width="100%" height={100}>
                          <BarChart data={monthlyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="month" fontSize={9} tickLine={false} />
                            <YAxis fontSize={9} tickLine={false} width={30} tickFormatter={v => v > 0 ? `${Math.round(v / 1000)}k` : ""} />
                            <Tooltip formatter={(v: number) => formatCurrency(v)} />
                            <Bar dataKey="entradas" fill="hsl(152, 69%, 40%)" radius={[2, 2, 0, 0]} maxBarSize={12} />
                            <Bar dataKey="saídas" fill="hsl(0, 72%, 51%)" radius={[2, 2, 0, 0]} maxBarSize={12} />
                          </BarChart>
                        </ResponsiveContainer>
                      </>
                    )}

                    {catData.length > 0 && (
                      <div className="flex items-center gap-2">
                        <ResponsiveContainer width="60%" height={80}>
                          <PieChart>
                            <Pie data={catData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={35} innerRadius={20}>
                              {catData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex-1 space-y-0.5">
                          {catData.slice(0, 5).map((c, i) => (
                            <div key={c.name} className="flex items-center gap-1 text-[10px]">
                              <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                              <span className="truncate text-muted-foreground">{c.name}</span>
                              <span className="ml-auto font-medium">{formatCurrency(c.value)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
