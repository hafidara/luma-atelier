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

export interface OrderPage {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
}
export type OrderInput = Pick<
  Order,
  "productId" | "email" | "colour" | "quantity"
>;
