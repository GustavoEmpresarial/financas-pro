import { useState } from "react";
import { Input } from "@/shared/components/ui/input";

interface CurrencyInputProps {
  name?: string;
  defaultValue?: number | string | null;
  /** Controlled mode: pass the current numeric value (as string) and a setter, like a plain <Input>. When provided, `name`/hidden-input form wiring is skipped. */
  value?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  /** Allow a leading "-" (e.g. account balances that can go negative). Off by default for expense/income amounts. */
  allowNegative?: boolean;
}

function digitsToNumber(digits: string, negative: boolean): number {
  if (!digits) return 0;
  const n = parseInt(digits, 10) / 100;
  return negative ? -n : n;
}

function formatDigits(digits: string, negative: boolean): string {
  const formatted = digitsToNumber(digits, false).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return negative && digits ? `-${formatted}` : formatted;
}

function toState(value?: number | string | null): { digits: string; negative: boolean } {
  const n = typeof value === "number" ? value : parseFloat(value || "0");
  return { digits: n ? Math.round(Math.abs(n) * 100).toString() : "", negative: n < 0 };
}

/** Masked BRL amount input: types digits right-to-left like a calculator/ATM, avoiding native <input type="number"> pitfalls (mouse-wheel scroll changing the value, comma/dot locale mismatches). */
export function CurrencyInput({ name, defaultValue, value, onValueChange, required, placeholder = "0,00", className, id, allowNegative = false }: CurrencyInputProps) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(() => toState(defaultValue));
  const state = controlled ? toState(value) : internal;
  const numericValue = digitsToNumber(state.digits, state.negative);

  const handleChange = (raw: string) => {
    const negative = allowNegative && raw.trim().startsWith("-");
    const cleanDigits = raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15);
    if (controlled) {
      onValueChange?.(digitsToNumber(cleanDigits, negative).toString());
    } else {
      setInternal({ digits: cleanDigits, negative });
    }
  };

  return (
    <>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        required={required}
        className={className}
        placeholder={placeholder}
        value={state.digits ? formatDigits(state.digits, state.negative) : ""}
        onChange={(e) => handleChange(e.target.value)}
      />
      {!controlled && <input type="hidden" name={name} value={numericValue} />}
    </>
  );
}
