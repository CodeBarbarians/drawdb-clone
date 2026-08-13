import { useRef, useState } from "react";

import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { DB_TYPES } from "../lib/dbTypes";
import { IMPORT_FORMATS, parseImport } from "../lib/dbImport";

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

export default function ImportModal({ hasExistingTables, currentDbType, initialFormat, onImport, onClose }) {
  const [format, setFormat] = useState(initialFormat && IMPORT_FORMATS[initialFormat] ? initialFormat : "dbml");
  const [dbType, setDbType] = useState(IMPORT_FORMATS[format]?.dbType || currentDbType || "postgresql");
  const [mode, setMode] = useState("merge");
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const targetDbType = IMPORT_FORMATS[format].dbType || dbType;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSource(String(reader.result || ""));
    reader.readAsText(file);
  };

  const handleImport = () => {
    setError("");
    if (!source.trim()) {
      setError("Paste or upload some " + IMPORT_FORMATS[format].label + " content first.");
      return;
    }
    // When merging into an existing diagram, normalize types to the
    // diagram's own dialect rather than the pasted script's, so imported
    // columns don't end up typed for a different database than the rest
    // of the canvas.
    const parseDbType = mode === "merge" ? currentDbType || targetDbType : targetDbType;
    try {
      const model = parseImport(source, format, parseDbType);
      onImport(model, targetDbType, mode);
    } catch (err) {
      setError(err.message || "Failed to parse the provided source.");
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Schema</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[80vh] flex-col gap-3 overflow-y-auto p-4">
          <p className="text-xs text-muted-foreground">
            Bulk add or update tables from a SQL, DBML, or JSON script. Tables are matched by name — matching
            tables have their columns updated, new ones are added to the canvas.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Format</span>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger className="w-[180px] font-mono text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(IMPORT_FORMATS).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {IMPORT_FORMATS[format].dbType === null && (
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Target dialect
                </span>
                <Select value={dbType} onValueChange={setDbType}>
                  <SelectTrigger className="w-[150px] font-mono text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DB_TYPES).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="ml-auto">
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                Upload file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".sql,.dbml,.json,.txt"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          </div>

          {hasExistingTables && (
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Mode</span>
              <ModeToggle mode={mode} onChange={setMode} />
              <p className="text-xs text-muted-foreground">
                {mode === "replace"
                  ? "Every table currently on the canvas will be removed and replaced by the import."
                  : "New tables are added; tables with a matching name have their columns updated in place."}
              </p>
            </div>
          )}

          <Textarea
            className="h-64 resize-none"
            placeholder={
              format === "dbml"
                ? "Paste DBML here, e.g.\n\nTable users {\n  id integer [primary key]\n  email varchar [unique]\n}"
                : format === "json"
                  ? "Paste a drawdb-clone JSON export here"
                  : "Paste CREATE TABLE statements here"
            }
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />

          {error && (
            <div className="rounded-md border border-destructive bg-[color:var(--danger-bg)] px-3 py-2 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleImport}>
              Import
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
