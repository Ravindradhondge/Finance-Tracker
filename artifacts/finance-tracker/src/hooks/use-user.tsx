import { createContext, useContext, useState, ReactNode } from "react";
import { setDefaultHeaders } from "@workspace/api-client-react";

export type UserData = {
  id: number;
  name: string;
  mobile: string;
};

type UserContextType = {
  user: UserData | null;
  name: string | null;
  login: (userData: UserData) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType | null>(null);

const STORAGE_KEY = "finance_tracker_user";

function applyHeaders(id: number) {
  setDefaultHeaders({ "x-user-id": String(id) });
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as UserData;
      if (parsed?.id) applyHeaders(parsed.id);
      return parsed;
    } catch {
      return null;
    }
  });

  const login = (userData: UserData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
    } catch {}
    applyHeaders(userData.id);
    setUser(userData);
  };

  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setDefaultHeaders({});
    setUser(null);
  };

  return (
    <UserContext.Provider value={{ user, name: user?.name ?? null, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
