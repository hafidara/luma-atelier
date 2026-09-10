"use client";

import dynamic from "next/dynamic";
import { Component, useState, type ReactNode } from "react";
import { Lamp } from "./lamp";

const ThreeLamp = dynamic(() => import("./three-lamp"), { ssr: false });

class LampBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function ProductLamp({ colour }: { colour: string }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  return (
    <div className="product-lamp" aria-busy={status === "loading"}>
      {status === "loading" && (
        <div className="lamp-loading" role="status">
          <span className="sr-only">Loading 3D lamp…</span>
          <span className="lamp-spinner" aria-hidden="true" />
        </div>
      )}
      {status === "error" && (
        <div className="lamp-fallback">
          <Lamp colour={colour} />
        </div>
      )}
      <LampBoundary onError={() => setStatus("error")}>
        <ThreeLamp colour={colour} onStatusChange={setStatus} />
      </LampBoundary>
    </div>
  );
}
