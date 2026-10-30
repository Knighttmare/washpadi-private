import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "ghost" };

export function Button({ className = "", variant = "default", ...props }: ButtonProps) {
  const base = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60";
  const styles = variant === "ghost" ? "bg-transparent text-current hover:bg-black/5" : "bg-emerald-700 text-white shadow-sm hover:-translate-y-0.5 hover:bg-emerald-800";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}
