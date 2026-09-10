export function money(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function colourLabel(colour: string) {
  return colour.charAt(0).toUpperCase() + colour.slice(1);
}

export const colourHex: Record<string, string> = {
  terracotta: "#E87945",
  sage: "#92A18C",
  charcoal: "#40464A",
};
