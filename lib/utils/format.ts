export function formatCurrency(amount: number, currency: string = "CZK") {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("cs-CZ").format(new Date(value));
}

export function isOverdue(dueDate: string | null | undefined, paidDate: string | null | undefined) {
  if (!dueDate || paidDate) return false;
  return new Date(dueDate) < new Date(new Date().toDateString());
}
