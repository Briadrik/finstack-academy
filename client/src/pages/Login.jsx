import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", form);
      login(res.data.token, res.data.user);
      const role = res.data.user.role;
      navigate(role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    }
  };

  return (
    <div style={{ minHeight:"80vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f9fafb" }}>
      <div style={{ background:"white", padding:"32px", borderRadius:"12px", border:"1px solid #e5e7eb", width:"100%", maxWidth:"400px" }}>
        <h2 style={{ fontSize:"20px", fontWeight:"600", marginBottom:"4px" }}>Welcome back</h2>
        <p style={{ fontSize:"14px", color:"#6b7280", marginBottom:"24px" }}>Log in to your FinStack account</p>
        {error && <div style={{ background:"#fef2f2", color:"#dc2626", padding:"10px", borderRadius:"6px", fontSize:"13px", marginBottom:"16px" }}>{error}</div>}
        <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
          <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} style={{ padding:"10px 12px", border:"1px solid #d1d5db", borderRadius:"8px", fontSize:"14px" }} />
          <input placeholder="Password" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} style={{ padding:"10px 12px", border:"1px solid #d1d5db", borderRadius:"8px", fontSize:"14px" }} />
          <button onClick={handleSubmit} style={{ background:"#185FA5", color:"white", padding:"10px", borderRadius:"8px", border:"none", fontSize:"14px", fontWeight:"500", cursor:"pointer" }}>Log in</button>
        </div>
        <p style={{ fontSize:"13px", color:"#6b7280", marginTop:"16px", textAlign:"center" }}>No account yet? <Link to="/signup" style={{ color:"#185FA5" }}>Sign up</Link></p>
      </div>
    </div>
  );
}
