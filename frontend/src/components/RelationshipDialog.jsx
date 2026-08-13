import { useEffect, useState } from "react";

import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import {
  CARDINALITIES,
  CARDINALITY_LABELS,
  CONSTRAINTS,
  defaultRelationshipName,
  inferCardinality,
  isEffectivelyUnique,
} from "../lib/dbTypes";

export default function RelationshipDialog({ open, onOpenChange, tables, onSubmit }) {
  const [sourceTableId, setSourceTableId] = useState("");
  const [sourceColumnId, setSourceColumnId] = useState("");
  const [targetTableId, setTargetTableId] = useState("");
  const [targetColumnId, setTargetColumnId] = useState("");
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [cardinality, setCardinality] = useState("one_to_many");
  const [updateConstraint, setUpdateConstraint] = useState("No action");
  const [deleteConstraint, setDeleteConstraint] = useState("No action");

  useEffect(() => {
    if (!open) return;
    const first = tables[0]?.id || "";
    const second = tables[1]?.id || tables[0]?.id || "";
    setSourceTableId(first);
    setTargetTableId(second);
    setNameTouched(false);
    setUpdateConstraint("No action");
    setDeleteConstraint("No action");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sourceTable = tables.find((t) => t.id === sourceTableId);
  const targetTable = tables.find((t) => t.id === targetTableId);

  useEffect(() => {
    setSourceColumnId(sourceTable?.columns[0]?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceTableId, open]);

  useEffect(() => {
    setTargetColumnId(targetTable?.columns[0]?.id || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetTableId, open]);

  const sourceColumn = sourceTable?.columns.find((c) => c.id === sourceColumnId);
  const targetColumn = targetTable?.columns.find((c) => c.id === targetColumnId);

  useEffect(() => {
    if (nameTouched) return;
    setName(defaultRelationshipName(sourceTable, sourceColumn, targetTable));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceTableId, sourceColumnId, targetTableId]);

  useEffect(() => {
    if (!sourceColumn || !targetColumn) return;
    setCardinality(
      inferCardinality(isEffectivelyUnique(sourceColumn, sourceTable), isEffectivelyUnique(targetColumn, targetTable))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceColumnId, targetColumnId]);

  const canSubmit = sourceTableId && sourceColumnId && targetTableId && targetColumnId && tables.length >= 2;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      sourceTableId,
      sourceColumnId,
      targetTableId,
      targetColumnId,
      name: name || defaultRelationshipName(sourceTable, sourceColumn, targetTable),
      cardinality,
      updateConstraint,
      deleteConstraint,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Relationship</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 p-4">
          {tables.length < 2 ? (
            <p className="text-xs text-muted-foreground">You need at least two tables to create a relationship.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label>Source table</Label>
                  <Select value={sourceTableId} onValueChange={setSourceTableId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Source column</Label>
                  <Select value={sourceColumnId} onValueChange={setSourceColumnId} disabled={!sourceTable}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceTable?.columns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label>Target table</Label>
                  <Select value={targetTableId} onValueChange={setTargetTableId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>Target column</Label>
                  <Select value={targetColumnId} onValueChange={setTargetColumnId} disabled={!targetTable}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {targetTable?.columns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label>Name</Label>
                <Input
                  className="h-8 text-xs"
                  value={name}
                  onChange={(e) => {
                    setNameTouched(true);
                    setName(e.target.value);
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label>Cardinality</Label>
                <Select value={cardinality} onValueChange={setCardinality}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CARDINALITIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CARDINALITY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label>On update</Label>
                  <Select value={updateConstraint} onValueChange={setUpdateConstraint}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSTRAINTS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label>On delete</Label>
                  <Select value={deleteConstraint} onValueChange={setDeleteConstraint}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONSTRAINTS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button className="mt-1" onClick={handleSubmit} disabled={!canSubmit}>
                Create relationship
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
