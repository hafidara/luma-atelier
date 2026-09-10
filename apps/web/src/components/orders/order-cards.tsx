import { Order } from "@/lib/types";
import { colourHex, colourLabel, money } from "@/lib/format";

export function OrderCards({ orders }: { orders: Order[] }) {
  return (
    <div className="order-cards">
      {orders.map((order) => (
        <article className="order-card" key={order.id}>
          <div className="card-art">
            <svg
              className="card-lamp"
              viewBox="0 0 80 110"
              aria-hidden="true"
              fill={colourHex[order.colour] || "#40464A"}
            >
              <path d="M10 40a30 30 0 0 1 60 0Z" />
              <rect x="37" y="40" width="6" height="53" />
              <rect x="20" y="93" width="40" height="6" rx="3" />
            </svg>
          </div>
          <div className="card-body">
            <div className="card-title">
              <h2>Order #{order.id}</h2>
              <span>{money(order.totalCents)}</span>
            </div>
            <p className="customer-email">{order.email}</p>
            <dl>
              <div>
                <dt>Colour</dt>
                <dd>
                  <span className="order-colour">
                    <span
                      style={{
                        background: colourHex[order.colour] || "#40464A",
                      }}
                    />
                    {colourLabel(order.colour)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Quantity</dt>
                <dd>{order.quantity}</dd>
              </div>
            </dl>
          </div>
        </article>
      ))}
    </div>
  );
}
