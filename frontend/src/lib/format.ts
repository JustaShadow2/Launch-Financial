export function formatMoney(n: number, opts: { sign?: boolean } = {}): string {
  const sign = opts.sign && n > 0 ? "+" : "";
  const abs = Math.abs(n);
  const formatted = abs.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? "-" : sign}$${formatted}`;
}

export function formatPrice(n: number): string {
  if (n < 1) {
    return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
  }
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatPercent(n: number, withSign = true): string {
  const sign = withSign && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatQty(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

export function gainClass(n: number): string {
  if (n > 0) return "gain";
  if (n < 0) return "loss";
  return "flat";
}
