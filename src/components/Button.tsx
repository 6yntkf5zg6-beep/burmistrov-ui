import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "coral" | "ghost" | "neutral";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-secondary",
  outline: "border border-white text-white hover:bg-white/10",
  coral: "bg-coral text-white hover:brightness-95",
  ghost: "bg-transparent text-primary hover:bg-mint",
  neutral: "bg-ink/10 text-ink/60 hover:bg-ink/15",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-full px-6 py-3 text-sm font-bold uppercase tracking-wide transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
