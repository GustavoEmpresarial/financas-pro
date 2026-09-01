// Mapa de nome de icone (salvo em categories.icon) para o componente lucide
// correspondente. Antes disso, toda categoria renderizava o mesmo icone de
// pasta — so a cor mudava — porque o campo existia no banco mas nada o lia.
import {
  Tag, UtensilsCrossed, Repeat, CreditCard, Laptop, Zap, GraduationCap,
  Pill, Receipt, Bike, Wifi, Gift, TrendingUp, Wallet, Home, Car,
  ShoppingBag, Heart, Plane, Dumbbell, Film, Baby, PawPrint, Landmark,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  tag: Tag,
  food: UtensilsCrossed,
  subscription: Repeat,
  "credit-card": CreditCard,
  tech: Laptop,
  energy: Zap,
  education: GraduationCap,
  pharmacy: Pill,
  bill: Receipt,
  delivery: Bike,
  internet: Wifi,
  gift: Gift,
  investment: TrendingUp,
  salary: Wallet,
  home: Home,
  car: Car,
  shopping: ShoppingBag,
  health: Heart,
  travel: Plane,
  fitness: Dumbbell,
  entertainment: Film,
  kids: Baby,
  pets: PawPrint,
  bank: Landmark,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

// Fallback para "tag" se o valor salvo nao existir no mapa (icone removido do
// catalogo, ou campo antigo com lixo).
export function getCategoryIcon(icon: string | null | undefined): LucideIcon {
  return (icon && CATEGORY_ICONS[icon]) || Tag;
}
