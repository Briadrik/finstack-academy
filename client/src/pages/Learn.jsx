import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

// Builds a single ordered list combining the new week-based chapters
// with any legacy lessons, so the player works for both old and new courses.
function buildItems(course) {
  const chapterItems = (course.chapters || []).map(ch => ({
    kind: "chapter",
    id: ch.id,
    title: ch.title,
    week_number: ch.week_number,
    content_type: ch.content_type,
    content_url: ch.content_url,
    content_text: ch.content_text,
  }));
  const lessonItems = (course.lessons || []).map(l => ({
    kind: "lesson",
    id: l.id,
    title: l.title,
    content_type: "video",
    content_url: l.video_url,
  }));
  return [...chapterItems, ...lessonItems];
}

export default function Learn() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [completed, setCompleted] = useState([]); // array of "chapter:5" / "lesson:3" keys
  const [activeItem, setActiveItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    if (!user) return navigate("/login");
    Promise.all([
      api.get(`/courses/${id}`),
      api.get(`/enrollments/mine`),
    ]).then(([courseRes]) => {
      setCourse(courseRes.data);
      const items = buildItems(courseRes.data);
      setActiveItem(items[0] || null);

      Promise.all([
        api.get(`/enrollments/progress/${id}`),
        api.get(`/chapters/course/${id}/progress`),
      ]).then(([lessonProgress, chapterProgress]) => {
        const lessonKeys = lessonProgress.data.map(p => `lesson:${p.lesson_id}`);
        const chapterKeys = chapterProgress.data
          .filter(p => p.completed_at)
          .map(p => `chapter:${p.chapter_id}`);
        setCompleted([...lessonKeys, ...chapterKeys]);
      });
    }).finally(() => setLoading(false));
  }, [id]);

  const items = useMemo(() => (course ? buildItems(course) : []), [course]);
  const activeKey = activeItem ? `${activeItem.kind}:${activeItem.id}` : null;
  const activeIndex = items.findIndex(it => `${it.kind}:${it.id}` === activeKey);

  const markComplete = async () => {
    if (!activeItem || completed.includes(activeKey)) return;
    setMarking(true);
    try {
      if (activeItem.kind === "lesson") {
        await api.post(`/enrollments/progress/${activeItem.id}`);
      } else {
        await api.post(`/chapters/${activeItem.id}/progress`, { completed: true });
      }
      setCompleted(prev => [...prev, activeKey]);
      if (activeIndex < items.length - 1) setActiveItem(items[activeIndex + 1]);
    } finally {
      setMarking(false);
    }
  };

  if (loading) return <p style={{ padding: "32px", color: "#6b7280" }}>Loading...</p>;
  if (!course) return <p style={{ padding: "32px", color: "#dc2626" }}>Course not found.</p>;
  if (items.length === 0) return <p style={{ padding: "32px", color: "#6b7280" }}>This course doesn't have any content yet.</p>;

  const total = items.length;
  const done = completed.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isCompleted = completed.includes(activeKey);

  // Group chapter items by week for the sidebar; lessons (legacy) show under "Lessons".
  const weeks = [...new Set(items.filter(it => it.kind === "chapter").map(it => it.week_number))].sort((a, b) => a - b);
  const lessonOnlyItems = items.filter(it => it.kind === "lesson");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", minHeight: "calc(100vh - 53px)" }}>

      {/* Sidebar */}
      <div style={{ background: "white", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid #f3f4f6" }}>
          <div style={{ fontSize: "13px", fontWeight: "600", color: "#111", marginBottom: "8px", lineHeight: "1.4" }}>{course.title}</div>
          <div style={{ background: "#f3f4f6", borderRadius: "4px", height: "5px", overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#185FA5", borderRadius: "4px" }} />
          </div>
          <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "5px" }}>{done}/{total} items &middot; {pct}%</div>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          {weeks.map(week => (
            <div key={week}>
              <div style={{ padding: "10px 16px 4px", fontSize: "11px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Week {week}
              </div>
              {items.filter(it => it.kind === "chapter" && it.week_number === week).map((it, i) => (
                <SidebarRow key={`chapter:${it.id}`} item={it} index={i} isDone={completed.includes(`chapter:${it.id}`)}
                  isActive={activeKey === `chapter:${it.id}`} onClick={() => setActiveItem(it)} />
              ))}
            </div>
          ))}
          {lessonOnlyItems.length > 0 && (
            <div>
              {weeks.length > 0 && (
                <div style={{ padding: "10px 16px 4px", fontSize: "11px", fontWeight: "600", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Lessons
                </div>
              )}
              {lessonOnlyItems.map((it, i) => (
                <SidebarRow key={`lesson:${it.id}`} item={it} index={i} isDone={completed.includes(`lesson:${it.id}`)}
                  isActive={activeKey === `lesson:${it.id}`} onClick={() => setActiveItem(it)} />
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #f3f4f6", display: "flex", flexDirection: "column", gap: "8px" }}>
          <Link to={`/courses/${id}/assignments`} style={{ width: "100%", boxSizing: "border-box", textAlign: "center", background: "#EEF5FC", color: "#185FA5", padding: "8px", borderRadius: "8px", fontSize: "13px", textDecoration: "none", fontWeight: "500" }}>
            View assignments
          </Link>
          <button onClick={() => navigate("/dashboard")} style={{ width: "100%", background: "none", border: "1px solid #e5e7eb", padding: "8px", borderRadius: "8px", fontSize: "13px", color: "#6b7280", cursor: "pointer" }}>
            &larr; Back to dashboard
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ background: "#f9fafb", padding: "32px", overflowY: "auto" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>

          <div style={{ marginBottom: "8px", fontSize: "12px", color: "#9ca3af" }}>
            Item {activeIndex + 1} of {total}
          </div>
          <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#111", marginBottom: "20px" }}>
            {activeItem?.title}
          </h1>

          <ContentBlock item={activeItem} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
            <button
              onClick={() => activeIndex > 0 && setActiveItem(items[activeIndex - 1])}
              disabled={activeIndex === 0}
              style={{ background: "white", border: "1px solid #e5e7eb", padding: "9px 18px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", color: "#374151", opacity: activeIndex === 0 ? 0.4 : 1 }}>
              &larr; Previous
            </button>

            <button
              onClick={markComplete}
              disabled={isCompleted || marking}
              style={{
                background: isCompleted ? "#f0fdf4" : "#185FA5",
                color: isCompleted ? "#16a34a" : "white",
                border: isCompleted ? "1px solid #bbf7d0" : "none",
                padding: "9px 20px", borderRadius: "8px", fontSize: "13px",
                fontWeight: "500", cursor: isCompleted ? "default" : "pointer",
                opacity: marking ? 0.7 : 1,
              }}>
              {isCompleted ? "\u2713 Completed" : marking ? "Marking..." : "Mark as complete"}
            </button>

            <button
              onClick={() => activeIndex < items.length - 1 && setActiveItem(items[activeIndex + 1])}
              disabled={activeIndex === items.length - 1}
              style={{ background: "white", border: "1px solid #e5e7eb", padding: "9px 18px", borderRadius: "8px", fontSize: "13px", cursor: "pointer", color: "#374151", opacity: activeIndex === items.length - 1 ? 0.4 : 1 }}>
              Next &rarr;
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function SidebarRow({ item, index, isDone, isActive, onClick }) {
  return (
    <div onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        padding: "10px 16px", cursor: "pointer",
        background: isActive ? "#EEF5FC" : "white",
        borderLeft: isActive ? "3px solid #185FA5" : "3px solid transparent",
        borderBottom: "1px solid #f9fafb",
      }}>
      <div style={{
        width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
        background: isDone ? "#16a34a" : isActive ? "#185FA5" : "#e5e7eb",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {isDone ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5L4 7L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" /></svg>
        ) : (
          <span style={{ fontSize: "9px", color: isActive ? "white" : "#9ca3af", fontWeight: "600" }}>{index + 1}</span>
        )}
      </div>
      <span style={{ fontSize: "13px", color: isActive ? "#185FA5" : "#374151", fontWeight: isActive ? "500" : "400", lineHeight: "1.4" }}>
        {item.title}
      </span>
    </div>
  );
}

function toYouTubeEmbed(url) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|v=|embed\/)([\w-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : url;
}

function ContentBlock({ item }) {
  if (!item) return null;

  if (item.content_type === "text") {
    return (
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", fontSize: "14px", color: "#374151", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>
        {item.content_text || "No content yet."}
      </div>
    );
  }

  if (item.content_type === "link") {
    return (
      <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" }}>
        <a href={item.content_url} target="_blank" rel="noreferrer" style={{ color: "#185FA5", fontSize: "14px" }}>
          Open resource &rarr;
        </a>
      </div>
    );
  }

  if (item.content_type === "pdf") {
    return item.content_url ? (
      <iframe src={item.content_url} title={item.title} style={{ width: "100%", height: "600px", border: "1px solid #e5e7eb", borderRadius: "12px" }} />
    ) : (
      <EmptyMediaPlaceholder label="PDF" />
    );
  }

  // video / youtube (and legacy lessons, which are always "video")
  const src = item.content_type === "youtube" ? toYouTubeEmbed(item.content_url) : item.content_url;
  return (
    <div style={{ background: "#1f2937", borderRadius: "12px", aspectRatio: "16/9", display: "flex", alignItems: "center", justifyContent: "center" }}>
      {src ? (
        <iframe
          width="100%" height="100%"
          src={src}
          style={{ border: "none", borderRadius: "12px" }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <EmptyMediaPlaceholder label="Video" />
      )}
    </div>
  );
}

function EmptyMediaPlaceholder({ label }) {
  return (
    <div style={{ textAlign: "center", color: "#9ca3af", padding: "48px" }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ marginBottom: "12px" }}>
        <circle cx="24" cy="24" r="20" stroke="#4b5563" strokeWidth="2" />
        <path d="M20 16L34 24L20 32V16Z" fill="#4b5563" />
      </svg>
      <p style={{ fontSize: "14px" }}>{label} will appear here</p>
    </div>
  );
}
