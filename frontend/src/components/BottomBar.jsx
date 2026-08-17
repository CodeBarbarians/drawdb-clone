import { useState } from "react";
import { AlertTriangle, ChevronUp, Loader2 } from "lucide-react";

export default function BottomBar({ view, viewLoading, onViewChange, tableCount, relationshipCount, problems }) {
  const [problemsOpen, setProblemsOpen] = useState(false);
  const errorCount = problems.filter((p) => p.severity === "error").length;
  const warningCount = problems.filter((p) => p.severity === "warning").length;

  return (
    <div className="relative border-t border-border bg-[color:var(--bg-elevated)]">
      {problemsOpen && (
        <div className="absolute bottom-full left-0 right-0 max-h-56 overflow-y-auto border-t border-border bg-[color:var(--bg-panel)] p-2">
          {problems.length === 0 ? (
            <p className="px-2 py-1 font-mono text-xs text-muted-foreground">No problems detected.</p>
          ) : (
            problems.map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-2 py-1 font-mono text-xs">
                <AlertTriangle
                  className={`h-3.5 w-3.5 shrink-0 ${p.severity === "error" ? "text-destructive" : "text-[color:var(--success)]"}`}
                />
                {p.message}
              </div>
            ))
          )}
        </div>
      )}
      <div className="flex items-center gap-2 px-2 py-1.5 sm:gap-3 sm:px-3">
        <button
          className={`shrink-0 rounded-sm px-2 py-1 font-mono text-[11px] uppercase tracking-wider ${
            view === "structure" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onViewChange("structure")}
        >
          Structure
        </button>
        <button
          className={`shrink-0 rounded-sm px-2 py-1 font-mono text-[11px] uppercase tracking-wider ${
            view === "code" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => onViewChange("code")}
        >
          Code
        </button>
        {viewLoading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
        <span className="hidden truncate font-mono text-[11px] text-muted-foreground sm:inline">
          {tableCount} tables · {relationshipCount} relationships
        </span>
        <div className="flex-1" />
        <button
          className="flex shrink-0 items-center gap-1 rounded-sm px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-foreground"
          onClick={() => setProblemsOpen((v) => !v)}
        >
          <ChevronUp className={`h-3 w-3 transition-transform ${problemsOpen ? "" : "rotate-180"}`} />
          <span className="hidden sm:inline">Problems</span>
          {errorCount > 0 && <span className="text-destructive">({errorCount})</span>}
          {errorCount === 0 && warningCount > 0 && <span className="text-[color:var(--success)]">({warningCount})</span>}
        </button>
      </div>
    </div>
  );
}
