import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, Trash2, User } from "lucide-react";
import client from "../api/client";
import Logo from "../components/Logo";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  const load = async () => {
    setLoading(true);
    const { data } = await client.get("/diagrams");
    setDiagrams(data);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createDiagram = async () => {
    setCreating(true);
    try {
      const { data } = await client.post("/diagrams", {
        name: "Untitled Diagram",
        db_type: "postgresql",
        data: { tables: [], relationships: [] },
      });
      navigate(`/editor/${data.id}`);
    } finally {
      setCreating(false);
    }
  };

  const deleteDiagram = async (id) => {
    if (!confirm("Delete this diagram?")) return;
    await client.delete(`/diagrams/${id}`);
    setDiagrams((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__brand">
          <Logo size={30} />
          <h1>drawdb-clone</h1>
        </div>
        <div className="dashboard__user">
          <Button
            variant="ghost"
            size="icon"
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" title={user?.email}>
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="dashboard__toolbar">
        <Button onClick={createDiagram} disabled={creating}>
          {creating ? "Creating…" : "+ New Diagram"}
        </Button>
      </div>

      {loading ? (
        <p className="dashboard__empty">Loading…</p>
      ) : diagrams.length === 0 ? (
        <p className="dashboard__empty">No diagrams yet. Create one to get started.</p>
      ) : (
        <div className="dashboard__grid">
          {diagrams.map((d) => (
            <Card
              className="diagram-card"
              key={d.id}
              onClick={() => navigate(`/editor/${d.id}`)}
            >
              <div className="diagram-card__header">
                <h3>{d.name}</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="diagram-card__delete"
                  title="Delete diagram"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteDiagram(d.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <span className="diagram-card__badge">{d.db_type}</span>
              <p className="diagram-card__date">
                <span>Updated {new Date(d.updated_at).toLocaleDateString()}</span>
                <span className="diagram-card__time">{new Date(d.updated_at).toLocaleTimeString()}</span>
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
