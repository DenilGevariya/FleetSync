import { createContext, useContext, useState } from "react";
import { authAPI } from "../services/api";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ff_user")); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data } = await authAPI.login({ email, password });
      localStorage.setItem("ff_token", data.data.token);
      localStorage.setItem("ff_user", JSON.stringify(data.data.user));
      setUser(data.data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err.response?.data?.message || "Login failed." };
    } finally { setLoading(false); }
  };

const register = async (name, email, password, role) => {
  setLoading(true);
  try {
    const { data } = await authAPI.register({
      name,
      email,
      password,
      role,
    });

    localStorage.setItem("ff_token", data.data.token);
    localStorage.setItem("ff_user", JSON.stringify(data.data.user));
    setUser(data.data.user);

    return { ok: true };
  } catch (err) {
    return { ok: false, message: err.response?.data?.message || "Register failed." };
  } finally {
    setLoading(false);
  }
};

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  const can = (...roles) => roles.includes(user?.role);

  return (
    <Ctx.Provider value={{ user, login,register ,logout, loading, can }}>
      {children}
    </Ctx.Provider>
  );
}