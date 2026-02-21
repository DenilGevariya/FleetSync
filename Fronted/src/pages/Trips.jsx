import { useEffect, useState } from "react";
import { tripsAPI, vehiclesAPI, driversAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { DataTable, StatusBadge, Modal, Spinner, PageHeader, Field } from "../components/UI";

const EMPTY = { vehicle_id: "", driver_id: "", origin: "", destination: "", cargo_weight: "" };

export default function Trips() {
  const { can } = useAuth();
  const toast = useToast();
  const [rows, setRows]       = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [sel, setSel]           = useState(null);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState({});
  const [filter, setFilter]     = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      tripsAPI.getAll(),
      vehiclesAPI.getAll({ status: "AVAILABLE" }),
      driversAPI.getAll({ status: "AVAILABLE" }),
    ]).then(([t, v, d]) => {
      setRows(t.data.data);
      setVehicles(v.data.data);
      setDrivers(d.data.data);
    }).catch(() => toast.error("Failed to load")).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const selVehicle = vehicles.find((v) => String(v.id) === String(form.vehicle_id));

  const validate = () => {
    const e = {};
    if (!form.vehicle_id) e.vehicle_id = "Select a vehicle";
    if (!form.driver_id)  e.driver_id  = "Select a driver";
    if (!form.origin.trim()) e.origin = "Required";
    if (!form.destination.trim()) e.destination = "Required";
    if (!form.cargo_weight || parseInt(form.cargo_weight) <= 0) e.cargo_weight = "Must be positive";
    if (selVehicle && parseInt(form.cargo_weight) > selVehicle.capacity) {
      e.cargo_weight = `Exceeds vehicle capacity (${selVehicle.capacity} kg)`;
    }
    setErr(e); return !Object.keys(e).length;
  };

  const create = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await tripsAPI.create({ ...form, cargo_weight: parseInt(form.cargo_weight) });
      toast.success("Trip created (DRAFT).");
      setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed."); }
    finally { setSaving(false); }
  };

  const dispatch = async (id) => {
    setSaving(true);
    try { await tripsAPI.dispatch(id); toast.success("Dispatched! Vehicle & driver are ON_TRIP."); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Failed."); }
    finally { setSaving(false); }
  };

  const complete = async (id) => {
    setSaving(true);
    try { await tripsAPI.complete(id); toast.success("Trip completed! Vehicle & driver are AVAILABLE."); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Failed."); }
    finally { setSaving(false); }
  };

  const cancel = async (id) => {
    if (!confirm("Cancel this trip?")) return;
    try { await tripsAPI.cancel(id); toast.success("Trip cancelled."); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Failed."); }
  };

  const filtered = filter ? rows.filter((r) => r.status === filter) : rows;

  const columns = [
    { key: "id",          label: "#",       render: (v) => <span className="text-mono text-xs text-amber">#{v}</span> },
    { key: "origin",      label: "Route",   render: (v, row) => (
      <div>
        <div className="text-sm text-light">{v}</div>
        <div className="text-xs text-ghost">→ {row.destination}</div>
      </div>
    )},
    { key: "vehicle_name", label: "Vehicle", render: (v, row) => (
      <div>
        <div className="text-sm text-light">{v || "—"}</div>
        <div className="text-mono text-xs text-dim">{row.plate_number}</div>
      </div>
    )},
    { key: "driver_name", label: "Driver",   render: (v) => <span className="text-sm text-light">{v || "—"}</span> },
    { key: "cargo_weight",label: "Cargo",    render: (v, row) => (
      <div>
        <span className="text-mono text-xs text-ghost">{v} kg</span>
        {row.capacity && (
          <div className="w-14 h-1 bg-plate rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-sky/50 rounded-full" style={{ width: `${Math.min(100,(v/row.capacity)*100)}%` }} />
          </div>
        )}
      </div>
    )},
    { key: "status",      label: "Status",  render: (v) => <StatusBadge status={v} /> },
    { key: "id", label: "Actions", render: (id, row) => can("MANAGER","DISPATCHER") && (
      <div className="flex items-center gap-1 flex-wrap">
        {row.status === "DRAFT" && (
          <button className="btn-ghost text-xs text-sky" disabled={saving} onClick={() => dispatch(id)}>Dispatch</button>
        )}
        {row.status === "DISPATCHED" && (
          <button className="btn-ghost text-xs text-jade" disabled={saving} onClick={() => complete(id)}>Complete</button>
        )}
        {["DRAFT","DISPATCHED"].includes(row.status) && (
          <button className="btn-ghost text-xs text-rose/70 hover:text-rose" onClick={() => cancel(id)}>Cancel</button>
        )}
      </div>
    )},
  ];

  const S = ({ name, label, req, children }) => (
    <Field label={label} required={req} error={err[name]}>
      <select className={`field-select ${err[name] ? "border-rose/50" : ""}`}
        value={form[name]} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))}>
        <option value="">Select…</option>
        {children}
      </select>
    </Field>
  );
  const I = ({ name, label, type = "text", req, sub }) => (
    <Field label={label} required={req} error={err[name]}>
      <input type={type} className={`field-input ${err[name] ? "border-rose/50" : ""}`}
        value={form[name]} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))} />
      {sub && !err[name] && <p className="text-xs text-ghost mt-1">{sub}</p>}
    </Field>
  );

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader title="Trip Dispatcher" sub={`${rows.filter((r) => r.status === "DISPATCHED").length} active · ${rows.length} total`}>
        <select className="field-select text-xs py-2 w-36" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Status</option>
          {["DRAFT","DISPATCHED","COMPLETED","CANCELLED"].map((s) => <option key={s}>{s}</option>)}
        </select>
        {can("MANAGER","DISPATCHER") && (
          <button className="btn-primary" onClick={() => { setForm(EMPTY); setErr({}); setModal("create"); }}>
            <Plus /> New Trip
          </button>
        )}
      </PageHeader>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={filtered} loading={loading} empty="No trips found." />
      </div>

      <Modal open={modal === "create"} onClose={() => setModal(null)} title="Create New Trip" width="max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <S name="vehicle_id" label="Vehicle" req>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.plate_number} (max {v.capacity} kg)</option>)}
          </S>
          <S name="driver_id" label="Driver" req>
            {drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </S>
          <I name="origin" label="Origin" req />
          <I name="destination" label="Destination" req />
          <I name="cargo_weight" label="Cargo Weight (kg)" type="number" req
            sub={selVehicle ? `Vehicle capacity: ${selVehicle.capacity} kg` : ""} />
        </div>

        {/* Capacity warning */}
        {selVehicle && form.cargo_weight && parseInt(form.cargo_weight) > selVehicle.capacity && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-rose/10 border border-rose/20 text-rose text-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
            </svg>
            Cargo ({form.cargo_weight} kg) exceeds vehicle capacity ({selVehicle.capacity} kg)!
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-plate">
          <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={create} disabled={saving}>
            {saving && <Spinner size="sm" />} Create Trip
          </button>
        </div>
      </Modal>
    </div>
  );
}

const Plus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>;