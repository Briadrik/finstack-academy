import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";

const CONTENT_TYPES = ["text", "video", "youtube", "pdf", "slide", "link"];
const TABS = ["Details", "Chapters", "Assignments", "Groups"];

const card = { background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px" };
const input = { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" };
const label = { fontSize: "12px", fontWeight: "500", color: "#374151", marginBottom: "4px", display: "block" };
const btn = (variant = "primary") => ({
  padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer",
  border: variant === "primary" ? "none" : "1px solid #d1d5db",
  background: variant === "primary" ? "#185FA5" : variant === "danger" ? "#fef2f2" : "white",
  color: variant === "primary" ? "white" : variant === "danger" ? "#dc2626" : "#374151",
});

export default function CourseBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("Details");
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = () => {
    setLoading(true);
    api.get(`/courses/${id}`).then(res => setCourse(res.data)).finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  if (loading) return <p style={{ padding: "32px", color: "#6b7280" }}>Loading...</p>;
  if (!course) return <p style={{ padding: "32px", color: "#dc2626" }}>Course not found.</p>;

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <button onClick={() => navigate("/teacher")} style={{ ...btn("secondary"), marginBottom: "16px" }}>&larr; Back to my courses</button>

        {msg && <div style={{ background: "#EEF5FC", color: "#185FA5", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "16px" }}>{msg}</div>}

        <div style={{ display: "flex", gap: "6px", marginBottom: "20px", borderBottom: "1px solid #e5e7eb" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                padding: "10px 16px", fontSize: "13px", fontWeight: "500", cursor: "pointer", background: "none",
                border: "none", borderBottom: tab === t ? "2px solid #185FA5" : "2px solid transparent",
                color: tab === t ? "#185FA5" : "#6b7280",
              }}>
              {t}
            </button>
          ))}
        </div>

        {tab === "Details" && <DetailsTab course={course} onSaved={load} setMsg={setMsg} />}
        {tab === "Chapters" && <ChaptersTab courseId={id} />}
        {tab === "Assignments" && <AssignmentsTab courseId={id} />}
        {tab === "Groups" && <GroupsTab courseId={id} />}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = {
    draft: { bg: "#f3f4f6", color: "#374151", label: "Draft" },
    pending_approval: { bg: "#fef9c3", color: "#854d0e", label: "Pending approval" },
    published: { bg: "#f0fdf4", color: "#16a34a", label: "Published" },
    rejected: { bg: "#fef2f2", color: "#dc2626", label: "Rejected" },
  }[status] || { bg: "#f3f4f6", color: "#374151", label: status };
  return <span style={{ fontSize: "11px", fontWeight: "500", padding: "3px 10px", borderRadius: "20px", background: s.bg, color: s.color }}>{s.label}</span>;
}

function DetailsTab({ course, onSaved, setMsg }) {
  const [form, setForm] = useState({
    title: course.title, description: course.description || "",
    price: course.price, thumbnail_url: course.thumbnail_url || "",
  });
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/courses/${course.id}`, form);
      setMsg("Saved.");
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const submitForApproval = async () => {
    setSubmitting(true);
    try {
      await api.post(`/courses/${course.id}/submit`);
      setMsg("Submitted for admin approval.");
      onSaved();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ ...card, display: "flex", flexDirection: "column", gap: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#111" }}>Course details</h2>
        <StatusBadge status={course.status} />
      </div>
      {course.status === "rejected" && course.rejection_reason && (
        <div style={{ background: "#fef2f2", color: "#dc2626", padding: "10px 14px", borderRadius: "8px", fontSize: "13px" }}>
          Rejected: {course.rejection_reason}
        </div>
      )}
      <div>
        <label style={label}>Title</label>
        <input style={input} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
      </div>
      <div>
        <label style={label}>Description</label>
        <textarea style={{ ...input, minHeight: "90px", fontFamily: "inherit" }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
      </div>
      <div style={{ display: "flex", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <label style={label}>Price (KES)</label>
          <input type="number" style={input} value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
        </div>
        <div style={{ flex: 2 }}>
          <label style={label}>Thumbnail URL</label>
          <input style={input} value={form.thumbnail_url} onChange={e => setForm({ ...form, thumbnail_url: e.target.value })} />
        </div>
      </div>
      <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
        <button onClick={save} disabled={saving} style={btn("primary")}>{saving ? "Saving..." : "Save changes"}</button>
        {["draft", "rejected"].includes(course.status) && (
          <button onClick={submitForApproval} disabled={submitting} style={btn("secondary")}>
            {submitting ? "Submitting..." : "Submit for approval"}
          </button>
        )}
      </div>
    </div>
  );
}

function ChaptersTab({ courseId }) {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", week_number: 1, content_type: "text", content_url: "", content_text: "" });
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/chapters/course/${courseId}`).then(res => setChapters(res.data)).finally(() => setLoading(false));
  };
  useEffect(load, [courseId]);

  const addChapter = async () => {
    if (!form.title) return;
    setAdding(true);
    try {
      await api.post(`/chapters/course/${courseId}`, form);
      setForm({ title: "", week_number: form.week_number, content_type: "text", content_url: "", content_text: "" });
      load();
    } finally {
      setAdding(false);
    }
  };

  const removeChapter = async (chapterId) => {
    await api.delete(`/chapters/${chapterId}`);
    load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={card}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#111", marginBottom: "14px" }}>Add a chapter</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input style={input} placeholder="Chapter title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Week</label>
              <input type="number" min="1" style={input} value={form.week_number} onChange={e => setForm({ ...form, week_number: Number(e.target.value) })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Content type</label>
              <select style={input} value={form.content_type} onChange={e => setForm({ ...form, content_type: e.target.value })}>
                {CONTENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {form.content_type === "text" ? (
            <textarea style={{ ...input, minHeight: "80px", fontFamily: "inherit" }} placeholder="Chapter text content" value={form.content_text} onChange={e => setForm({ ...form, content_text: e.target.value })} />
          ) : (
            <input style={input} placeholder={form.content_type === "youtube" ? "YouTube URL" : "Content URL"} value={form.content_url} onChange={e => setForm({ ...form, content_url: e.target.value })} />
          )}
          <button onClick={addChapter} disabled={adding} style={{ ...btn("primary"), alignSelf: "flex-start" }}>{adding ? "Adding..." : "+ Add chapter"}</button>
        </div>
      </div>

      {loading ? <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading...</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {chapters.map(ch => (
            <div key={ch.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "2px" }}>Week {ch.week_number} &middot; {ch.content_type}</div>
                <div style={{ fontSize: "14px", fontWeight: "500", color: "#111" }}>{ch.title}</div>
              </div>
              <button onClick={() => removeChapter(ch.id)} style={btn("danger")}>Delete</button>
            </div>
          ))}
          {chapters.length === 0 && <p style={{ color: "#6b7280", fontSize: "14px" }}>No chapters yet.</p>}
        </div>
      )}
    </div>
  );
}

function AssignmentsTab({ courseId }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: "", description: "", due_date: "", is_group_assignment: false, max_points: 100 });
  const [adding, setAdding] = useState(false);
  const [gradingId, setGradingId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get(`/assignments/course/${courseId}`).then(res => setAssignments(res.data)).finally(() => setLoading(false));
  };
  useEffect(load, [courseId]);

  const addAssignment = async () => {
    if (!form.title) return;
    setAdding(true);
    try {
      await api.post(`/assignments/course/${courseId}`, form);
      setForm({ title: "", description: "", due_date: "", is_group_assignment: false, max_points: 100 });
      load();
    } finally {
      setAdding(false);
    }
  };

  const removeAssignment = async (aid) => {
    await api.delete(`/assignments/${aid}`);
    load();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={card}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#111", marginBottom: "14px" }}>Add an assignment</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <input style={input} placeholder="Assignment title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <textarea style={{ ...input, minHeight: "70px", fontFamily: "inherit" }} placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={label}>Due date</label>
              <input type="date" style={input} value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={label}>Max points</label>
              <input type="number" style={input} value={form.max_points} onChange={e => setForm({ ...form, max_points: Number(e.target.value) })} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#374151", paddingBottom: "9px" }}>
              <input type="checkbox" checked={form.is_group_assignment} onChange={e => setForm({ ...form, is_group_assignment: e.target.checked })} />
              Group assignment
            </label>
          </div>
          <button onClick={addAssignment} disabled={adding} style={{ ...btn("primary"), alignSelf: "flex-start" }}>{adding ? "Adding..." : "+ Add assignment"}</button>
        </div>
      </div>

      {loading ? <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading...</p> : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {assignments.map(a => (
            <div key={a.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>{a.title}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                    {a.is_group_assignment ? "Group" : "Individual"} &middot; {a.max_points} pts
                    {a.due_date ? ` · Due ${new Date(a.due_date).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => setGradingId(gradingId === a.id ? null : a.id)} style={btn("secondary")}>
                    {gradingId === a.id ? "Hide submissions" : "View submissions"}
                  </button>
                  <button onClick={() => removeAssignment(a.id)} style={btn("danger")}>Delete</button>
                </div>
              </div>
              {gradingId === a.id && <SubmissionsPanel assignmentId={a.id} />}
            </div>
          ))}
          {assignments.length === 0 && <p style={{ color: "#6b7280", fontSize: "14px" }}>No assignments yet.</p>}
        </div>
      )}
    </div>
  );
}

function SubmissionsPanel({ assignmentId }) {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState({});

  const load = () => {
    setLoading(true);
    api.get(`/submissions/assignment/${assignmentId}`).then(res => setSubs(res.data)).finally(() => setLoading(false));
  };
  useEffect(load, [assignmentId]);

  const grade = async (submissionId) => {
    const entry = scores[submissionId] || {};
    if (entry.score === undefined || entry.score === "") return;
    await api.post(`/submissions/${submissionId}/grade`, { score: Number(entry.score), feedback: entry.feedback || "" });
    load();
  };

  if (loading) return <p style={{ color: "#6b7280", fontSize: "13px", marginTop: "12px" }}>Loading submissions...</p>;

  return (
    <div style={{ marginTop: "14px", borderTop: "1px solid #f3f4f6", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
      {subs.length === 0 && <p style={{ fontSize: "13px", color: "#6b7280" }}>No submissions yet.</p>}
      {subs.map(s => (
        <div key={s.id} style={{ background: "#f9fafb", borderRadius: "8px", padding: "12px 14px" }}>
          <div style={{ fontSize: "13px", fontWeight: "500", color: "#111" }}>{s.student_name || s.group_name}</div>
          {s.content_text && <p style={{ fontSize: "13px", color: "#374151", marginTop: "4px", whiteSpace: "pre-wrap" }}>{s.content_text}</p>}
          {s.file_url && <a href={s.file_url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "#185FA5" }}>View file</a>}
          <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center" }}>
            {s.score !== null && s.score !== undefined ? (
              <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: "500" }}>Graded: {s.score} pts</span>
            ) : (
              <>
                <input type="number" placeholder="Score" style={{ ...input, width: "80px" }}
                  onChange={e => setScores({ ...scores, [s.id]: { ...scores[s.id], score: e.target.value } })} />
                <input placeholder="Feedback (optional)" style={{ ...input, flex: 1 }}
                  onChange={e => setScores({ ...scores, [s.id]: { ...scores[s.id], feedback: e.target.value } })} />
                <button onClick={() => grade(s.id)} style={btn("primary")}>Save grade</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupsTab({ courseId }) {
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState("");
  const [assignSelections, setAssignSelections] = useState({});

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get(`/groups/course/${courseId}`),
      api.get(`/courses/${courseId}/students`),
    ]).then(([g, s]) => { setGroups(g.data); setStudents(s.data); }).finally(() => setLoading(false));
  };
  useEffect(load, [courseId]);

  const createGroup = async () => {
    if (!newGroupName) return;
    await api.post(`/groups/course/${courseId}`, { name: newGroupName });
    setNewGroupName("");
    load();
  };

  const addMember = async (groupId) => {
    const userId = assignSelections[groupId];
    if (!userId) return;
    await api.post(`/groups/${groupId}/members`, { user_id: Number(userId) });
    load();
  };

  const removeMember = async (groupId, userId) => {
    await api.delete(`/groups/${groupId}/members/${userId}`);
    load();
  };

  const deleteGroup = async (groupId) => {
    await api.delete(`/groups/${groupId}`);
    load();
  };

  if (loading) return <p style={{ color: "#6b7280", fontSize: "14px" }}>Loading...</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={card}>
        <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#111", marginBottom: "14px" }}>Create a group</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <input style={input} placeholder="Group name" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
          <button onClick={createGroup} style={btn("primary")}>Create</button>
        </div>
        {students.length === 0 && <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>No enrolled students yet — groups need enrolled students to add as members.</p>}
      </div>

      {groups.map(g => (
        <div key={g.id} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#111" }}>{g.name}</h3>
            <button onClick={() => deleteGroup(g.id)} style={btn("danger")}>Delete group</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "10px" }}>
            {g.members.map(m => (
              <div key={m.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "13px", color: "#374151" }}>
                <span>{m.name} {m.role === "leader" && <span style={{ color: "#185FA5", fontSize: "11px" }}>(leader)</span>}</span>
                <button onClick={() => removeMember(g.id, m.user_id)} style={{ ...btn("secondary"), padding: "4px 10px", fontSize: "12px" }}>Remove</button>
              </div>
            ))}
            {g.members.length === 0 && <p style={{ fontSize: "13px", color: "#9ca3af" }}>No members yet.</p>}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <select style={input} value={assignSelections[g.id] || ""} onChange={e => setAssignSelections({ ...assignSelections, [g.id]: e.target.value })}>
              <option value="">Select a student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={() => addMember(g.id)} style={btn("secondary")}>Add</button>
          </div>
        </div>
      ))}
      {groups.length === 0 && <p style={{ color: "#6b7280", fontSize: "14px" }}>No groups yet.</p>}
    </div>
  );
}
