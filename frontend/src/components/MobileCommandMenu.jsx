import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";

// A searchable, full-screen action list for mobile — swaps the desktop
// File/Edit/View/Settings/Help dropdowns for something that doesn't require
// digging through five nested menus on a small screen.
export default function MobileCommandMenu({ open, onClose, groups, savedAt }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [open]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((item) => item.label.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[color:var(--bg)] md:hidden">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search actions…"
          className="h-8 min-w-0 flex-1 bg-transparent font-sans text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {savedAt && !query && (
          <span className="shrink-0 font-mono text-[10px] text-[color:var(--success)]">Saved {savedAt}</span>
        )}
        <button
          className="shrink-0 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {filteredGroups.length === 0 && (
          <p className="px-2 py-8 text-center font-mono text-xs text-muted-foreground">No matching actions.</p>
        )}
        {filteredGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={item.disabled}
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  className={`flex items-center gap-3 rounded-md px-2.5 py-2.5 text-left text-sm transition-colors active:bg-accent disabled:pointer-events-none disabled:opacity-40 ${
                    item.danger ? "text-destructive" : "text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.shortcut && (
                    <span className="shrink-0 font-mono text-[10px] tracking-widest text-muted-foreground">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
