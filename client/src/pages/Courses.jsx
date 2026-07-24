import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

export default function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/courses")
      .then(res => setCourses(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ background:"#f9fafb", minHeight:"100vh" }}>
      <div style={{ maxWidth:"960px", margin:"0 auto", padding:"40px 24px" }}>

        <div style={{ textAlign:"center", marginBottom:"40px" }}>
          <div style={{ display:"inline-block", background:"#E6F1FB", color:"#185FA5", fontSize:"12px", fontWeight:"500", padding:"4px 12px", borderRadius:"20px", marginBottom:"12px" }}>
            Data science · Fintech · East Africa
          </div>
          <h1 style={{ fontSize:"28px", fontWeight:"600", color:"#111", marginBottom:"10px", lineHeight:"1.3" }}>
            Learn data skills that<br/>work in the real world
          </h1>
          <p style={{ fontSize:"14px", color:"#6b7280", maxWidth:"480px", margin:"0 auto" }}>
            Practical courses built by a data professional working inside East Africa's fintech industry.
          </p>
        </div>

        {loading ? (
          <p style={{ textAlign:"center", color:"#6b7280" }}>Loading courses...</p>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:"20px" }}>
            {courses.map(course => (
              <Link to={`/courses/${course.id}`} key={course.id} style={{ textDecoration:"none" }}>
                <div style={{ background:"white", borderRadius:"12px", border:"1px solid #e5e7eb", overflow:"hidden", transition:"box-shadow 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,0.08)"}
                  onMouseLeave={e => e.currentTarget.style.boxShadow="none"}>
                  <div style={{ height:"120px", background:"#E6F1FB", display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <rect x="5" y="22" width="8" height="13" rx="2" fill="#378ADD"/>
                      <rect x="16" y="14" width="8" height="21" rx="2" fill="#185FA5"/>
                      <rect x="27" y="6" width="8" height="29" rx="2" fill="#0C447C"/>
                    </svg>
                  </div>
                  <div style={{ padding:"16px" }}>
                    <h3 style={{ fontSize:"15px", fontWeight:"600", color:"#111", marginBottom:"6px", lineHeight:"1.4" }}>{course.title}</h3>
                    <p style={{ fontSize:"13px", color:"#6b7280", marginBottom:"14px", lineHeight:"1.5" }}>{course.description}</p>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:"15px", fontWeight:"600", color:"#111" }}>KES {Number(course.price).toLocaleString()}</span>
                      <span style={{ fontSize:"12px", color:"#6b7280" }}>{course.lesson_count} lessons</span>
                    </div>
                    <div style={{ marginTop:"10px", fontSize:"12px", color:"#9ca3af" }}>By {course.instructor_name}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
