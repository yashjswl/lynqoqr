import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

export type MenuItem = { label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean };

export default function Menu({ items, label, icon }: { items: MenuItem[]; label: string; icon?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="menu" ref={root}>
      <button className="btn icon" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        {icon ?? <MoreHorizontal size={18} />}
      </button>
      {open && (
        <div className="menu-list" role="menu">
          {items.map((it, i) => (
            <button key={it.label} role="menuitem" autoFocus={i === 0} className={it.danger ? "danger" : ""}
              onClick={() => { setOpen(false); it.onSelect(); }}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
