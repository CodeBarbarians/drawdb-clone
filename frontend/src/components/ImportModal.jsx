import { useRef, useState } from "react";

import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { DB_TYPES } from "../lib/dbTypes";
import { IMPORT_FORMATS, parseImport } from "../lib/dbImport";

export default function ImportModal({ hasExistingTables, initialFormat, onImport, onClose }) {
  const [format, setFormat] = useState(initialFormat && IMPORT_FORMATS[initialFormat] ? initialFormat : "dbml");
  const [dbType, setDbType] = useState(IMPORT_FORMATS[format]?.dbType || "postgresql");
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
    if (hasExistingTables && !confirm("Importing will replace every table currently on the canvas. Continue?")) {
      return;
    }
    try {
      const model = parseImport(source, format, targetDbType);
      onImport(model, targetDbType);
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

        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
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

        <textarea
          className="modal__sql h-72 resize-none border-0 focus:outline-none"
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
          <div className="mx-4 mb-2 rounded-md border border-destructive bg-[color:var(--danger-bg)] px-3 py-2 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="modal__actions">
          <Button size="sm" onClick={handleImport}>
            Import
          </Button>
          <Button size="sm" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
