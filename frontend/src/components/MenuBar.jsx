import { Moon, PanelLeftClose, PanelLeftOpen, Save, Share2, Sun, User } from "lucide-react";

import Logo from "./Logo";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
  { key: "mariadb", label: "MariaDB" },
  { key: "mssql", label: "SQL Server" },
  { key: "oracle", label: "Oracle" },
];

const IMPORT_SQL_DIALECTS = [
  { key: "mysql", label: "MySQL", enabled: true },
  { key: "postgres", label: "PostgreSQL", enabled: true },
  { key: "mssql", label: "SQL Server", enabled: true },
  { key: "mariadb", label: "MariaDB", enabled: true },
  { key: "sqlite", label: "SQLite", enabled: false },
  // dbml-core (the parser this app uses for SQL imports) has no Oracle
  // grammar — only DBML/JSON round-trips work for Oracle-dialect diagrams.
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
  saving,
  onBack,
  onNew,
  onSave,
  onSaveAs,
  onDeleteDiagram,
  onImportFormat,
  onExportSQL,
  onExportJSON,
  onExportDBML,
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
  showSidebar,
  onToggleSidebar,
  sidebarDetached,
  onToggleSidebarDetached,
  onCycleSidebar,
  theme,
  onToggleTheme,
  autoSave,
  onToggleAutoSave,
  onShowZoomSettings,
  onShowTableWidthSettings,
  onAutoArrange,
  globalLocked,
  onToggleGlobalLock,
  onShowShortcuts,
  onShowAbout,
  onShare,
  isOwner = true,
  collaboratorBadge,
  user,
  onShowProfile,
  onLogout,
}) {
  return (
    <div className="flex flex-col border-b border-border bg-[color:var(--bg-elevated)]">
      <div className="flex items-center gap-3 px-4 py-2">
        <Logo size={24} />
        <button
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          title={!showSidebar ? "Show sidebar" : sidebarDetached ? "Hide sidebar" : "Detach sidebar"}
          onClick={onCycleSidebar}
        >
          {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>
        <button className="font-mono text-xs text-muted-foreground hover:text-[color:var(--accent-hover)]" onClick={onBack}>
          Diagrams
        </button>
        <span className="text-muted-foreground">/</span>
        <Input
          value={diagramName}
          onChange={(e) => onNameChange(e.target.value)}
          className="h-7 w-56 border-transparent bg-transparent px-1 font-sans text-sm font-semibold shadow-none hover:border-border"
        />
        {collaboratorBadge}
        <div className="flex-1" />
        {isOwner && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onShare}>
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
        )}
        <button
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="rounded p-1 text-muted-foreground outline-none hover:bg-accent hover:text-foreground data-[state=open]:bg-accent data-[state=open]:text-foreground"
              title={user?.username || user?.email}
            >
              <User className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" showArrow>
            <DropdownMenuLabel className="flex flex-col gap-0.5 normal-case tracking-normal">
              <span className="truncate font-sans text-xs font-semibold text-foreground">{user?.username || user?.email}</span>
              {user?.username && <span className="truncate text-[9px] text-muted-foreground">{user.email}</span>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onShowProfile}>Profile</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout}>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
          {isOwner && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDeleteDiagram}>
                Delete diagram
              </DropdownMenuItem>
            </>
          )}
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
              <DropdownMenuItem onClick={onExportDBML}>DBML</DropdownMenuItem>
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
          <DropdownMenuItem onClick={onToggleSidebar}>{showSidebar ? "Hide" : "Show"} sidebar</DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleSidebarDetached} disabled={!showSidebar}>
            {sidebarDetached ? "Dock" : "Detach"} sidebar
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onAutoArrange}>Auto arrange</DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleGlobalLock}>{globalLocked ? "Unlock" : "Lock"} all tables</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onToggleTheme}>
            Switch to {theme === "dark" ? "light" : "dark"} theme
          </DropdownMenuItem>
        </MenuButton>

        <MenuButton label="Settings">
          <DropdownMenuItem onClick={onToggleAutoSave}>{autoSave ? "Disable" : "Enable"} autosave</DropdownMenuItem>
          <DropdownMenuItem onClick={onShowZoomSettings}>Zoom speed…</DropdownMenuItem>
          <DropdownMenuItem onClick={onShowTableWidthSettings}>Table width…</DropdownMenuItem>
          <DropdownMenuItem disabled>Language</DropdownMenuItem>
        </MenuButton>

        <MenuButton label="Help">
          <DropdownMenuItem onClick={onShowShortcuts}>Keyboard shortcuts</DropdownMenuItem>
          <DropdownMenuItem onClick={onShowAbout}>About</DropdownMenuItem>
        </MenuButton>
        <div className="flex-1" />
        {savedAt && <span className="font-mono text-[11px] text-[color:var(--success)]">Saved {savedAt}</span>}
        <Button size="sm" variant="ghost" className="h-6 gap-1.5 px-2" onClick={onSave} disabled={saving}>
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
