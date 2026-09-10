import { Order, Product } from "../models";

export const products: Product[] = [
  {
    id: "luma",
    name: "Luma",
    priceCents: 4900,
    currency: "USD",
    colours: [
      { name: "terracotta", label: "Terracotta", hex: "#E87945" },
      { name: "sage", label: "Sage", hex: "#92A18C" },
      { name: "charcoal", label: "Charcoal", hex: "#40464A" },
    ],
  },
];

export const orders: Order[] = [
  { id: 1006, email: "amina@example.com", colour: "terracotta", quantity: 1 },
  { id: 1005, email: "omar@example.com", colour: "sage", quantity: 2 },
  { id: 1004, email: "sara@example.com", colour: "charcoal", quantity: 1 },
  { id: 1003, email: "lina@example.com", colour: "sage", quantity: 1 },
  { id: 1002, email: "adam@example.com", colour: "terracotta", quantity: 3 },
  { id: 1001, email: "youssef@example.com", colour: "charcoal", quantity: 2 },
].map((order) => ({
  ...order,
  productId: "luma",
  unitPriceCents: 4900,
  totalCents: order.quantity * 4900,
  createdAt: `2026-01-0${order.id - 1000}T12:00:00.000Z`,
}));
