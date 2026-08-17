import { useEffect, useRef, useState } from "react";

import { API_BASE_URL } from "../api/client";
import { buildModelFromReflection } from "../lib/dbReflectImport";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

const DIALECTS = [
  { key: "postgresql", label: "PostgreSQL", defaultPort: "5432" },
  { key: "mysql", label: "MySQL", defaultPort: "3306" },
  { key: "mariadb", label: "MariaDB", defaultPort: "3306" },
  { key: "mssql", label: "SQL Server", defaultPort: "1433" },
  { key: "hana", label: "SAP HANA", defaultPort: "39015" },
];

// Builds the same URL-style string the backend's make_url() expects, from
// discrete fields — user/password are percent-encoded since credentials can
// contain ':', '@', '/' etc. that would otherwise be parsed as URL syntax.
function buildConnectionString(dialect, { host, port, database, username, password }) {
  let auth = "";
  if (username) {
    auth = encodeURIComponent(username);
    if (password) auth += `:${encodeURIComponent(password)}`;
    auth += "@";
  }
  const portPart = port ? `:${port}` : "";
  const dbPart = database ? `/${database}` : "";
  return `${dialect}://${auth}${host.trim()}${portPart}${dbPart}`;
}

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
  const [host, setHost] = useState("");
  const [port, setPort] = useState(DIALECTS[0].defaultPort);
  const [database, setDatabase] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("merge");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [logs]);

  const handleDialectChange = (key) => {
    const previousDefault = DIALECTS.find((d) => d.key === dialect)?.defaultPort;
    // Only swap the port if it's still whatever the last dialect defaulted to
    // — a port the user typed themselves shouldn't get silently overwritten.
    if (port === previousDefault) {
      setPort(DIALECTS.find((d) => d.key === key)?.defaultPort || "");
    }
    setDialect(key);
  };

  const handleFetch = async () => {
    setError("");
    if (!host.trim()) {
      setError("Enter a host first.");
      return;
    }
    setLoading(true);
    setLogs([]);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE_URL}/reflect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          connection_string: buildConnectionString(dialect, { host, port, database, username, password }),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `Request failed (${res.status})`);
      }

      // The backend streams newline-delimited SSE "data: {...}" frames as it
      // works through each table, rather than one response at the very end —
      // so the reader has to be drained incrementally instead of awaited whole.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let settled = false;

      while (!settled) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop();
        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith("data:")) continue;
          const event = JSON.parse(line.slice(5).trim());
          if (event.type === "log") {
            setLogs((prev) => [...prev, event.message]);
          } else if (event.type === "result") {
            // The frontend has no dedicated dialect for SAP HANA, so diagrams
            // reflected from it fall back to the PostgreSQL column-type list —
            // the columns still carry their real type strings, just without
            // dialect-specific dropdown suggestions.
            const targetDbType = dialect === "hana" ? "postgresql" : dialect;
            const model = buildModelFromReflection(event.data, targetDbType);
            onImport(model, targetDbType, mode);
            settled = true;
          } else if (event.type === "error") {
            setError(event.message);
            settled = true;
          }
        }
      }
    } catch (err) {
      setError(err.message || "Could not read the schema.");
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
            rows are read. Credentials are sent directly to the database you specify, so only connect to ones you
            trust reaching.
          </p>

          <div className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Database type</span>
            <Select value={dialect} onValueChange={handleDialectChange}>
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

          <div className="flex flex-wrap gap-3">
            <div className="flex flex-[3] min-w-[160px] flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Host</span>
              <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="localhost" />
            </div>
            <div className="flex flex-1 min-w-[80px] flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Port</span>
              <Input value={port} onChange={(e) => setPort(e.target.value)} placeholder="5432" />
            </div>
            <div className="flex flex-[2] min-w-[140px] flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Database name
              </span>
              <Input value={database} onChange={(e) => setDatabase(e.target.value)} placeholder="dbname" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="flex flex-1 min-w-[140px] flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Username</span>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="user" />
            </div>
            <div className="flex flex-1 min-w-[140px] flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Password</span>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                autoComplete="new-password"
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

          {logs.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {loading ? "Processing…" : "Log"}
              </span>
              <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-[11px] leading-relaxed text-muted-foreground">
                {logs.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                <div ref={logEndRef} />
              </div>
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
