"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getOrders } from "@/lib/api";
import { Order } from "@/lib/types";

export type View = "table" | "cards";

export function useOrders() {
  const [view, setView] = useState<View>("table");
  const [items, setItems] = useState<Order[]>([]);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const failedPage = useRef(1);

  const load = useCallback(async (targetPage: number, mode: View) => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const id = ++generation.current;
    inFlight.current = true;
    failedPage.current = targetPage;
    setLoading(true);
    setError("");
    try {
      const data = await getOrders(targetPage, request.signal);
      // Only the latest request can publish data or update loading state.
      if (id !== generation.current) return;
      setItems((previous) => {
        if (mode === "table" || targetPage === 1) return data.items;
        // Append only this page, deduplicating when new orders shift server offsets.
        return [
          ...new Map(
            [...previous, ...data.items].map((order) => [order.id, order]),
          ).values(),
        ];
      });
      setPage(data.page);
      setTotal(data.total);
    } catch (error) {
      if (id === generation.current && !request.signal.aborted) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load orders. Please try again.",
        );
      }
    } finally {
      if (id === generation.current) {
        setLoading(false);
        inFlight.current = false;
      }
    }
  }, []);

  useEffect(() => {
    setItems([]);
    setPage(0);
    setTotal(0);
    void load(1, view);
    return () => {
      generation.current++;
      controller.current?.abort();
    };
  }, [view, load]);

  // Also refresh when the browser restores this document from its back/forward cache.
  useEffect(() => {
    const refresh = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setItems([]);
        setPage(0);
        setTotal(0);
        void load(1, view);
      }
    };
    window.addEventListener("pageshow", refresh);
    return () => window.removeEventListener("pageshow", refresh);
  }, [load, view]);

  function switchView(next: View) {
    if (view === next) return;
    generation.current++;
    controller.current?.abort();
    setItems([]);
    setPage(0);
    setTotal(0);
    setError("");
    setLoading(true);
    setView(next);
  }

  return {
    view,
    items,
    page,
    total,
    loading,
    error,
    switchView,
    requestPage: (next: number) => {
      if (!inFlight.current) void load(next, view);
    },
    retry: () => {
      if (!inFlight.current) void load(failedPage.current, view);
    },
  };
}
