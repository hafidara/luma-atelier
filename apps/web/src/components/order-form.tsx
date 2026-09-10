"use client";

import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { createOrder } from "@/lib/api";
import { Product } from "@/lib/types";
import { money } from "@/lib/format";
import { ColourPicker } from "./colour-picker";

type Status = "idle" | "validating" | "saving" | "success" | "failure";

export function OrderForm({
  product,
  colour,
  setColour,
}: {
  product: Product;
  colour: string;
  setColour: (value: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const submitting = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const busy = status === "saving" || status === "validating";
  const selected = product.colours.find((item) => item.name === colour);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setStatus("validating");
    setError("");
    setEmailError("");
    if (!emailInput.current?.validity.valid || !email.trim()) {
      setEmailError("Enter a valid email address.");
      setStatus("failure");
      emailInput.current?.focus();
      submitting.current = false;
      return;
    }
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 5 ||
      !selected
    ) {
      setError("Choose an available colour and a quantity from 1 to 5.");
      setStatus("failure");
      submitting.current = false;
      return;
    }
    setStatus("saving");
    try {
      const order = await createOrder({
        productId: product.id,
        email: email.trim(),
        colour,
        quantity,
      });
      setOrderId(order.id);
      setStatus("success");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "We couldn’t save your order. Please try again.",
      );
      setStatus("failure");
    } finally {
      submitting.current = false;
    }
  }

  return (
    <div className="form-panel">
      {status === "success" ? (
        <div className="order-success" role="status">
          <h3>Order placed</h3>
          <p>
            Demo order <strong>#{orderId}</strong> is saved.
          </p>
          <Link className="button" href="/orders" prefetch={false}>
            View your order
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate aria-busy={busy}>
          <div className="form-heading">
            <h3>Your order</h3>
            <span>{money(product.priceCents)} / unit</span>
          </div>
          <label htmlFor="email">Your email</label>
          <input
            ref={emailInput}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            maxLength={254}
            value={email}
            disabled={busy}
            aria-invalid={!!emailError}
            aria-describedby={emailError ? "email-error" : "email-note"}
            onChange={(event) => {
              setEmail(event.target.value);
              setEmailError("");
            }}
          />
          {emailError ? (
            <p id="email-error" className="error-text" role="alert">
              {emailError}
            </p>
          ) : (
            <p id="email-note" className="field-note">
              Use a fictional email for this demo.
            </p>
          )}
          <div className="configuration-row">
            <div>
              <p className="field-label">
                Colour{" "}
                <span className="muted">/ {selected?.label || colour}</span>
              </p>
              <ColourPicker
                colours={product.colours}
                selected={colour}
                onChange={setColour}
                disabled={busy}
              />
            </div>
            <div>
              <label htmlFor="quantity">Quantity</label>
              <select
                id="quantity"
                name="quantity"
                value={quantity}
                disabled={busy}
                onChange={(event) => setQuantity(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="total-row">
            <span>
              Total <small>USD</small>
            </span>
            <output aria-live="polite" aria-label="Order total">
              {money(product.priceCents * quantity, product.currency)}
            </output>
          </div>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <button
            className="button submit-button"
            disabled={busy}
            type="submit"
          >
            {status === "saving"
              ? "Saving your order…"
              : status === "validating"
                ? "Checking your details…"
                : "Place demo order"}
          </button>
          <p className="form-footnote" role="status">
            {busy
              ? "Please keep this page open while we save."
              : "A demo order. No payment details needed."}
          </p>
        </form>
      )}
    </div>
  );
}
