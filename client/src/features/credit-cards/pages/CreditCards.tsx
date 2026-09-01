import { useState, useRef, useCallback } from "react";
import { format } from "date-fns";
import { Plus, Trash2, CreditCard as CreditCardIcon, Calendar, Pencil, Upload, Image } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { CurrencyInput } from "@/shared/components/CurrencyInput";
import { Label } from "@/shared/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/shared/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/shared/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useCreditCards, type CreditCard } from "@/features/credit-cards/hooks/useCreditCards";
import { useTransactions } from "@/features/transactions/hooks/useTransactions";
import { Progress } from "@/shared/components/ui/progress";
import { MonthPicker } from "@/shared/components/MonthPicker";
import { Badge } from "@/shared/components/ui/badge";
import { API, resolveAssetUrl } from "@/shared/services/api";
import { toast } from "sonner";

const CARD_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];
const CARD_TYPES = [
  { value: "credit", label: "Crédito" },
  { value: "debit", label: "Débito" },
  { value: "both", label: "Crédito e Débito" },
];

function CardForm({ initial, onSubmit, isPending, colorIndex }: {
  initial?: Partial<CreditCard>;
  onSubmit: (data: any) => void;
  isPending: boolean;
  colorIndex: number;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [brand, setBrand] = useState(initial?.brand || "");
  const [totalLimit, setTotalLimit] = useState(initial?.totalLimit?.toString() || "");
  const [closingDay, setClosingDay] = useState(initial?.closingDay?.toString() || "25");
  const [dueDay, setDueDay] = useState(initial?.dueDay?.toString() || "10");
  const [cardType, setCardType] = useState(initial?.cardType || "credit");
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.imageUrl || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setImageFile(f);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(f);
    }
  };

  const handleSubmit = async () => {
    let imageUrl = initial?.imageUrl || null;
    if (imageFile) {
      setUploading(true);
      try {
        const { url } = await API.upload(imageFile, "card-images");
        imageUrl = url;
      } catch (e: any) {
        toast.error(`Erro ao enviar imagem: ${e.message}`);
        setUploading(false);
        return;
      }
      setUploading(false);
    }
    onSubmit({
      name: name.trim(),
      brand: brand.trim() || null,
      total_limit: parseFloat(totalLimit),
      closing_day: parseInt(closingDay),
      due_day: parseInt(dueDay),
      card_type: cardType,
      color: initial?.color || CARD_COLORS[colorIndex % CARD_COLORS.length],
      image_url: imageUrl,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <label className="flex flex-col items-center gap-2 cursor-pointer">
          {imagePreview ? (
            <img src={imagePreview} alt="Preview" className="h-20 w-32 rounded-xl object-cover border" />
          ) : (
            <div className="flex h-20 w-32 items-center justify-center rounded-xl bg-muted border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          <span className="text-xs text-muted-foreground">{imagePreview ? "Alterar imagem" : "Foto do cartão (opcional)"}</span>
          <input type="file" name="image" accept="image/*" className="hidden" onChange={handleFileChange} />
        </label>
      </div>
      <div className="space-y-2">
        <Label>Nome do Cartão *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nubank" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Bandeira</Label>
          <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Visa, Mastercard..." />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={cardType} onValueChange={setCardType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CARD_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Limite Total (R$) *</Label>
        <CurrencyInput value={totalLimit} onValueChange={setTotalLimit} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Dia de Fechamento</Label>
          <Input type="number" min="1" max="31" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Dia de Vencimento</Label>
          <Input type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleSubmit} disabled={isPending || !name.trim() || !totalLimit || parseFloat(totalLimit) <= 0}>
          {initial?.id ? "Salvar alterações" : "Adicionar Cartão"}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default function CreditCards() {
  const { data: cards = [], addCard, updateCard, deleteCard, uploadCardImage } = useCreditCards();
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const { data: transactions = [] } = useTransactions(month);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<CreditCard | null>(null);
  const [uploadingCardId, setUploadingCardId] = useState<string | null>(null);
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getCardExpenses = (cardId: string) =>
    transactions
      .filter((t: any) => t.type === "expense" && t.creditCardId === cardId)
      .reduce((sum: number, t: any) => sum + t.amount, 0);

  const handleImageUpload = async (cardId: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 5MB");
      return;
    }
    try {
      await uploadCardImage(cardId, file);
      toast.success("Imagem do cartão atualizada!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao enviar imagem");
    } finally {
      setUploadingCardId(null);
    }
  };

  const totalLimit = cards.reduce((s, c) => s + c.totalLimit, 0);
  const totalUsed = cards.reduce((s, c) => s + getCardExpenses(c.id), 0);

  const getTypeLabel = (type: string) => CARD_TYPES.find((t) => t.value === type)?.label || type;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cartões de Crédito</h1>
          <p className="text-sm text-muted-foreground">Controle de limites e faturas</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker value={month} onChange={setMonth} />
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo Cartão</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Cartão</DialogTitle></DialogHeader>
              <CardForm
                colorIndex={cards.length}
                onSubmit={(data) => addCard.mutate(data, { onSuccess: () => setAddOpen(false) })}
                isPending={addCard.isPending}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Limite Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(totalLimit)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Utilizado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-expense">{formatCurrency(totalUsed)}</p>
          </CardContent>
        </Card>
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Disponível</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-income">{formatCurrency(totalLimit - totalUsed)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards list */}
      <div className="grid gap-4 md:grid-cols-2">
        {cards.length === 0 ? (
          <Card className="glass-card col-span-full">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Nenhum cartão cadastrado
            </CardContent>
          </Card>
        ) : (
          cards.map((card) => {
            const used = getCardExpenses(card.id);
            const pct = card.totalLimit > 0 ? (used / card.totalLimit) * 100 : 0;
            return (
              <Card key={card.id} className="glass-card overflow-hidden">
                <div className="h-2" style={{ backgroundColor: card.color || "hsl(var(--primary))" }} />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-3">
                    {card.imageUrl ? (
                      <img src={resolveAssetUrl(card.imageUrl)} alt={card.name} className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <CardTitle className="text-base">{card.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-muted-foreground">{card.brand || "Sem bandeira"}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{getTypeLabel(card.cardType)}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={uploadingCardId === card.id}
                      onClick={() => {
                        setUploadingCardId(card.id);
                        hiddenFileInput.current?.click();
                      }}
                    >
                      <Image className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditItem(card)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir cartão?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o cartão {card.name}? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteCard.mutate(card.id)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fatura atual</span>
                    <span className="font-semibold text-expense">{formatCurrency(used)}</span>
                  </div>
                  <Progress value={Math.min(pct, 100)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Limite: {formatCurrency(card.totalLimit)}</span>
                    <span>Disponível: {formatCurrency(card.totalLimit - used)}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground pt-1">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Fecha dia {card.closingDay}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Vence dia {card.dueDay}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Cartão</DialogTitle></DialogHeader>
          {editItem && (
            <CardForm
              initial={editItem}
              colorIndex={0}
              onSubmit={(data) => updateCard.mutate({ id: editItem.id, ...data }, { onSuccess: () => setEditItem(null) })}
              isPending={updateCard.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={hiddenFileInput}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingCardId) handleImageUpload(uploadingCardId, file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
