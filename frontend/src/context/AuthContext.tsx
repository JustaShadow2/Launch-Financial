import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, clearToken, getToken, setToken } from "../api/client";
import { User } from "../api/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  updateProfile: (firstName: string, lastName: string) => Promise<void>;
  changeEmail: (newEmail: string, currentPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  applyAuth: (token: string, user: User) => void;
}

interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ user: User }>("/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  function applyAuth(token: string, u: User) {
    setToken(token);
    setUser(u);
  }

  async function login(email: string, password: string) {
    const res = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
    applyAuth(res.token, res.user);
  }

  async function register(data: RegisterInput) {
    const res = await api.post<{ token: string; user: User }>("/auth/register", data);
    applyAuth(res.token, res.user);
  }

  function logout() {
    clearToken();
    setUser(null);
  }

  async function updateProfile(firstName: string, lastName: string) {
    const res = await api.patch<{ user: User }>("/auth/profile", { firstName, lastName });
    setUser(res.user);
  }

  async function changeEmail(newEmail: string, currentPassword: string) {
    const res = await api.patch<{ token: string; user: User }>("/auth/email", {
      newEmail,
      currentPassword,
    });
    applyAuth(res.token, res.user);
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    await api.patch("/auth/password", { currentPassword, newPassword });
  }

  async function deleteAccount(password: string) {
    await api.del("/auth/account", { password });
    logout();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateProfile,
        changeEmail,
        changePassword,
        deleteAccount,
        applyAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
