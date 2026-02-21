import { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";

const PAGE_INFO = {
  "/":            ["Command Center",  "Live fleet overview"],
  "/vehicles":    ["Vehicle Registry","Asset management"],
  "/drivers":     ["Driver Profiles", "Compliance & scheduling"],
  "/trips":       ["Trip Dispatcher", "Routes & assignments"],
  "/maintenance": ["Service Logs",    "Maintenance tracking"],
  "/fuel":        ["Fuel Logs",       "Fuel expense records"],
  "/analytics":   ["Analytics",       "Performance reports"],
};

export default function DashboardLayout({ children }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const [title, sub] = PAGE_INFO[pathname] || ["FleetFlow", ""];

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-void/70 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 lg:static lg:flex transform transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <Sidebar onClose={() => setOpen(false)} />
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-plate bg-hull/70 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden btn-ghost p-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="font-display font-bold text-snow text-base leading-none">{title}</h1>
              <p className="text-xs text-ghost mt-0.5">{sub}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-plate rounded-lg border border-wire/50">
            <span className="dot bg-jade animate-blink" />
            <span className="text-mono text-xs text-ghost">
              {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}