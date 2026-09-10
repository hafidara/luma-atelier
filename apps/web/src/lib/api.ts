import { Order, OrderInput, OrderPage, Product } from "./types";

const baseUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"
).replace(/\/$/, "");

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), 15000);
  const signal = options.signal
    ? AbortSignal.any([options.signal, timeout.signal])
    : timeout.signal;
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal,
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);
    if (!response.ok)
      throw new Error(data?.error || "Something went wrong. Please try again.");
    if (data === null)
      throw new Error(
        "The server returned an unreadable response. Please try again.",
      );
    return data as T;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timeout.signal.aborted)
      throw new Error("The request took too long. Please try again.");
    if (error instanceof TypeError)
      throw new Error(
        "Unable to reach the shop. Check that the API is running and try again.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export const getProducts = (signal?: AbortSignal) =>
  request<Product[]>("/products", { signal });
export const getOrders = (page: number, signal?: AbortSignal) =>
  request<OrderPage>(`/orders?page=${page}`, { signal });
export const createOrder = (input: OrderInput) =>
  request<Order>("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
