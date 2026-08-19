import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  interactive?: boolean;
}

export function Card({
  className = "",
  padding = "md",
  interactive = false,
  style,
  children,
  ...props
}: CardProps) {
  const paddingMap = {
    none: "0",
    sm: "var(--space-3)", // 12px
    md: "var(--space-4)", // 16px
    lg: "var(--space-6)", // 24px
  };

  const baseStyle: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-lg)",
    padding: paddingMap[padding],
    transition: interactive ? "transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease" : undefined,
    ...style,
  };

  const interactiveProps = interactive ? {
    onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.transform = "translateY(-2px)";
      e.currentTarget.style.borderColor = "var(--accent)";
      e.currentTarget.style.boxShadow = "var(--shadow-md)";
      if (props.onMouseEnter) props.onMouseEnter(e);
    },
    onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => {
      e.currentTarget.style.transform = "none";
      e.currentTarget.style.borderColor = "var(--border)";
      e.currentTarget.style.boxShadow = "none";
      if (props.onMouseLeave) props.onMouseLeave(e);
    }
  } : {};

  return (
    <div
      className={className}
      style={baseStyle}
      {...props}
      {...interactiveProps}
    >
      {children}
    </div>
  );
}
