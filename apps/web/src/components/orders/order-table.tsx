import { Order } from "@/lib/types";
import { colourHex, colourLabel, money } from "@/lib/format";

export function OrderTable({ orders }: { orders: Order[] }) {
  return (
    <div
      className="table-scroll"
      role="region"
      aria-label="Orders table, scroll horizontally on small screens"
      tabIndex={0}
    >
      <table>
        <caption className="sr-only">Demo orders, newest first</caption>
        <thead>
          <tr>
            <th scope="col">Order ID</th>
            <th scope="col">Customer email</th>
            <th scope="col">Colour</th>
            <th scope="col">Quantity</th>
            <th scope="col">Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <th scope="row">#{order.id}</th>
              <td>{order.email}</td>
              <td>
                <span className="order-colour">
                  <span
                    style={{ background: colourHex[order.colour] || "#40464A" }}
                  />
                  {colourLabel(order.colour)}
                </span>
              </td>
              <td>{order.quantity}</td>
              <td>{money(order.totalCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
