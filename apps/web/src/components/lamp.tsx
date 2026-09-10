import { CSSProperties } from "react";

// Keep the renderer independent: a future lamp can accept the same colour prop.
export function Lamp({
  colour,
  className = "",
}: {
  colour: string;
  className?: string;
}) {
  return (
    <svg
      className={`lamp ${className}`}
      viewBox="0 0 480 520"
      aria-hidden="true"
      style={{ "--lamp-colour": colour } as CSSProperties}
    >
      <ellipse
        cx="247"
        cy="471"
        rx="127"
        ry="12"
        fill="currentColor"
        opacity=".07"
      />
      <path
        d="M258 447 C339 448 307 479 394 477"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        opacity=".35"
      />
      <path
        className="lamp-fill"
        d="M151 447 Q157 418 238 416 Q319 418 326 447 L326 455 Q243 482 151 455Z"
      />
      <ellipse cx="239" cy="447" rx="88" ry="18" fill="#000" opacity=".06" />
      <rect
        className="lamp-fill"
        x="227"
        y="225"
        width="25"
        height="216"
        rx="11"
      />
      <path d="M247 235 L247 428" stroke="#000" strokeWidth="7" opacity=".08" />
      <rect
        className="lamp-fill"
        x="226"
        y="81"
        width="27"
        height="25"
        rx="12"
      />
      <path
        className="lamp-fill"
        d="M78 237 C88 152 153 96 239 96 C325 96 390 152 401 237 Q239 280 78 237Z"
      />
      <path
        d="M239 96 C325 96 390 152 401 237 L370 244 C367 171 312 114 239 96Z"
        fill="#000"
        opacity=".065"
      />
      <ellipse className="lamp-fill" cx="239" cy="237" rx="161" ry="28" />
      <ellipse cx="239" cy="237" rx="161" ry="28" fill="#000" opacity=".22" />
      <ellipse cx="239" cy="239" rx="145" ry="19" fill="#f6dcab" />
      <ellipse cx="239" cy="242" rx="61" ry="13" fill="#fff1cb" />
      <path
        d="M107 203 C124 159 150 138 182 124"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".18"
      />
    </svg>
  );
}
