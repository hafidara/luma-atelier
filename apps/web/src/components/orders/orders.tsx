"use client";

import Link from "next/link";
import { OrderCards } from "./order-cards";
import { OrderTable } from "./order-table";
import { useOrders } from "./use-orders";

export function Orders() {
  const {
    view,
    items,
    page,
    total,
    loading,
    error,
    switchView,
    requestPage,
    retry,
  } = useOrders();
  const pages = Math.max(1, Math.ceil(total / 3));
  const initial = page === 0;
  const from = items.length === 0 ? 0 : (page - 1) * 3 + 1;
  const to = items.length === 0 ? 0 : Math.min(page * 3, total);

  return (
    <main id="main" className="orders-page shell">
      <div className="orders-heading">
        <div>
          <h1>Orders</h1>
          <p>Demo orders placed in the shop</p>
        </div>
        <Link className="text-link" href="/">
          Back to shop
        </Link>
      </div>
      <div className="orders-toolbar">
        <div className="view-switch" role="group" aria-label="Order view">
          <button
            aria-pressed={view === "table"}
            onClick={() => switchView("table")}
          >
            Table
          </button>
          <button
            aria-pressed={view === "cards"}
            onClick={() => switchView("cards")}
          >
            Cards
          </button>
        </div>
        <span className="sort-note">Newest first</span>
      </div>
      <div className="orders-data" aria-busy={loading}>
        {initial && loading ? (
          <div className="orders-state" role="status">
            Loading orders…
          </div>
        ) : initial && error ? (
          <div className="orders-state">
            <h2>Unable to load orders</h2>
            <p role="alert">{error}</p>
            <button className="button" onClick={retry}>
              Try again
            </button>
          </div>
        ) : !error && total === 0 ? (
          <div className="orders-state">
            <h2>No orders yet</h2>
            <p>Place a demo order in the shop.</p>
            <Link className="button" href="/">
              Go to shop
            </Link>
          </div>
        ) : (
          !initial && (
            <>
              {view === "table" ? (
                <OrderTable orders={items} />
              ) : (
                <OrderCards orders={items} />
              )}
              {error && (
                <div className="pagination-error">
                  <p role="alert">{error}</p>
                  <button
                    className="text-button"
                    onClick={retry}
                    disabled={loading}
                  >
                    Retry failed page
                  </button>
                </div>
              )}
              {view === "table" ? (
                <div className="table-pagination">
                  <p aria-live="polite">
                    Showing {from}–{to} of {total}
                  </p>
                  <div>
                    <button
                      className="paging-button"
                      disabled={loading || page <= 1}
                      onClick={() => requestPage(page - 1)}
                    >
                      Previous
                    </button>
                    <span>
                      Page {page} of {pages}
                    </span>
                    <button
                      className="paging-button"
                      disabled={loading || page >= pages}
                      onClick={() => requestPage(page + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : (
                <div className="cards-pagination">
                  <p aria-live="polite">
                    Showing {items.length} of {total} orders
                  </p>
                  {page < pages && !error && (
                    <button
                      className="button button-outline"
                      disabled={loading}
                      onClick={() => requestPage(page + 1)}
                    >
                      {loading ? "Loading more…" : "Load more"}
                    </button>
                  )}
                </div>
              )}
              {loading && (
                <p className="pagination-status" role="status">
                  {view === "table" ? "Loading page…" : "Loading more orders…"}
                </p>
              )}
            </>
          )
        )}
      </div>
    </main>
  );
}
