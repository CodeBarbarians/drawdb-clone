import { useState } from "react";

import client from "../api/client";
import { buildModelFromReflection } from "../lib/dbReflectImport";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const DIALECTS = [
  { key: "postgresql", label: "PostgreSQL", placeholder: "postgresql://user:password@host:5432/dbname" },
  { key: "mysql", label: "MySQL", placeholder: "mysql://user:password@host:3306/dbname" },
  { key: "mariadb", label: "MariaDB", placeholder: "mariadb://user:password@host:3306/dbname" },
  { key: "mssql", label: "SQL Server", placeholder: "mssql://user:password@host:1433/dbname" },
  { key: "hana", label: "SAP HANA", placeholder: "hana://user:password@host:39015" },
];

function ModeToggle({ mode, onChange, disabled }) {
  return (
    <div className="flex rounded-md border border-border p-0.5">
      {[
        { key: "merge", label: "Add / update" },
        { key: "replace", label: "Replace all" },
      ].map((opt) => (
        <button
          key={opt.key}
          type="button"
          disabled={disabled}
          onClick={() => onChange(opt.key)}
          className={`flex-1 rounded px-3 py-1.5 font-mono text-xs uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            mode === opt.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export default function ReflectDatabaseModal({ hasExistingTables, onImport, onClose }) {
  const [dialect, setDialect] = useState("postgresql");
  const [connectionString, setConnectionString] = useState("");
  const [mode, setMode] = useState("merge");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedDialect = DIALECTS.find((d) => d.key === dialect);

  const handleFetch = async () => {
    setError("");
    if (!connectionString.trim()) {
      setError("Enter a connection string first.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await client.post("/reflect", { connection_string: connectionString.trim() });
      // The frontend has no dedicated dialect for SAP HANA, so diagrams
      // reflected from it fall back to the PostgreSQL column-type list —
      // the columns still carry their real type strings, just without
      // dialect-specific dropdown suggestions.
      const targetDbType = dialect === "hana" ? "postgresql" : dialect;
      const model = buildModelFromReflection(data, targetDbType);
      onImport(model, targetDbType, mode);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Could not read the schema.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Reverse-engineer from a database</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 p-4">
          <p className="text-xs text-muted-foreground">
            Connects once to pull table, column, key and index metadata — nothing is stored server-side, and no data
            rows are read. This is sent as a plain connection string, so only use it on databases you trust reaching.
          </p>

          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Database</span>
              <Select value={dialect} onValueChange={setDialect}>
                <SelectTrigger className="w-[160px] font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIALECTS.map((d) => (
                    <SelectItem key={d.key} value={d.key}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Connection string
              </span>
              <Input
                value={connectionString}
                onChange={(e) => setConnectionString(e.target.value)}
                placeholder={selectedDialect?.placeholder}
              />
            </div>
          </div>

          {hasExistingTables && (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Mode</span>
              <ModeToggle mode={mode} onChange={setMode} disabled={loading} />
              <p className="text-xs text-muted-foreground">
                {mode === "replace"
                  ? "Every table currently on the canvas will be removed and replaced by the reflected schema."
                  : "New tables are added; tables with a matching name have their columns updated in place."}
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-destructive bg-[color:var(--danger-bg)] px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleFetch} disabled={loading}>
              {loading ? "Connecting…" : "Fetch schema"}
            </Button>
            <Button size="sm" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
