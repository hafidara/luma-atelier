export interface Product {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  colours: { name: string; label: string; hex: string }[];
}

export interface Order {
  id: number;
  productId: string;
  email: string;
  colour: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  createdAt: string;
}
