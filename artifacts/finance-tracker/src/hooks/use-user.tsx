import { createContext, useContext, useState, ReactNode } from "react";

type UserContextType = {
  name: string | null;
  setName: (name: string) => void;
  logout: () => void;
};

const UserContext = createContext<UserContextType | null>(null);

const STORAGE_KEY = "finance_tracker_user_name";

export function UserProvider({ children }: { children: ReactNode }) {
  const [name, setNameState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const setName = (newName: string) => {
    try {
      localStorage.setItem(STORAGE_KEY, newName);
    } catch {}
    setNameState(newName);
  };

  const logout = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setNameState(null);
  };

  return (
    <UserContext.Provider value={{ name, setName, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
