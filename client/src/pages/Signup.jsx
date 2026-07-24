import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/signup", form);
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === "teacher" ? "/teacher" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  };

  return (
    <div style={{ minHeight:"80vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f9fafb" }}>
      <div style={{ background:"white", padding:"32px", borderRadius:"12px", border:"1px solid #e5e7eb", width:"100%", maxWidth:"400px" }}>
        <h2 style={{ fontSize:"20px", fontWeight:"600", marginBottom:"4px" }}>Create your account</h2>
        <p style={{ fontSize:"14px", color:"#6b7280", marginBottom:"24px" }}>Start learning fintech data skills</p>
        {error && <div style={{ background:"#fef2f2", color:"#dc2626", padding:"10px", borderRadius:"6px", fontSize:"13px", marginBottom:"16px" }}>{error}</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          <input placeholder="Full name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={{ padding:"10px 12px", border:"1px solid #d1d5db", borderRadius:"8px", fontSize:"14px" }} />
          <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ padding:"10px 12px", border:"1px solid #d1d5db", borderRadius:"8px", fontSize:"14px" }} />
          <input placeholder="Password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{ padding:"10px 12px", border:"1px solid #d1d5db", borderRadius:"8px", fontSize:"14px" }} />
          <div style={{ display:"flex", gap:"8px" }}>
            <button type="button" onClick={() => setForm({...form, role: "student"})}
              style={{ flex:1, padding:"9px", borderRadius:"8px", fontSize:"13px", cursor:"pointer",
                border: form.role === "student" ? "1.5px solid #185FA5" : "1px solid #d1d5db",
                background: form.role === "student" ? "#EEF5FC" : "white",
                color: form.role === "student" ? "#185FA5" : "#374151", fontWeight:"500" }}>
              I'm a student
            </button>
            <button type="button" onClick={() => setForm({...form, role: "teacher"})}
              style={{ flex:1, padding:"9px", borderRadius:"8px", fontSize:"13px", cursor:"pointer",
                border: form.role === "teacher" ? "1.5px solid #185FA5" : "1px solid #d1d5db",
                background: form.role === "teacher" ? "#EEF5FC" : "white",
                color: form.role === "teacher" ? "#185FA5" : "#374151", fontWeight:"500" }}>
              I'm a teacher
            </button>
          </div>
          <button onClick={handleSubmit} style={{ background:"#185FA5", color:"white", padding:"10px", borderRadius:"8px", border:"none", fontSize:"14px", fontWeight:"500", cursor:"pointer" }}>Create account</button>
        </div>
        <p style={{ fontSize:"13px", color:"#6b7280", marginTop:"16px", textAlign:"center" }}>Already have an account? <Link to="/login" style={{ color:"#185FA5" }}>Log in</Link></p>
      </div>
    </div>
  );
}
