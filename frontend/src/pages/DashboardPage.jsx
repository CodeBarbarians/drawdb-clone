import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../api/client";
import Logo from "../components/Logo";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
          <span>{user?.email}</span>
          <Button variant="outline" size="sm" onClick={logout}>
            Logout
          </Button>
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
              <h3>{d.name}</h3>
              <p>{d.db_type}</p>
              <p className="diagram-card__date">Updated {new Date(d.updated_at).toLocaleString()}</p>
              <Button
                variant="destructive"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteDiagram(d.id);
                }}
              >
                Delete
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
