import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Spinner } from "../components/UI";

export default function Register() {
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    const res = await register(form.name, form.email, form.password);

    if (res.ok) navigate("/");
    else setError(res.message);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-1/2 bg-hull border-r border-plate p-14 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(38,56,80,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(38,56,80,0.5) 1px,transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="absolute -bottom-40 -right-20 w-96 h-96 rounded-full bg-amber/5 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-14">
            <div className="w-10 h-10 rounded-xl bg-amber/15 border border-amber/30 flex items-center justify-center glow-amber">
              <svg
                className="w-5 h-5 text-amber"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 3h15v13H1z" />
                <path d="M16 8h4l3 4v4h-7V8z" />
                <circle cx="5.5" cy="18.5" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="18.5" cy="18.5" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </div>
            <span className="font-display font-extrabold text-snow text-2xl tracking-tight">
              FleetFlow
            </span>
          </div>

          <h2 className="font-display font-extrabold text-4xl text-snow leading-tight mb-4">
            Join the Fleet<br />
            <span className="text-amber">Command Center</span>
          </h2>

          <p className="text-ghost text-sm leading-relaxed max-w-xs">
            Create your FleetFlow account to manage vehicles, drivers, and trips
            with real-time operational insights.
          </p>
        </div>

        <div className="relative mt-auto grid grid-cols-2 gap-3">
          {[
            { label: "Schema", value: "PostgreSQL" },
            { label: "Auth", value: "JWT + bcrypt" },
            { label: "API", value: "REST Express" },
            { label: "Stack", value: "React + Vite" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-plate/60 border border-wire/50 rounded-xl px-4 py-3"
            >
              <div className="text-mono text-sm font-bold text-amber">
                {s.value}
              </div>
              <div className="text-xs text-ghost mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Register form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-amber/15 border border-amber/30 flex items-center justify-center">
              <svg
                className="w-3.5 h-3.5 text-amber"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M1 3h15v13H1z" />
                <path d="M16 8h4l3 4v4h-7V8z" />
              </svg>
            </div>
            <span className="font-display font-bold text-snow text-lg">
              FleetFlow
            </span>
          </div>

          <h1 className="font-display font-bold text-snow text-2xl mb-1">
            Create account
          </h1>
          <p className="text-ghost text-sm mb-8">
            Register to access your fleet dashboard
          </p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="field-label">Name</label>
              <input
                className="field-input"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="field-label">Email</label>
              <input
                type="email"
                className="field-input"
                placeholder="john@fleetflow.io"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="field-label">Password</label>
              <input
                type="password"
                className="field-input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-rose/10 border border-rose/20 text-rose text-sm">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? (
                <>
                  <Spinner size="sm" /> Creating…
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="mt-8 p-3 rounded-xl bg-plate/60 border border-wire/50">
            <p className="text-xs text-dim">
              Already have an account?{" "}
              <span
                className="text-amber cursor-pointer"
                onClick={() => navigate("/login")}
              >
                Sign in
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}