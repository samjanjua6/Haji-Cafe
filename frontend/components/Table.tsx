import React from "react";

export interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  density?: "standard" | "dense";
}

export function Table({ density = "standard", style, children, ...props }: TableProps) {
  const padding = density === "dense" ? "var(--space-3)" : "var(--space-4)";
  
  return (
    <div className="table-wrap" style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "14px",
          ...style,
        }}
        {...props}
      >
        <TableContext.Provider value={{ padding }}>
          {children}
        </TableContext.Provider>
      </table>
    </div>
  );
}

const TableContext = React.createContext({ padding: "var(--space-4)" });

export function TableHead({ children, style, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead style={style} {...props}>{children}</thead>;
}

export function TableBody({ children, style, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody style={style} {...props}>{children}</tbody>;
}

export function TableRow({ children, style, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr 
      style={{ 
        borderBottom: "1px solid var(--border-subtle)", 
        transition: "background 0.12s",
        ...style 
      }} 
      {...props}
    >
      {children}
    </tr>
  );
}

export interface TableCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  isHeader?: boolean;
  sticky?: boolean;
}

export function TableCell({ isHeader = false, sticky = false, style, children, ...props }: TableCellProps) {
  const { padding } = React.useContext(TableContext);
  
  const baseStyle: React.CSSProperties = {
    padding: padding,
    textAlign: "left",
    ...(isHeader ? {
      color: "var(--text-faint)",
      fontWeight: 700,
      fontSize: "11px",
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      borderBottom: "1px solid var(--border)",
    } : {}),
    ...(sticky ? {
      position: "sticky",
      left: 0,
      background: "var(--bg-card)",
      zIndex: 1,
      // subtle shadow to indicate it's sticky when scrolling
      boxShadow: "2px 0 4px -2px rgba(0,0,0,0.1)",
    } : {}),
    ...style,
  };

  if (isHeader) {
    return <th style={baseStyle} {...props}>{children}</th>;
  }
  return <td style={baseStyle} {...props}>{children}</td>;
}
