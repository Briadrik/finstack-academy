import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function CourseDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get(`/courses/${id}`)
      .then(res => setCourse(res.data))
      .finally(() => setLoading(false));
  }, [id]);

  const handleEnroll = async () => {
    if (!user) return navigate("/signup");
    setEnrolling(true);
    try {
      await api.post(`/enrollments/${id}`);
      setEnrolled(true);
      setMessage("You are enrolled! Go to your dashboard to start learning.");
    } catch (err) {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) return <p style={{ padding:"32px", color:"#6b7280" }}>Loading...</p>;
  if (!course) return <p style={{ padding:"32px", color:"#dc2626" }}>Course not found.</p>;

  return (
    <div style={{ background:"#f9fafb", minHeight:"100vh", padding:"32px 24px" }}>
      <div style={{ maxWidth:"960px", margin:"0 auto", display:"grid", gridTemplateColumns:"1fr 300px", gap:"24px", alignItems:"start" }}>

        <div>
          <div style={{ background:"#E6F1FB", height:"200px", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"20px" }}>
            <svg width="56" height="56" viewBox="0 0 40 40" fill="none">
              <rect x="5" y="22" width="8" height="13" rx="2" fill="#378ADD"/>
              <rect x="16" y="14" width="8" height="21" rx="2" fill="#185FA5"/>
              <rect x="27" y="6" width="8" height="29" rx="2" fill="#0C447C"/>
            </svg>
          </div>
          <h1 style={{ fontSize:"22px", fontWeight:"600", color:"#111", marginBottom:"8px" }}>{course.title}</h1>
          <p style={{ fontSize:"14px", color:"#6b7280", lineHeight:"1.7", marginBottom:"16px" }}>{course.description}</p>
          <div style={{ fontSize:"13px", color:"#9ca3af", marginBottom:"24px" }}>By {course.instructor_name}</div>

          <h2 style={{ fontSize:"16px", fontWeight:"600", color:"#111", marginBottom:"12px" }}>Course lessons</h2>
          <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:"12px", overflow:"hidden" }}>
            {course.lessons.map((lesson, i) => (
              <div key={lesson.id} style={{ display:"flex", alignItems:"center", gap:"12px", padding:"12px 16px", borderBottom: i < course.lessons.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                <div style={{ width:"24px", height:"24px", borderRadius:"50%", background:"#E6F1FB", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M2 1.5L6.5 4L2 6.5V1.5Z" fill="#185FA5"/></svg>
                </div>
                <span style={{ fontSize:"14px", color:"#374151" }}>{lesson.title}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position:"sticky", top:"24px" }}>
          <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:"12px", padding:"20px" }}>
            <div style={{ fontSize:"26px", fontWeight:"600", color:"#111", marginBottom:"4px" }}>KES {Number(course.price).toLocaleString()}</div>
            <div style={{ fontSize:"12px", color:"#6b7280", marginBottom:"20px" }}>One-time payment · Lifetime access</div>

            {message && (
              <div style={{ background: enrolled ? "#f0fdf4" : "#fef2f2", color: enrolled ? "#16a34a" : "#dc2626", padding:"10px", borderRadius:"8px", fontSize:"13px", marginBottom:"12px" }}>
                {message}
              </div>
            )}

            <button
              onClick={enrolled ? () => navigate("/dashboard") : handleEnroll}
              disabled={enrolling}
              style={{ width:"100%", background: enrolled ? "#16a34a" : "#185FA5", color:"white", padding:"12px", borderRadius:"8px", border:"none", fontSize:"14px", fontWeight:"500", cursor:"pointer", marginBottom:"10px", opacity: enrolling ? 0.7 : 1 }}>
              {enrolling ? "Enrolling..." : enrolled ? "Go to dashboard →" : user ? "Enroll now" : "Sign up to enroll"}
            </button>

            <div style={{ fontSize:"12px", color:"#6b7280", marginBottom:"16px", textAlign:"center" }}>M-Pesa payment coming soon</div>
            <div style={{ display:"flex", flexDirection:"column", gap:"8px", fontSize:"13px", color:"#374151" }}>
              <div>&bull; {course.lessons.length} lessons</div>
              <div>&bull; Lifetime access</div>
              <div>&bull; Certificate of completion</div>
              <div>&bull; Built for East Africa</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
