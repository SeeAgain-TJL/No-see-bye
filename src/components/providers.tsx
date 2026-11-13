"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { api } from "@/lib/client";
import type { UserInfo } from "@/modules/memories/types";
type AppContext = {
  user: UserInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
  notify: (message: string) => void;
};
const Context = createContext<AppContext>({
  user: null,
  loading: true,
  refresh: async () => {},
  notify: () => {},
});
export const useApp = () => useContext(Context);
export function Providers({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const refresh = useCallback(async () => {
    try {
      const data = await api<{ user: UserInfo | null }>("/api/auth/me");
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 3500);
      return () => clearTimeout(timer);
    }
  }, [message]);
  return (
    <Context.Provider value={{ user, loading, refresh, notify: setMessage }}>
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </Context.Provider>
  );
}
