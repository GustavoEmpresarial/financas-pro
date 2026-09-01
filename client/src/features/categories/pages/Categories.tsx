import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Badge } from "@/shared/components/ui/badge";
import { useCategories, CATEGORY_COLORS, Category } from "@/features/categories/hooks/useCategories";
import { CATEGORY_ICONS, CATEGORY_ICON_KEYS, getCategoryIcon } from "@/features/categories/lib/icons";

const CATEGORY_TYPES = [
  { value: "expense", label: "Despesa" },
  { value: "income", label: "Receita" },
];

export default function Categories() {
  const { data: categories = [], addCategory, updateCategory, deleteCategory, parents } = useCategories();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const filtered = filterType === "all" ? parents : parents.filter(c => c.type === filterType);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await addCategory.mutateAsync({
      name: form.get("name") as string,
      type: form.get("type") as string,
      color: (form.get("color") as string) || null,
      icon: (form.get("icon") as string) || "tag",
    });
    setOpen(false);
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCategory) return;
    const form = new FormData(e.currentTarget);
    await updateCategory.mutateAsync({
      id: editingCategory.id,
      name: form.get("name") as string,
      color: (form.get("color") as string) || null,
      icon: (form.get("icon") as string) || "tag",
    });
    setEditOpen(false);
    setEditingCategory(null);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setEditOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categorias</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas categorias de despesas e receitas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="expense">Despesas</SelectItem>
              <SelectItem value="income">Receitas</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Nova Categoria
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Categoria</DialogTitle>
                <DialogDescription>Crie uma categoria para organizar seus lançamentos.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input name="name" required placeholder="Ex: Alimentação" />
                </div>
                <div className="space-y-2">
                  <Label>Tipo *</Label>
                  <Select name="type" required defaultValue="expense">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cor</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_COLORS.map(color => (
                      <label key={color} className="cursor-pointer">
                        <input type="radio" name="color" value={color} className="peer sr-only" defaultChecked={color === "#3b82f6"} />
                        <div className="h-7 w-7 rounded-full border-2 border-transparent peer-checked:border-primary ring-2 ring-transparent peer-checked:ring-primary/30 transition-all" style={{ backgroundColor: color }} />
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Ícone</Label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_ICON_KEYS.map(key => {
                      const Icon = CATEGORY_ICONS[key];
                      return (
                        <label key={key} className="cursor-pointer">
                          <input type="radio" name="icon" value={key} className="peer sr-only" defaultChecked={key === "tag"} />
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-transparent bg-muted text-muted-foreground peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all">
                            <Icon className="h-4 w-4" />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={addCategory.isPending}>Criar</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) setEditingCategory(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>Altere o nome, a cor ou o ícone da categoria.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input name="name" required defaultValue={editingCategory?.name || ""} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Input value={editingCategory?.type === "expense" ? "Despesa" : "Receita"} disabled className="opacity-60" />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map(color => (
                  <label key={color} className="cursor-pointer">
                    <input type="radio" name="color" value={color} className="peer sr-only" defaultChecked={color === (editingCategory?.color || "#64748b")} />
                    <div className="h-7 w-7 rounded-full border-2 border-transparent peer-checked:border-primary ring-2 ring-transparent peer-checked:ring-primary/30 transition-all" style={{ backgroundColor: color }} />
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ICON_KEYS.map(key => {
                  const Icon = CATEGORY_ICONS[key];
                  return (
                    <label key={key} className="cursor-pointer">
                      <input type="radio" name="icon" value={key} className="peer sr-only" defaultChecked={key === (editingCategory?.icon || "tag")} />
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg border-2 border-transparent bg-muted text-muted-foreground peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all">
                        <Icon className="h-4 w-4" />
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={updateCategory.isPending}>Salvar</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="glass-card">
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma categoria encontrada</p>
          ) : (
            <div className="divide-y">
              {filtered.map(cat => {
                const Icon = getCategoryIcon(cat.icon);
                return (
                <div key={cat.id} className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-muted/30 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg"
                      style={{ backgroundColor: (cat.color || "#64748b") + "20", color: cat.color || "#64748b" }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mr-1">
                          {cat.type === "expense" ? "Despesa" : "Receita"}
                        </Badge>
                        {cat.isDefault && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Padrão</Badge>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => openEdit(cat)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-expense" onClick={() => deleteCategory.mutate(cat.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
