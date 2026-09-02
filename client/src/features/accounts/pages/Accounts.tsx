import { useState } from "react";
import { format } from "date-fns";
import { Plus, Trash2, ArrowRightLeft, Building2, Wallet, Smartphone, TrendingUp, Bitcoin, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { CurrencyInput } from "@/shared/components/CurrencyInput";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { useAccounts } from "@/features/accounts/hooks/useAccounts";
import { AccountCard } from "@/features/accounts/components/AccountCard";
import { useTransfers } from "@/features/transfers/hooks/useTransfers";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { useEarnings } from "@/features/earnings/hooks/useEarnings";
import { API } from "@/shared/services/api";
import { toast } from "sonner";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Conta Corrente", icon: Building2, color: "#3b82f6" },
  { value: "savings", label: "Poupança", icon: Building2, color: "#10b981" },
  { value: "cash", label: "Carteira (Dinheiro)", icon: Wallet, color: "#f59e0b" },
  { value: "digital", label: "Conta Digital", icon: Smartphone, color: "#8b5cf6" },
  { value: "investment", label: "Conta de Investimento", icon: TrendingUp, color: "#06b6d4" },
  { value: "crypto", label: "Conta Cripto", icon: Bitcoin, color: "#ec4899" },
];

export interface FinancialAccount {
  id: string; name: string; type: string; balance: number; color: string | null;
  isActive: boolean; icon: string | null; bank: string | null;
}

export default function Accounts() {
  const { data: accounts = [], addAccount, updateAccount, deleteAccount } = useAccounts();
  const { data: transfers = [], addTransfer, deleteTransfer } = useTransfers();
  const { data: allTransactions = [] } = useTransactions();
  const { allData: allEarnings = [] } = useEarnings();
  const [addOpen, setAddOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<FinancialAccount | null>(null);
  const [addPreview, setAddPreview] = useState<string | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const totalBalance = accounts.filter(a => a.isActive).reduce((s, a) => s + a.balance, 0);
  const getTypeLabel = (type: string) => ACCOUNT_TYPES.find(t => t.value === type)?.label || type;
  const getTypeIcon = (type: string) => ACCOUNT_TYPES.find(t => t.value === type)?.icon || Building2;
  const getTypeColor = (type: string) => ACCOUNT_TYPES.find(t => t.value === type)?.color || "#3b82f6";

  async function uploadLogo(file: File): Promise<string | null> {
    // Mesmo allowlist do servidor (server/modules/upload/service). Validar
    // aqui evita um upload de 5 MB que so volta 400 — comum no celular, onde
    // "image/*" deixa escolher HEIC/AVIF, que o backend recusa.
    const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
    if (![".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(ext)) {
      toast.error("Formato não suportado: use PNG, JPG, GIF ou WEBP");
      return null;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Imagem maior que 10 MB");
      return null;
    }
    try {
      const { url } = await API.upload(file, "account-logos");
      return url;
    } catch (e) {
      const message = e instanceof Error ? e.message : "erro desconhecido";
      toast.error(`Erro ao enviar logo: ${message}`);
      return null;
    }
  }

  const handleAddAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const type = form.get("type") as string;
    let iconUrl: string | null = null;

    const logoFile = (form.get("logo") as File) || null;
    if (logoFile && logoFile.size > 0) {
      iconUrl = await uploadLogo(logoFile);
    }

    await addAccount.mutateAsync({
      name: form.get("name") as string,
      type,
      balance: parseFloat(form.get("balance") as string) || 0,
      color: getTypeColor(type),
      icon: iconUrl,
    });
    setAddOpen(false);
  };

  const handleEditAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editItem) return;
    const form = new FormData(e.currentTarget);
    let iconUrl = editItem.icon;

    const logoFile = (form.get("logo") as File) || null;
    if (logoFile && logoFile.size > 0) {
      const uploaded = await uploadLogo(logoFile);
      if (uploaded) iconUrl = uploaded;
    }

    await updateAccount.mutateAsync({
      id: editItem.id,
      name: form.get("name") as string,
      balance: parseFloat(form.get("balance") as string),
      icon: iconUrl,
    });
    setEditOpen(false);
    setEditItem(null);
  };

  const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await addTransfer.mutateAsync({
      from_account_id: form.get("from") as string,
      to_account_id: form.get("to") as string,
      amount: parseFloat(form.get("amount") as string),
      description: (form.get("description") as string) || undefined,
      date: form.get("date") as string,
    });
    setTransferOpen(false);
  };

  const openEdit = (account: FinancialAccount) => {
    setEditItem(account);
    setEditPreview(null);
    setEditOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas Financeiras</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas contas e saldos</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><ArrowRightLeft className="mr-2 h-4 w-4" />Transferir</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Transferência entre Contas</DialogTitle></DialogHeader>
              <form onSubmit={handleTransfer} className="space-y-4">
                <div className="space-y-2">
                  <Label>Conta de Origem *</Label>
                  <Select name="from" required>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Conta de Destino *</Label>
                  <Select name="to" required>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$) *</Label>
                  <CurrencyInput name="amount" required />
                </div>
                <div className="space-y-2">
                  <Label>Data *</Label>
                  <Input name="date" type="date" required defaultValue={format(new Date(), "yyyy-MM-dd")} />
                </div>
                <div className="space-y-2">
                  <Label>Descrição (opcional)</Label>
                  <Input name="description" placeholder="Ex: Aporte para investimentos" />
                </div>
                <Button type="submit" className="w-full" disabled={addTransfer.isPending}>Transferir</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={addOpen} onOpenChange={o => { setAddOpen(o); if (!o) setAddPreview(null); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Nova Conta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Conta</DialogTitle>
                <DialogDescription>Adicione uma conta bancária ou carteira.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddAccount}>
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <label className="flex flex-col items-center gap-2 cursor-pointer">
                      {addPreview ? (
                        <img src={addPreview} alt="Preview" className="h-16 w-16 rounded-xl object-cover border shadow-sm" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors bg-muted/30">
                          <Upload className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <span className="text-xs text-muted-foreground">{addPreview ? "Alterar logo" : "Logo (opcional)"}</span>
                      <input type="file" name="logo" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          const reader = new FileReader();
                          reader.onload = (ev) => setAddPreview(ev.target?.result as string);
                          reader.readAsDataURL(f);
                        }
                      }} />
                    </label>
                  </div>
                  <div className="space-y-2"><Label>Nome *</Label><Input name="name" required placeholder="Ex: Nubank, Carteira" /></div>
                  <div className="space-y-2"><Label>Tipo *</Label>
                    <Select name="type" required>
                      <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Saldo (R$)</Label><CurrencyInput name="balance" defaultValue={0} allowNegative /></div>
                </div>
                <Button type="submit" className="w-full mt-4" disabled={addAccount.isPending}>Criar Conta</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={editOpen} onOpenChange={o => { setEditOpen(o); if (!o) { setEditItem(null); setEditPreview(null); } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Conta</DialogTitle>
                <DialogDescription>Altere os dados da conta.</DialogDescription>
              </DialogHeader>
              {editItem && (
                <form onSubmit={handleEditAccount}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <label className="flex flex-col items-center gap-2 cursor-pointer">
                        {editPreview || editItem.icon ? (
                          <img src={editPreview || editItem.icon!} alt="Logo" className="h-16 w-16 rounded-xl object-cover border shadow-sm" />
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors bg-muted/30">
                            <Upload className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground">{editPreview || editItem.icon ? "Alterar logo" : "Logo (opcional)"}</span>
                        <input type="file" name="logo" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setEditPreview(ev.target?.result as string);
                            reader.readAsDataURL(f);
                          }
                        }} />
                      </label>
                    </div>
                    <div className="space-y-2"><Label>Nome *</Label><Input name="name" required defaultValue={editItem.name || ""} /></div>
                    <div className="space-y-2"><Label>Tipo *</Label>
                      <Select name="type" required defaultValue={editItem.type || ""}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label>Saldo (R$)</Label><CurrencyInput name="balance" defaultValue={editItem.balance} allowNegative /></div>
                  </div>
                  <Button type="submit" className="w-full mt-4" disabled={updateAccount.isPending}>Salvar</Button>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="glass-card">
        <CardContent className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Saldo Total em Contas</p>
              <p className={`text-lg font-bold ${totalBalance >= 0 ? "text-income" : "text-expense"}`}>{formatCurrency(totalBalance)}</p>
            </div>
          </div>
          <Badge variant="secondary">{accounts.length} contas</Badge>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map(account => (
          <AccountCard
            key={account.id}
            account={account}
            Icon={getTypeIcon(account.type)}
            typeColor={getTypeColor(account.type)}
            typeLabel={getTypeLabel(account.type)}
            transactions={allTransactions}
            earnings={allEarnings}
            formatCurrency={formatCurrency}
            onEdit={openEdit}
            onDelete={(id) => deleteAccount.mutate(id)}
          />
        ))}
      </div>

      {transfers.length > 0 && (
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base">Transferências Recentes</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {transfers.slice(0, 10).map(t => (
                <div key={t.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{t.from_account?.name} → {t.to_account?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.description ? `${t.description} · ` : ""}{format(new Date(t.date + "T12:00:00"), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatCurrency(t.amount)}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTransfer.mutate(t.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
