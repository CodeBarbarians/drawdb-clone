import { DIAGRAM_TEMPLATES } from "../lib/templates";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";

export default function TemplateGalleryModal({ open, onOpenChange, onSelect }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start from a template</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
          {DIAGRAM_TEMPLATES.map((template) => (
            <Card key={template.key} className="template-card flex flex-col gap-2 p-4">
              <h3 className="font-sans text-sm font-semibold">{template.name}</h3>
              <p className="flex-1 font-mono text-xs text-muted-foreground">{template.description}</p>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {template.tableCount} tables
              </span>
              <Button size="sm" onClick={() => onSelect(template)}>
                Use this template
              </Button>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
