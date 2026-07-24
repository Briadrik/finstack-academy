import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const STATUS_STYLES = {
  draft: { bg: "#f3f4f6", color: "#374151", label: "Draft" },
  pending_approval: { bg: "#fef9c3", color: "#854d0e", label: "Pending approval" },
  published: { bg: "#f0fdf4", color: "#16a34a", label: "Published" },
  rejected: { bg: "#fef2f2", color: "#dc2626", label: "Rejected" },
};

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/courses/mine").then(res => setCourses(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const createCourse = async () => {
    setCreating(true);
    try {
      const res = await api.post("/courses", { title: "Untitled course", description: "" });
      navigate(`/teacher/courses/${res.data.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: "600", color: "#111", marginBottom: "4px" }}>
              Welcome, {user?.name}
            </h1>
            <p style={{ fontSize: "14px", color: "#6b7280" }}>Manage your courses and content</p>
          </div>
          <button onClick={createCourse} disabled={creating}
            style={{ background: "#185FA5", color: "white", padding: "10px 18px", borderRadius: "8px", border: "none", fontSize: "14px", fontWeight: "500", cursor: "pointer", opacity: creating ? 0.7 : 1 }}>
            {creating ? "Creating..." : "+ New course"}
          </button>
        </div>

        {loading ? (
          <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading...</p>
        ) : courses.length === 0 ? (
          <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "32px", textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "14px" }}>You haven't created any courses yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {courses.map(course => {
              const s = STATUS_STYLES[course.status] || STATUS_STYLES.draft;
              return (
                <div key={course.id} onClick={() => navigate(`/teacher/courses/${course.id}`)}
                  style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px 20px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
                      <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111" }}>{course.title}</h3>
                      <span style={{ fontSize: "11px", fontWeight: "500", padding: "2px 9px", borderRadius: "20px", background: s.bg, color: s.color }}>{s.label}</span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#6b7280" }}>
                      {course.chapter_count} chapters &middot; {course.student_count} students
                    </p>
                    {course.status === "rejected" && course.rejection_reason && (
                      <p style={{ fontSize: "12px", color: "#dc2626", marginTop: "4px" }}>Reason: {course.rejection_reason}</p>
                    )}
                  </div>
                  <span style={{ fontSize: "13px", color: "#185FA5" }}>Manage &rarr;</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
