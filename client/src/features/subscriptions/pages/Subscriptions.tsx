import { useState, useMemo } from "react";
import { format, addMonths, startOfMonth, isAfter, isBefore, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2, RefreshCw, Pencil, DollarSign, Upload, TrendingUp, CalendarClock, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { CurrencyInput } from "@/shared/components/CurrencyInput";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { useSubscriptions, RecurringSubscription } from "@/features/subscriptions/hooks/useSubscriptions";
import { API, resolveAssetUrl } from "@/shared/services/api";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const FREQUENCIES = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "yearly", label: "Anual" },
];

const BUCKET = "subscription-logos";

async function uploadLogo(file: File): Promise<string | null> {
  try {
    const { url } = await API.upload(file, BUCKET);
    return url;
  } catch (e: any) {
    toast.error(`Erro ao fazer upload: ${e.message}`);
    return null;
  }
}

function handleFilePreview(file: File, setter: (url: string) => void) {
  const reader = new FileReader();
  reader.onload = (e) => setter(e.target?.result as string);
  reader.readAsDataURL(file);
}

function LogoPreview({ src, onFileChange }: { src: string | null; onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <label className="flex flex-col items-center gap-2 cursor-pointer">
      {src ? (
        <img src={src} alt="Preview" className="h-16 w-16 rounded-xl object-cover border" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-muted border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors">
          <Upload className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <span className="text-xs text-muted-foreground">{src ? "Alterar logo" : "Logo (opcional)"}</span>
      <input type="file" name="logo" accept="image/*" className="hidden" onChange={onFileChange} />
    </label>
  );
}

export default function Subscriptions() {
  const { data: subs = [], addSubscription, updateSubscription, deleteSubscription } = useSubscriptions();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<RecurringSubscription | null>(null);
  const [uploading, setUploading] = useState(false);
  const [createPreview, setCreatePreview] = useState<string | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const activeSubs = subs.filter(s => s.isActive);
  const monthlyTotal = activeSubs.reduce((sum, s) => {
    if (s.frequency === "weekly") return sum + s.amount * 4;
    if (s.frequency === "quarterly") return sum + s.amount / 3;
    if (s.frequency === "yearly") return sum + s.amount / 12;
    return sum + s.amount;
  }, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    let logoUrl: string | null = null;
    const logoFile = (form.get("logo") as File) || null;

    if (logoFile && logoFile.size > 0) {
      setUploading(true);
      logoUrl = await uploadLogo(logoFile);
      setUploading(false);
    }

    await addSubscription.mutateAsync({
      name: form.get("name") as string,
      amount: parseFloat(form.get("amount") as string),
      frequency: form.get("frequency") as string || "monthly",
      next_billing_date: (form.get("next_billing_date") as string) || null,
      notes: (form.get("notes") as string) || null,
      is_active: true,
      category_id: null,
      account_id: null,
      color: null,
      icon: null,
      logo_url: logoUrl,
    } as any);
    setOpen(false);
    setCreatePreview(null);
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingSub) return;
    const form = new FormData(e.currentTarget);
    let logoUrl = editingSub.logoUrl;

    const logoFile = (form.get("logo") as File) || null;
    if (logoFile && logoFile.size > 0) {
      setUploading(true);
      const uploaded = await uploadLogo(logoFile);
      setUploading(false);
      if (uploaded) logoUrl = uploaded;
    }

    await updateSubscription.mutateAsync({
      id: editingSub.id,
      name: form.get("name") as string,
      amount: parseFloat(form.get("amount") as string),
      frequency: form.get("frequency") as string,
      next_billing_date: (form.get("next_billing_date") as string) || null,
      notes: (form.get("notes") as string) || null,
      logo_url: logoUrl,
    } as any);
    setEditOpen(false);
    setEditingSub(null);
    setEditPreview(null);
  };

  const getFreqLabel = (f: string) => FREQUENCIES.find(fr => fr.value === f)?.label || f;

  const projections = useMemo(() => {
    const today = new Date();
    const months: { name: string; value: number; fill: string }[] = [];
    let yearlyTotal = 0;

    for (let i = 0; i < 12; i++) {
      const monthDate = addMonths(startOfMonth(today), i);
      const monthName = format(monthDate, "MMM/yy", { locale: ptBR });
      const monthStart = startOfMonth(monthDate);
      const monthEnd = addMonths(monthStart, 1);

      let monthCost = 0;
      activeSubs.forEach(sub => {
        const monthlyEquivalent = sub.frequency === "weekly" ? sub.amount * 4
          : sub.frequency === "quarterly" ? sub.amount / 3
          : sub.frequency === "yearly" ? sub.amount / 12
          : sub.amount;

        if (sub.nextBillingDate) {
          const billingDate = parseISO(sub.nextBillingDate);
          if (sub.frequency === "monthly") {
            if (isBefore(billingDate, monthEnd) && (isAfter(billingDate, monthStart) || format(billingDate, "yyyy-MM") === format(monthStart, "yyyy-MM"))) {
              monthCost += sub.amount;
            }
          } else {
            monthCost += monthlyEquivalent;
          }
        } else {
          monthCost += monthlyEquivalent;
        }
      });

      yearlyTotal += monthCost;
      months.push({
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        value: Math.round(monthCost * 100) / 100,
        fill: monthCost > 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)",
      });
    }

    const nextCharges = activeSubs
      .filter(s => s.nextBillingDate)
      .map(s => {
        const billingDate = parseISO(s.nextBillingDate);
        const daysUntil = Math.ceil((billingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          name: s.name,
          amount: s.amount,
          date: s.nextBillingDate,
          daysUntil,
          frequency: s.frequency,
        };
      })
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);

    return { months, yearlyTotal, nextCharges };
  }, [activeSubs]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assinaturas</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus gastos recorrentes</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setCreatePreview(null); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Nova Assinatura</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Assinatura</DialogTitle>
              <DialogDescription>Adicione um gasto recorrente.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center justify-center">
                <LogoPreview src={createPreview} onFileChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFilePreview(f, setCreatePreview);
                }} />
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input name="name" required placeholder="Ex: Netflix, Spotify" />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <CurrencyInput name="amount" required />
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select name="frequency" defaultValue="monthly">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Próxima cobrança</Label>
                <Input name="next_billing_date" type="date" />
              </div>
              <div className="space-y-2">
                <Label>Notas (opcional)</Label>
                <Input name="notes" placeholder="Plano família, etc." />
              </div>
              <Button type="submit" className="w-full" disabled={addSubscription.isPending || uploading}>
                {uploading ? "Enviando logo..." : "Adicionar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditingSub(null); setEditPreview(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Assinatura</DialogTitle>
            <DialogDescription>Altere os dados da assinatura.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="flex items-center justify-center">
              <LogoPreview src={editPreview || resolveAssetUrl(editingSub?.logoUrl)} onFileChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFilePreview(f, setEditPreview);
              }} />
            </div>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input name="name" required defaultValue={editingSub?.name || ""} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <CurrencyInput name="amount" required defaultValue={editingSub?.amount} />
              </div>
              <div className="space-y-2">
                <Label>Frequência</Label>
                <Select name="frequency" defaultValue={editingSub?.frequency || "monthly"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Próxima cobrança</Label>
              <Input name="next_billing_date" type="date" defaultValue={editingSub?.nextBillingDate || ""} />
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Input name="notes" placeholder="Plano família, etc." defaultValue={editingSub?.notes || ""} />
            </div>
            <Button type="submit" className="w-full" disabled={updateSubscription.isPending || uploading}>
              {uploading ? "Enviando logo..." : "Salvar alterações"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="glass-card">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Custo mensal estimado</p>
              <p className="text-lg font-bold text-expense">{formatCurrency(monthlyTotal)}</p>
            </div>
          </div>
          <Badge variant="secondary">{activeSubs.length} ativas</Badge>
        </CardContent>
      </Card>

      {activeSubs.length > 0 && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="glass-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-income/10 text-income">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Projeção 12 meses</p>
                  <p className="text-lg font-bold text-income">{formatCurrency(projections.yearlyTotal)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Média mensal</p>
                  <p className="text-lg font-bold">{formatCurrency(projections.yearlyTotal / 12)}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Próximas cobranças</p>
                  <p className="text-lg font-bold">{projections.nextCharges.length} nos próximos dias</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Projeção Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={projections.months} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    formatter={(value: number) => [formatCurrency(value), "Projetado"]}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {projections.months.map((entry, i) => (
                      <Cell key={i} fill={entry.value > 0 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.2)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {projections.nextCharges.length > 0 && (
            <Card className="glass-card">
              <CardContent className="p-0">
                <div className="divide-y">
                  {projections.nextCharges.map((charge, i) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold ${
                          charge.daysUntil <= 3 ? "bg-expense/10 text-expense"
                          : charge.daysUntil <= 7 ? "bg-warning/10 text-warning"
                          : "bg-muted text-muted-foreground"
                        }`}>
                          {charge.daysUntil <= 0 ? "Hoje" : charge.daysUntil === 1 ? "1d" : `${charge.daysUntil}d`}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{charge.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(charge.date + "T12:00:00"), "dd 'de' MMM", { locale: ptBR })} · {getFreqLabel(charge.frequency)}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold text-expense">{formatCurrency(charge.amount)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Card className="glass-card">
        <CardContent className="p-0">
          {subs.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma assinatura cadastrada</p>
          ) : (
            <div className="divide-y">
              {subs.map(sub => (
                <div key={sub.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    {sub.logoUrl ? (
                      <img src={resolveAssetUrl(sub.logoUrl)} alt={sub.name} className="h-9 w-9 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{sub.name}</p>
                        {!sub.isActive && <Badge variant="secondary" className="text-[10px]">Inativa</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(sub.amount)} / {getFreqLabel(sub.frequency)}
                        {sub.nextBillingDate && ` · Próx: ${format(new Date(sub.nextBillingDate + "T12:00:00"), "dd/MM/yyyy")}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => { setEditingSub(sub); setEditPreview(null); setEditOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteSubscription.mutate(sub.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
