import { useState } from "react";

import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

export default function ExportModal({ sql, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const download = () => {
    const blob = new Blob([sql], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "schema.sql";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export SQL</DialogTitle>
        </DialogHeader>
        <pre className="modal__sql">{sql}</pre>
        <div className="modal__actions">
          <Button size="sm" onClick={copy}>
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button size="sm" variant="outline" onClick={download}>
            Download .sql
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
