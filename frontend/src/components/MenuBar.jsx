import Logo from "./Logo";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const SQL_DIALECTS = [
  { key: "postgresql", label: "PostgreSQL" },
  { key: "mysql", label: "MySQL" },
  { key: "sqlite", label: "SQLite" },
];

const IMPORT_SQL_DIALECTS = [
  { key: "mysql", label: "MySQL", enabled: true },
  { key: "postgres", label: "PostgreSQL", enabled: true },
  { key: "mssql", label: "SQL Server", enabled: true },
  { key: "sqlite", label: "SQLite", enabled: false },
  { key: "mariadb", label: "MariaDB", enabled: false },
  { key: "oracle", label: "Oracle", enabled: false },
];

function MenuButton({ label, children }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-sm px-2 py-1 font-mono text-xs text-muted-foreground outline-none hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground">
        {label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function MenuBar({
  diagramName,
  onNameChange,
  savedAt,
  onBack,
  onNew,
  onSave,
  onSaveAs,
  onDeleteDiagram,
  onImportFormat,
  onExportSQL,
  onExportJSON,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onDeleteSelected,
  onDuplicateSelected,
  onSelectAll,
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleFullscreen,
  showGrid,
  onToggleGrid,
  showMiniMap,
  onToggleMiniMap,
  theme,
  onToggleTheme,
  autoSave,
  onToggleAutoSave,
  onShowShortcuts,
  onShowAbout,
}) {
  return (
    <div className="flex flex-col border-b border-border bg-[color:var(--bg-elevated)]">
      <div className="flex items-center gap-3 px-4 py-2">
        <Logo size={24} />
        <button className="font-mono text-xs text-muted-foreground hover:text-[color:var(--accent-hover)]" onClick={onBack}>
          Diagrams
        </button>
        <span className="text-muted-foreground">/</span>
        <Input
          value={diagramName}
          onChange={(e) => onNameChange(e.target.value)}
          className="h-7 w-56 border-transparent bg-transparent px-1 font-sans text-sm font-semibold shadow-none hover:border-border"
        />
        {savedAt && <span className="font-mono text-[11px] text-[color:var(--success)]">Saved {savedAt}</span>}
      </div>

      <div className="flex items-center gap-1 px-3 py-1">
        <MenuButton label="File">
          <DropdownMenuItem onClick={onNew}>New</DropdownMenuItem>
          <DropdownMenuItem onClick={onBack}>Open…</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSave}>
            Save
            <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onSaveAs}>Save as…</DropdownMenuItem>
          <DropdownMenuItem disabled>Save as template</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive" onClick={onDeleteDiagram}>
            Delete diagram
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Import from</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onImportFormat("dbml")}>DBML</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onImportFormat("json")}>JSON</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Import from SQL</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {IMPORT_SQL_DIALECTS.map((d) => (
                <DropdownMenuItem key={d.key} disabled={!d.enabled} onClick={() => onImportFormat(d.key)}>
                  {d.label}
                  {!d.enabled && <DropdownMenuShortcut>N/A</DropdownMenuShortcut>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Export SQL</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {SQL_DIALECTS.map((d) => (
                <DropdownMenuItem key={d.key} onClick={() => onExportSQL(d.key)}>
                  {d.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Export as</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={onExportJSON}>JSON</DropdownMenuItem>
              <DropdownMenuItem disabled>PNG</DropdownMenuItem>
              <DropdownMenuItem disabled>SVG</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </MenuButton>

        <MenuButton label="Edit">
          <DropdownMenuItem disabled={!canUndo} onClick={onUndo}>
            Undo
            <DropdownMenuShortcut>Ctrl+Z</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canRedo} onClick={onRedo}>
            Redo
            <DropdownMenuShortcut>Ctrl+Shift+Z</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDuplicateSelected}>Duplicate selected table</DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={onDeleteSelected}>
            Delete selected
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSelectAll}>Select all tables</DropdownMenuItem>
        </MenuButton>

        <MenuButton label="View">
          <DropdownMenuItem onClick={onZoomIn}>Zoom in</DropdownMenuItem>
          <DropdownMenuItem onClick={onZoomOut}>Zoom out</DropdownMenuItem>
          <DropdownMenuItem onClick={onFitView}>Reset zoom</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onToggleFullscreen}>Toggle fullscreen</DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleGrid}>{showGrid ? "Hide" : "Show"} grid</DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleMiniMap}>{showMiniMap ? "Hide" : "Show"} minimap</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onToggleTheme}>
            Switch to {theme === "dark" ? "light" : "dark"} theme
          </DropdownMenuItem>
        </MenuButton>

        <MenuButton label="Settings">
          <DropdownMenuItem onClick={onToggleAutoSave}>{autoSave ? "Disable" : "Enable"} autosave</DropdownMenuItem>
          <DropdownMenuItem disabled>Table width</DropdownMenuItem>
          <DropdownMenuItem disabled>Language</DropdownMenuItem>
        </MenuButton>

        <MenuButton label="Help">
          <DropdownMenuItem onClick={onShowShortcuts}>Keyboard shortcuts</DropdownMenuItem>
          <DropdownMenuItem onClick={onShowAbout}>About</DropdownMenuItem>
        </MenuButton>
      </div>
    </div>
  );
}
