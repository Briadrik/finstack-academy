import { useEffect, useState } from "react";
import api from "../lib/api";

const card = { background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px 20px" };
const btn = (variant = "primary") => ({
  padding: "7px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer",
  border: variant === "primary" ? "none" : "1px solid #d1d5db",
  background: variant === "primary" ? "#185FA5" : variant === "danger" ? "#fef2f2" : "white",
  color: variant === "primary" ? "white" : variant === "danger" ? "#dc2626" : "#374151",
});

export default function AdminDashboard() {
  const [tab, setTab] = useState("Approvals");

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "22px", fontWeight: "600", color: "#111", marginBottom: "20px" }}>Admin</h1>
        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", borderBottom: "1px solid #e5e7eb" }}>
          {["Approvals", "Users"].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: "10px 16px", fontSize: "13px", fontWeight: "500", cursor: "pointer", background: "none",
                border: "none", borderBottom: tab === t ? "2px solid #185FA5" : "2px solid transparent",
                color: tab === t ? "#185FA5" : "#6b7280" }}>
              {t}
            </button>
          ))}
        </div>
        {tab === "Approvals" ? <ApprovalsTab /> : <UsersTab />}
      </div>
    </div>
  );
}

function ApprovalsTab() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reasonDrafts, setReasonDrafts] = useState({});

  const load = () => {
    setLoading(true);
    api.get("/admin/courses/pending").then(res => setPending(res.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const approve = async (id) => {
    await api.post(`/admin/courses/${id}/approve`);
    load();
  };
  const reject = async (id) => {
    await api.post(`/admin/courses/${id}/reject`, { reason: reasonDrafts[id] || "Needs revision" });
    load();
  };

  if (loading) return <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading...</p>;
  if (pending.length === 0) return <p style={{ color: "#6b7280", fontSize: "14px" }}>No courses awaiting approval.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {pending.map(c => (
        <div key={c.id} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>{c.title}</h3>
              <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>By {c.instructor_name} ({c.instructor_email})</p>
              <p style={{ fontSize: "13px", color: "#374151", marginTop: "8px" }}>{c.description}</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <button onClick={() => approve(c.id)} style={btn("primary")}>Approve</button>
            <input placeholder="Rejection reason (optional)" style={{ flex: 1, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px" }}
              onChange={e => setReasonDrafts({ ...reasonDrafts, [c.id]: e.target.value })} />
            <button onClick={() => reject(c.id)} style={btn("danger")}>Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    api.get("/admin/users").then(res => setUsers(res.data)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const changeRole = async (id, role) => {
    await api.patch(`/admin/users/${id}/role`, { role });
    load();
  };

  if (loading) return <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading...</p>;

  return (
    <div style={{ ...card, padding: 0, overflow: "hidden" }}>
      {users.map((u, i) => (
        <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: i < users.length - 1 ? "1px solid #f3f4f6" : "none" }}>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "500", color: "#111" }}>{u.name}</div>
            <div style={{ fontSize: "12px", color: "#9ca3af" }}>{u.email}</div>
          </div>
          <select value={u.role} onChange={e => changeRole(u.id, e.target.value)}
            style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "13px" }}>
            <option value="student">student</option>
            <option value="teacher">teacher</option>
            <option value="admin">admin</option>
          </select>
        </div>
      ))}
    </div>
  );
}
