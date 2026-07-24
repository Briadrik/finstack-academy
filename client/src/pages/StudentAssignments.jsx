import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

const card = { background: "white", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "18px 20px" };
const input = { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", width: "100%", boxSizing: "border-box" };
const btn = { background: "#185FA5", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", fontSize: "13px", fontWeight: "500", cursor: "pointer" };

export default function StudentAssignments() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return navigate("/login");
    setLoading(true);
    Promise.all([
      api.get(`/courses/${id}`),
      api.get(`/assignments/course/${id}`),
      api.get(`/groups/course/${id}`),
    ]).then(([c, a, g]) => {
      setCourse(c.data);
      setAssignments(a.data);
      // groups the current user belongs to
      setGroups(g.data.filter(grp => grp.members.some(m => m.user_id === user.id)));
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <p style={{ padding: "32px", color: "#6b7280" }}>Loading...</p>;
  if (!course) return <p style={{ padding: "32px", color: "#dc2626" }}>Course not found.</p>;

  return (
    <div style={{ background: "#f9fafb", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <Link to={`/courses/${id}/learn`} style={{ fontSize: "13px", color: "#6b7280", textDecoration: "none" }}>&larr; Back to course</Link>
        <h1 style={{ fontSize: "20px", fontWeight: "600", color: "#111", margin: "8px 0 4px" }}>{course.title} &mdash; Assignments</h1>
        <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "24px" }}>
          {assignments.length} assignment{assignments.length === 1 ? "" : "s"}
        </p>

        {assignments.length === 0 ? (
          <div style={{ ...card, textAlign: "center" }}>
            <p style={{ color: "#6b7280", fontSize: "14px" }}>No assignments have been posted yet.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {assignments.map(a => (
              <AssignmentCard key={a.id} assignment={a} myGroups={groups} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssignmentCard({ assignment, myGroups }) {
  const [mySubs, setMySubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [groupId, setGroupId] = useState(myGroups[0]?.id || "");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/submissions/assignment/${assignment.id}/mine`).then(res => setMySubs(res.data)).finally(() => setLoading(false));
  };
  useEffect(load, [assignment.id]);

  const submit = async () => {
    if (!text && !fileUrl) return;
    if (assignment.is_group_assignment && !groupId) return;
    setSubmitting(true);
    try {
      await api.post(`/submissions/${assignment.id}`, {
        content_text: text || null,
        file_url: fileUrl || null,
        group_id: assignment.is_group_assignment ? Number(groupId) : undefined,
      });
      setText("");
      setFileUrl("");
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const latest = mySubs[0];
  const isPastDue = assignment.due_date && new Date(assignment.due_date) < new Date();

  return (
    <div style={card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111" }}>{assignment.title}</h3>
          <p style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
            {assignment.is_group_assignment ? "Group" : "Individual"} &middot; {assignment.max_points} pts
            {assignment.due_date && ` · Due ${new Date(assignment.due_date).toLocaleDateString()}`}
            {isPastDue && <span style={{ color: "#dc2626" }}> (past due)</span>}
          </p>
        </div>
      </div>
      {assignment.description && (
        <p style={{ fontSize: "13px", color: "#374151", marginTop: "10px", lineHeight: "1.6" }}>{assignment.description}</p>
      )}

      {loading ? (
        <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "12px" }}>Loading...</p>
      ) : latest ? (
        <div style={{ marginTop: "14px", background: "#f9fafb", borderRadius: "8px", padding: "12px 14px" }}>
          <p style={{ fontSize: "12px", color: "#9ca3af" }}>Submitted {new Date(latest.submitted_at).toLocaleString()}</p>
          {latest.content_text && <p style={{ fontSize: "13px", color: "#374151", marginTop: "6px", whiteSpace: "pre-wrap" }}>{latest.content_text}</p>}
          {latest.file_url && <a href={latest.file_url} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "#185FA5" }}>View file</a>}
          <div style={{ marginTop: "8px" }}>
            {latest.score !== null && latest.score !== undefined ? (
              <span style={{ fontSize: "13px", color: "#16a34a", fontWeight: "600" }}>Grade: {latest.score}/{assignment.max_points}</span>
            ) : (
              <span style={{ fontSize: "12px", color: "#9ca3af" }}>Not graded yet</span>
            )}
            {latest.feedback && <p style={{ fontSize: "13px", color: "#374151", marginTop: "4px" }}>Feedback: {latest.feedback}</p>}
          </div>
        </div>
      ) : (
        <div style={{ marginTop: "14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {assignment.is_group_assignment && (
            myGroups.length === 0 ? (
              <p style={{ fontSize: "12px", color: "#dc2626" }}>You haven't been added to a group for this assignment yet — ask your teacher.</p>
            ) : (
              <select style={input} value={groupId} onChange={e => setGroupId(e.target.value)}>
                {myGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )
          )}
          <textarea style={{ ...input, minHeight: "70px", fontFamily: "inherit" }} placeholder="Write your submission..." value={text} onChange={e => setText(e.target.value)} />
          <input style={input} placeholder="Or paste a file link (Drive, Dropbox, etc.)" value={fileUrl} onChange={e => setFileUrl(e.target.value)} />
          <button onClick={submit} disabled={submitting || (assignment.is_group_assignment && myGroups.length === 0)} style={{ ...btn, alignSelf: "flex-start", opacity: submitting ? 0.7 : 1 }}>
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      )}
    </div>
  );
}
