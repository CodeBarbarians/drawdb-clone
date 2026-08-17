import { useState } from "react";
import {
  ArrowLeft,
  Copy,
  Download,
  Expand,
  FilePlus,
  FolderOpen,
  Gauge,
  Info,
  Keyboard,
  Languages,
  LayoutGrid,
  Lock,
  Map as MapIcon,
  Maximize,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Redo2,
  RefreshCw,
  Ruler,
  Save,
  CheckSquare,
  Share2,
  Sun,
  Trash2,
  Undo2,
  Unlock,
  Upload,
  User,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import Logo from "./Logo";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import MobileCommandMenu from "./MobileCommandMenu";
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
  onReflectDatabase,
  onExportSQL,
  onExportJSON,
  onExportDBML,
  onExportImage,
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
  const fileItems = (
    <>
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
          <DropdownMenuItem onClick={onReflectDatabase}>Database connection…</DropdownMenuItem>
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
          <DropdownMenuItem onClick={() => onExportImage("png")}>PNG</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExportImage("svg")}>SVG</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onExportImage("pdf")}>PDF</DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    </>
  );

  const editItems = (
    <>
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
    </>
  );

  const viewItems = (
    <>
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
    </>
  );

  const settingsItems = (
    <>
      <DropdownMenuItem onClick={onToggleAutoSave}>{autoSave ? "Disable" : "Enable"} autosave</DropdownMenuItem>
      <DropdownMenuItem onClick={onShowZoomSettings}>Zoom speed…</DropdownMenuItem>
      <DropdownMenuItem onClick={onShowTableWidthSettings}>Table width…</DropdownMenuItem>
      <DropdownMenuItem disabled>Language</DropdownMenuItem>
    </>
  );

  const helpItems = (
    <>
      <DropdownMenuItem onClick={onShowShortcuts}>Keyboard shortcuts</DropdownMenuItem>
      <DropdownMenuItem onClick={onShowAbout}>About</DropdownMenuItem>
    </>
  );

  const [showCommandMenu, setShowCommandMenu] = useState(false);

  const commandGroups = [
    {
      label: "File",
      items: [
        { id: "new", label: "New diagram", icon: FilePlus, onSelect: onNew },
        { id: "open", label: "Open…", icon: FolderOpen, onSelect: onBack },
        { id: "save", label: "Save", icon: Save, shortcut: "Ctrl+S", onSelect: onSave },
        { id: "save-as", label: "Save as…", icon: Copy, onSelect: onSaveAs },
        ...(isOwner
          ? [{ id: "delete-diagram", label: "Delete diagram", icon: Trash2, danger: true, onSelect: onDeleteDiagram }]
          : []),
        { id: "import-dbml", label: "Import DBML", icon: Upload, onSelect: () => onImportFormat("dbml") },
        { id: "import-json", label: "Import JSON", icon: Upload, onSelect: () => onImportFormat("json") },
        { id: "import-db", label: "Import database connection…", icon: Upload, onSelect: onReflectDatabase },
        ...IMPORT_SQL_DIALECTS.map((d) => ({
          id: `import-sql-${d.key}`,
          label: `Import SQL (${d.label})`,
          icon: Upload,
          disabled: !d.enabled,
          onSelect: () => onImportFormat(d.key),
        })),
        ...SQL_DIALECTS.map((d) => ({
          id: `export-sql-${d.key}`,
          label: `Export SQL (${d.label})`,
          icon: Download,
          onSelect: () => onExportSQL(d.key),
        })),
        { id: "export-json", label: "Export JSON", icon: Download, onSelect: onExportJSON },
        { id: "export-dbml", label: "Export DBML", icon: Download, onSelect: onExportDBML },
        { id: "export-png", label: "Export PNG", icon: Download, onSelect: () => onExportImage("png") },
        { id: "export-svg", label: "Export SVG", icon: Download, onSelect: () => onExportImage("svg") },
        { id: "export-pdf", label: "Export PDF", icon: Download, onSelect: () => onExportImage("pdf") },
      ],
    },
    {
      label: "Edit",
      items: [
        { id: "undo", label: "Undo", icon: Undo2, shortcut: "Ctrl+Z", disabled: !canUndo, onSelect: onUndo },
        { id: "redo", label: "Redo", icon: Redo2, shortcut: "Ctrl+Shift+Z", disabled: !canRedo, onSelect: onRedo },
        { id: "duplicate", label: "Duplicate selected table", icon: Copy, onSelect: onDuplicateSelected },
        { id: "delete-selected", label: "Delete selected", icon: Trash2, danger: true, onSelect: onDeleteSelected },
        { id: "select-all", label: "Select all tables", icon: CheckSquare, onSelect: onSelectAll },
      ],
    },
    {
      label: "View",
      items: [
        { id: "zoom-in", label: "Zoom in", icon: ZoomIn, onSelect: onZoomIn },
        { id: "zoom-out", label: "Zoom out", icon: ZoomOut, onSelect: onZoomOut },
        { id: "reset-zoom", label: "Reset zoom", icon: Maximize, onSelect: onFitView },
        { id: "fullscreen", label: "Toggle fullscreen", icon: Expand, onSelect: onToggleFullscreen },
        { id: "grid", label: `${showGrid ? "Hide" : "Show"} grid`, icon: LayoutGrid, onSelect: onToggleGrid },
        { id: "minimap", label: `${showMiniMap ? "Hide" : "Show"} minimap`, icon: MapIcon, onSelect: onToggleMiniMap },
        { id: "sidebar", label: `${showSidebar ? "Hide" : "Show"} sidebar`, icon: PanelLeftOpen, onSelect: onToggleSidebar },
        {
          id: "sidebar-detach",
          label: `${sidebarDetached ? "Dock" : "Detach"} sidebar`,
          icon: PanelLeftClose,
          disabled: !showSidebar,
          onSelect: onToggleSidebarDetached,
        },
        { id: "auto-arrange", label: "Auto arrange", icon: Wand2, onSelect: onAutoArrange },
        {
          id: "lock-all",
          label: `${globalLocked ? "Unlock" : "Lock"} all tables`,
          icon: globalLocked ? Unlock : Lock,
          onSelect: onToggleGlobalLock,
        },
        {
          id: "theme",
          label: `Switch to ${theme === "dark" ? "light" : "dark"} theme`,
          icon: theme === "dark" ? Sun : Moon,
          onSelect: onToggleTheme,
        },
      ],
    },
    {
      label: "Settings",
      items: [
        {
          id: "autosave",
          label: `${autoSave ? "Disable" : "Enable"} autosave`,
          icon: RefreshCw,
          onSelect: onToggleAutoSave,
        },
        { id: "zoom-speed", label: "Zoom speed…", icon: Gauge, onSelect: onShowZoomSettings },
        { id: "table-width", label: "Table width…", icon: Ruler, onSelect: onShowTableWidthSettings },
        { id: "language", label: "Language", icon: Languages, disabled: true, onSelect: () => {} },
      ],
    },
    {
      label: "Help",
      items: [
        { id: "shortcuts", label: "Keyboard shortcuts", icon: Keyboard, onSelect: onShowShortcuts },
        { id: "about", label: "About", icon: Info, onSelect: onShowAbout },
      ],
    },
  ];

  return (
    <div className="flex flex-col border-b border-border bg-[color:var(--bg-elevated)]">
      <div className="flex items-center gap-2 px-3 py-2 md:gap-3 md:px-4">
        <div className="hidden md:block">
          <Logo size={24} />
        </div>
        <button
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          title={!showSidebar ? "Show sidebar" : sidebarDetached ? "Hide sidebar" : "Detach sidebar"}
          onClick={onCycleSidebar}
        >
          {showSidebar ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>
        <button
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
          title="Back to diagrams"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          className="hidden font-mono text-xs text-muted-foreground hover:text-[color:var(--accent-hover)] md:inline"
          onClick={onBack}
        >
          Diagrams
        </button>
        <span className="hidden text-muted-foreground md:inline">/</span>
        <Input
          value={diagramName}
          onChange={(e) => onNameChange(e.target.value)}
          className="h-7 min-w-0 flex-1 border-transparent bg-transparent px-1 font-sans text-sm font-semibold shadow-none hover:border-border md:w-56 md:flex-none"
        />
        {collaboratorBadge}
        <div className="hidden flex-1 md:block" />
        {isOwner && (
          <Button size="sm" variant="outline" className="gap-1.5 px-2 md:px-3" onClick={onShare}>
            <Share2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Share</span>
          </Button>
        )}
        <button
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          className="rounded p-1 text-muted-foreground outline-none hover:bg-accent hover:text-foreground md:hidden"
          title="Menu"
          onClick={() => setShowCommandMenu(true)}
        >
          <Menu className="h-4 w-4" />
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

      <div className="hidden items-center gap-1 px-3 py-1 md:flex">
        <MenuButton label="File">{fileItems}</MenuButton>
        <MenuButton label="Edit">{editItems}</MenuButton>
        <MenuButton label="View">{viewItems}</MenuButton>
        <MenuButton label="Settings">{settingsItems}</MenuButton>
        <MenuButton label="Help">{helpItems}</MenuButton>
        <div className="flex-1" />
        {savedAt && <span className="font-mono text-[11px] text-[color:var(--success)]">Saved {savedAt}</span>}
        <Button size="sm" variant="ghost" className="h-6 gap-1.5 px-2" onClick={onSave} disabled={saving}>
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
      <MobileCommandMenu
        open={showCommandMenu}
        onClose={() => setShowCommandMenu(false)}
        groups={commandGroups}
        savedAt={savedAt}
      />
    </div>
  );
}
