import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/* ================= ICONS ================= */

const icons = {
  dashboard: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  vehicle: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 4v4h-7V8z" />
      <circle cx="5.5" cy="18.5" r="1.5" />
      <circle cx="18.5" cy="18.5" r="1.5" />
    </svg>
  ),
  driver: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  ),
  trip: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <circle cx="5" cy="6" r="2" />
      <circle cx="19" cy="18" r="2" />
      <path d="M5 8v5a4 4 0 004 4h6M19 16V11a4 4 0 00-4-4H9" />
    </svg>
  ),
  maintenance: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  ),
  fuel: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <path d="M3 22V8a2 2 0 012-2h8a2 2 0 012 2v14M3 22h12M18 9l2 2v7a2 2 0 01-2 2" />
      <path d="M7 14h4M7 10h4" />
    </svg>
  ),
  analytics: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  logo: (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 4v4h-7V8z" />
      <circle cx="5.5" cy="18.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="18.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  ),
};

/* ================= NAV CONFIG ================= */

const NAV = [
  {
    group: "Overview",
    items: [{ to: "/", label: "Dashboard", icon: "dashboard" }],
  },
  {
    group: "Fleet",
    items: [
      { to: "/vehicles", label: "Vehicles", icon: "vehicle" },
      { to: "/drivers", label: "Drivers", icon: "driver" },
      { to: "/trips", label: "Trips", icon: "trip" },
    ],
  },
  {
    group: "Records",
    items: [
      { to: "/maintenance", label: "Maintenance", icon: "maintenance" },
      { to: "/fuel", label: "Fuel Logs", icon: "fuel" },
    ],
  },
  {
    group: "Reports",
    items: [{ to: "/analytics", label: "Analytics", icon: "analytics" }],
  },
];

/* ================= SIDEBAR ================= */

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="flex flex-col w-60 h-full bg-hull border-r border-plate">
      
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-plate">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber/15 border border-amber/30 flex items-center justify-center glow-amber">
            {icons.logo({ className: "w-4 h-4 text-amber" })}
          </div>
          <span className="font-display font-extrabold text-snow text-lg">FleetFlow</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {NAV.map((group) => (
          <div key={group.group}>
            <p className="px-3 mb-1 text-[10px] font-display uppercase text-dim">
              {group.group}
            </p>

            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = icons[item.icon];
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/"}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? "active" : ""}`
                    }
                  >
                    <Icon className="w-4 h-4 opacity-70" />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-plate">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-plate/60">
          <div className="w-8 h-8 rounded-full bg-amber/20 border border-amber/30 flex items-center justify-center text-amber font-bold text-xs">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-light truncate">
              {user?.name}
            </p>
            <p className="text-xs text-dim">{user?.role}</p>
          </div>

          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="text-ghost hover:text-rose"
          >
            ⎋
          </button>
        </div>
      </div>
    </aside>
  );
}