import { createContext, useContext, useState, useCallback } from "react";

const Ctx = createContext(null);
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const toast = {
    success: (m) => add(m, "success"),
    error:   (m) => add(m, "error"),
    info:    (m) => add(m, "info"),
  };

  const cfg = {
    success: { bg: "bg-jade/10 border-jade/30 text-jade",   icon: "✓" },
    error:   { bg: "bg-rose/10 border-rose/30 text-rose",   icon: "✕" },
    info:    { bg: "bg-sky/10  border-sky/30  text-sky",    icon: "·" },
  };

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`animate-slide-in flex items-center gap-3 px-4 py-3 rounded-xl border text-sm backdrop-blur-sm shadow-2xl pointer-events-auto font-body ${cfg[t.type]?.bg}`}>
            <span className="font-bold text-base leading-none">{cfg[t.type]?.icon}</span>
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}