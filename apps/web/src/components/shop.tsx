"use client";

import { useEffect, useState } from "react";
import { getProducts } from "@/lib/api";
import { Product } from "@/lib/types";
import { money } from "@/lib/format";
import { ProductLamp } from "./product-lamp";
import { ColourPicker } from "./colour-picker";
import { OrderForm } from "./order-form";

export function Shop() {
  const [product, setProduct] = useState<Product | null>(null);
  const [colour, setColour] = useState("terracotta");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    getProducts(controller.signal)
      .then((products) => {
        const luma = products.find((item) => item.id === "luma");
        if (!luma || !luma.colours.length)
          throw new Error("Luma is currently unavailable. Please try again.");
        setProduct(luma);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      });
    return () => controller.abort();
  }, [attempt]);
  const selected = product?.colours.find((item) => item.name === colour);

  return (
    <main id="main">
      <section className="hero shell" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">LIGHT FOR YOUR EVERYDAY</p>
          <h1 id="hero-title">
            A little light.
            <br />A better <span>mood.</span>
          </h1>
          <p className="hero-description">
            Meet Luma, a simple desk lamp
            <br className="desktop-break" /> for work and wind-down.
          </p>
          <a className="button" href="#order">
            Order now
          </a>
        </div>
        <div className="product-scene">
          <div
            className="lamp-stage"
            role="group"
            aria-label={`Luma desk lamp in ${colour}`}
          >
            <ProductLamp colour={selected?.hex || "#E87945"} />
          </div>
        </div>
      </section>
      <section className="product-strip shell" aria-label="Product details">
        <div>
          <p>
            Luma desk lamp{" "}
            <span className="muted">/ {selected?.label || "Terracotta"}</span>
          </p>
        </div>
        {product && (
          <ColourPicker
            colours={product.colours}
            selected={colour}
            onChange={setColour}
          />
        )}
        <div className="strip-price">
          {product ? money(product.priceCents, product.currency) : "—"}{" "}
          <span>USD / unit</span>
        </div>
      </section>
      <section className="benefits shell" aria-label="Made for everyday living">
        <article>
          <div>
            <h2>Warm glow</h2>
            <p>A comfortable light for brighter days and calmer nights.</p>
          </div>
        </article>
        <article>
          <div>
            <h2>Small footprint</h2>
            <p>Thoughtful design that fits your space.</p>
          </div>
        </article>
        <article>
          <div>
            <h2>Made for your desk</h2>
            <p>A simple companion for focus and fresh ideas.</p>
          </div>
        </article>
      </section>
      <section
        id="order"
        className="order-section shell"
        aria-labelledby="order-title"
      >
        <div className="order-intro">
          <h2 id="order-title">Order Luma</h2>
        </div>

        {product ? (
          <OrderForm product={product} colour={colour} setColour={setColour} />
        ) : (
          <div className="form-panel request-state" aria-live="polite">
            {error ? (
              <>
                <p role="alert">{error}</p>
                <button
                  className="button"
                  onClick={() => setAttempt((value) => value + 1)}
                >
                  Try again
                </button>
              </>
            ) : (
              <p role="status">Loading product…</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
