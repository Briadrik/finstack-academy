import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/enrollments/mine")
    .then(res => setEnrollments(res.data))
    .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background:"#f9fafb", minHeight:"100vh", padding:"32px 24px" }}>
      <div style={{ maxWidth:"900px", margin:"0 auto" }}>

        <h1 style={{ fontSize:"22px", fontWeight:"600", color:"#111", marginBottom:"4px" }}>
          Good morning, {user?.name}
        </h1>
        <p style={{ fontSize:"14px", color:"#6b7280", marginBottom:"28px" }}>Here's your learning progress</p>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:"12px", marginBottom:"32px" }}>
          <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:"12px", padding:"16px" }}>
            <div style={{ fontSize:"11px", color:"#6b7280", marginBottom:"4px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Enrolled</div>
            <div style={{ fontSize:"28px", fontWeight:"600", color:"#111" }}>{enrollments.length}</div>
          </div>
          <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:"12px", padding:"16px" }}>
            <div style={{ fontSize:"11px", color:"#6b7280", marginBottom:"4px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Completed</div>
            <div style={{ fontSize:"28px", fontWeight:"600", color:"#111" }}>
              {enrollments.filter(e => Number(e.total_lessons) > 0 && e.completed_lessons === e.total_lessons).length}
            </div>
          </div>
          <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:"12px", padding:"16px" }}>
            <div style={{ fontSize:"11px", color:"#6b7280", marginBottom:"4px", textTransform:"uppercase", letterSpacing:"0.05em" }}>Certificates</div>
            <div style={{ fontSize:"28px", fontWeight:"600", color:"#111" }}>0</div>
          </div>
        </div>

        <h2 style={{ fontSize:"16px", fontWeight:"600", color:"#111", marginBottom:"12px" }}>My courses</h2>

        {loading ? (
          <p style={{ color:"#6b7280", fontSize:"14px" }}>Loading...</p>
        ) : enrollments.length === 0 ? (
          <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:"12px", padding:"32px", textAlign:"center" }}>
            <p style={{ color:"#6b7280", fontSize:"14px", marginBottom:"12px" }}>You have not enrolled in any courses yet.</p>
            <button onClick={() => navigate("/")} style={{ background:"#185FA5", color:"white", padding:"8px 20px", borderRadius:"8px", border:"none", fontSize:"14px", cursor:"pointer" }}>
              Browse courses
            </button>
          </div>
        ) : (
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            {enrollments.map(course => {
              const total = Number(course.total_lessons);
              const done = Number(course.completed_lessons);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={course.id} style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:"12px", padding:"20px" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"12px" }}>
                    <div>
                      <h3 style={{ fontSize:"15px", fontWeight:"600", color:"#111", marginBottom:"4px" }}>{course.title}</h3>
                      <p style={{ fontSize:"13px", color:"#6b7280" }}>Lesson {done} of {total}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/courses/${course.id}/learn`)}
                      style={{ background:"#185FA5", color:"white", padding:"7px 16px", borderRadius:"8px", border:"none", fontSize:"13px", cursor:"pointer", whiteSpace:"nowrap" }}>
                      {done === 0 ? "Start" : pct === 100 ? "Review" : "Continue"} ?
                    </button>
                  </div>
                  <div style={{ background:"#f3f4f6", borderRadius:"4px", height:"6px", overflow:"hidden" }}>
                    <div style={{ width:`${pct}%`, height:"100%", background:"#185FA5", borderRadius:"4px", transition:"width 0.3s" }}/>
                  </div>
                  <div style={{ fontSize:"12px", color:"#9ca3af", marginTop:"6px" }}>{pct}% complete</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
