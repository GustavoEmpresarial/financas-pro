import { describe, it, expect } from "vitest";
import { addMonthsKeepingDay } from "@/shared/lib/dates";

describe("addMonthsKeepingDay", () => {
  it("mes comum simplesmente avanca o mes", () => {
    expect(addMonthsKeepingDay("2026-01-15", 1)).toBe("2026-02-15");
  });

  // O bug real: new Date(y, m - 1 + i, d) normaliza o estouro de dia, entao
  // 31/01 + 1 mes virava 03/03 em vez de 28/02 — parcela 2 caia no mes 3.
  it("dia 31 adiado um mes cai no ultimo dia de fevereiro, nao em marco", () => {
    expect(addMonthsKeepingDay("2026-01-31", 1)).toBe("2026-02-28");
  });

  it("dia 31 em fevereiro bissexto", () => {
    expect(addMonthsKeepingDay("2028-01-31", 1)).toBe("2028-02-29");
  });

  it("dia 31 para abril, que tem 30 dias", () => {
    expect(addMonthsKeepingDay("2026-03-31", 1)).toBe("2026-04-30");
  });

  it("virada de ano", () => {
    expect(addMonthsKeepingDay("2026-12-31", 1)).toBe("2027-01-31");
  });

  it("zero meses devolve a mesma data", () => {
    expect(addMonthsKeepingDay("2026-01-31", 0)).toBe("2026-01-31");
  });

  // Parcelamento gera as datas em sequencia (i = 0, 1, 2, ...) a partir da
  // MESMA data base — nao encadeado. Isso evita que o desvio de um mes curto
  // (28/02) contamine a parcela seguinte, que precisa voltar para dia 31.
  it("parcelas consecutivas nao colidem nem acumulam desvio de mes curto", () => {
    const base = "2026-01-31";
    const datas = [0, 1, 2, 3].map((i) => addMonthsKeepingDay(base, i));
    expect(datas).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
    expect(new Set(datas).size).toBe(datas.length);
  });
});
