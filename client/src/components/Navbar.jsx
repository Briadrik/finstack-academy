import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 24px", borderBottom:"1px solid #e5e7eb", background:"#fff" }}>
      <Link to="/" style={{ display:"flex", alignItems:"center", gap:"8px", textDecoration:"none" }}>
        <div style={{ width:"28px", height:"28px", background:"#185FA5", borderRadius:"6px", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="6" width="3" height="7" rx="1" fill="white"/><rect x="5.5" y="3" width="3" height="10" rx="1" fill="white"/><rect x="10" y="1" width="3" height="12" rx="1" fill="white"/></svg>
        </div>
        <span style={{ fontWeight:"600", fontSize:"15px", color:"#111" }}>FinStack Academy</span>
      </Link>
      <div style={{ display:"flex", gap:"16px", alignItems:"center" }}>
        {user ? (
          <>
            {user.role === "admin" && (
              <Link to="/admin" style={{ fontSize:"14px", color:"#374151", textDecoration:"none" }}>Admin</Link>
            )}
            {user.role === "teacher" && (
              <Link to="/teacher" style={{ fontSize:"14px", color:"#374151", textDecoration:"none" }}>Teach</Link>
            )}
            {user.role === "student" && (
              <Link to="/dashboard" style={{ fontSize:"14px", color:"#374151", textDecoration:"none" }}>Dashboard</Link>
            )}
            <button onClick={handleLogout} style={{ fontSize:"14px", background:"none", border:"1px solid #d1d5db", padding:"6px 14px", borderRadius:"6px", cursor:"pointer" }}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login" style={{ fontSize:"14px", color:"#374151", textDecoration:"none" }}>Login</Link>
            <Link to="/signup" style={{ fontSize:"14px", background:"#185FA5", color:"white", padding:"6px 14px", borderRadius:"6px", textDecoration:"none" }}>Sign up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
