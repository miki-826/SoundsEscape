"use client";
import { ButtonHTMLAttributes, ReactNode } from "react";

export function ScreenShell({
  bg,
  children,
  className = "",
}: {
  bg?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative min-h-dvh w-full overflow-hidden bg-bg crt-scanlines crt-vignette">
      {bg && (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-70"
          style={{ backgroundImage: `url(${bg})` }}
          aria-hidden
        />
      )}
      <div
        className={`relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 sm:px-8 ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export function Panel({
  children,
  className = "",
  bg,
  title,
}: {
  children: ReactNode;
  className?: string;
  bg?: string;
  title?: string;
}) {
  return (
    <div
      className={`rivets panel-edge relative rounded-md bg-panel/85 ${className}`}
      style={
        bg
          ? {
              backgroundImage: `linear-gradient(rgba(8,18,14,0.82),rgba(8,18,14,0.92)), url(${bg})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <span className="rivet" style={{ top: 6, left: 6 }} />
      <span className="rivet" style={{ top: 6, right: 6 }} />
      <span className="rivet" style={{ bottom: 6, left: 6 }} />
      <span className="rivet" style={{ bottom: 6, right: 6 }} />
      {title && (
        <div className="border-b border-line/80 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.3em] text-muted">
          {title}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
  children: ReactNode;
};

export function ActionButton({
  variant = "primary",
  children,
  className = "",
  ...rest
}: BtnProps) {
  const skin =
    variant === "primary"
      ? "/images/ui/primary-control.png"
      : "/images/ui/secondary-control.png";
  const text =
    variant === "primary"
      ? "text-bg"
      : variant === "danger"
        ? "text-danger text-glow-danger"
        : "text-text";
  return (
    <button
      {...rest}
      className={`group relative inline-flex items-center justify-center overflow-hidden rounded-md px-6 py-3 font-title text-sm font-bold uppercase tracking-[0.18em] transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg active:translate-y-[2px] disabled:cursor-not-allowed disabled:opacity-40 ${text} ${className}`}
    >
      <span
        className="pointer-events-none absolute inset-0 bg-cover bg-center transition-[filter] duration-150 group-hover:brightness-125 group-active:brightness-90"
        style={{ backgroundImage: `url(${skin})`, backgroundSize: "100% 100%" }}
        aria-hidden
      />
      <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
        style={{ boxShadow: variant === "primary" ? "inset 0 0 18px rgba(57,255,158,0.5)" : "inset 0 0 14px rgba(57,255,158,0.25)" }}
        aria-hidden
      />
      <span className="relative">{children}</span>
    </button>
  );
}

export function Emblem({ size = 120, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/images/ui/emblem.png"
      alt="夜間遺失物回収局 エンブレム"
      width={size}
      height={size}
      className={`select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function GaugeBar({
  label,
  value,
  max = 100,
  color = "accent",
  unit = "",
  vertical = false,
}: {
  label: string;
  value: number;
  max?: number;
  color?: "accent" | "item" | "danger";
  unit?: string;
  vertical?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const c =
    color === "item" ? "var(--item)" : color === "danger" ? "var(--danger)" : "var(--accent)";
  if (vertical) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative h-24 w-3 overflow-hidden rounded-sm border border-line bg-black/60">
          <div
            className="absolute bottom-0 w-full transition-all duration-200"
            style={{ height: `${pct}%`, background: c, boxShadow: `0 0 8px ${c}` }}
          />
        </div>
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted">{label}</span>
      </div>
    );
  }
  return (
    <div className="w-full">
      <div className="mb-1 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
        <span>{label}</span>
        <span style={{ color: c }}>
          {Math.round(value)}
          {unit}
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-sm border border-line bg-black/60">
        <div
          className="absolute left-0 top-0 h-full transition-all duration-200"
          style={{ width: `${pct}%`, background: c, boxShadow: `0 0 8px ${c}` }}
        />
      </div>
    </div>
  );
}

export function Stat({ label, value, accent }: { label: string; value: ReactNode; accent?: "item" | "danger" }) {
  const cls = accent === "item" ? "text-item text-glow-item" : accent === "danger" ? "text-danger text-glow-danger" : "text-accent text-glow";
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted">{label}</span>
      <span className={`font-title text-xl font-bold ${cls}`}>{value}</span>
    </div>
  );
}
