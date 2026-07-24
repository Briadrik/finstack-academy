import { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("fs_user");
    return u ? JSON.parse(u) : null;
  });

  const login = (token, userData) => {
    localStorage.setItem("fs_token", token);
    localStorage.setItem("fs_user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("fs_token");
    localStorage.removeItem("fs_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export const ROLES = { ADMIN: "admin", TEACHER: "teacher", STUDENT: "student" };
