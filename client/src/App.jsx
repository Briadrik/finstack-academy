import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Learn from "./pages/Learn";
import TeacherDashboard from "./pages/TeacherDashboard";
import CourseBuilder from "./pages/CourseBuilder";
import AdminDashboard from "./pages/AdminDashboard";
import StudentAssignments from "./pages/StudentAssignments";

function PrivateRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <Routes>
          <Route path="/" element={<Courses />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/courses/:id/learn" element={<PrivateRoute><Learn /></PrivateRoute>} />
          <Route path="/courses/:id/assignments" element={<PrivateRoute><StudentAssignments /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute roles={["student"]}><Dashboard /></PrivateRoute>} />
          <Route path="/teacher" element={<PrivateRoute roles={["teacher", "admin"]}><TeacherDashboard /></PrivateRoute>} />
          <Route path="/teacher/courses/:id" element={<PrivateRoute roles={["teacher", "admin"]}><CourseBuilder /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute roles={["admin"]}><AdminDashboard /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
