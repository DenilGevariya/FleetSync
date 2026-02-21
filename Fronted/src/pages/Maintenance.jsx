import { useEffect, useState } from "react";
import { maintenanceAPI, vehiclesAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { DataTable, Modal, Spinner, PageHeader, Field, ConfirmModal } from "../components/UI";

const EMPTY = { vehicle_id: "", description: "", cost: "" };

export default function Maintenance() {
  const { can } = useAuth();
  const toast = useToast();
  const [rows, setRows]         = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [sel, setSel]           = useState(null);
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState({});
  const [filterVeh, setFilterVeh] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      maintenanceAPI.getAll(filterVeh ? { vehicle_id: filterVeh } : {}),
      vehiclesAPI.getAll(),
    ]).then(([m, v]) => {
      setRows(m.data.data);
      setVehicles(v.data.data);
    }).catch(() => toast.error("Failed to load")).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterVeh]);

  const validate = () => {
    const e = {};
    if (!form.vehicle_id) e.vehicle_id = "Required";
    if (!form.description.trim()) e.description = "Required";
    setErr(e); return !Object.keys(e).length;
  };

  const create = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await maintenanceAPI.create({ ...form, cost: parseInt(form.cost) || 0 });
      toast.success("Logged. Vehicle set to IN_SHOP.");
      setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed."); }
    finally { setSaving(false); }
  };

  const release = async (vehicle_id, vehicle_name) => {
    if (!confirm(`Release "${vehicle_name}" back to AVAILABLE?`)) return;
    try { await maintenanceAPI.releaseVehicle(vehicle_id); toast.success("Vehicle released to AVAILABLE."); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Failed."); }
  };

  const del = async () => {
    try { await maintenanceAPI.delete(sel.id); toast.success("Deleted."); setModal(null); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Failed."); }
  };

  const totalCost = rows.reduce((s, r) => s + parseInt(r.cost || 0), 0);

  const columns = [
    { key: "id",           label: "#",       render: (v) => <span className="text-mono text-xs text-dim">#{v}</span> },
    { key: "vehicle_name", label: "Vehicle", render: (v, row) => (
      <div>
        <div className="font-display font-semibold text-snow text-sm">{v || "—"}</div>
        <div className="text-mono text-xs text-dim">{row.plate_number}</div>
      </div>
    )},
    { key: "description",  label: "Service Description", render: (v) => <span className="text-sm text-light">{v}</span> },
    { key: "cost",         label: "Cost",    render: (v) => <span className="text-mono text-sm text-amber">₹{parseInt(v || 0).toLocaleString()}</span> },
    { key: "created_at",   label: "Date",    render: (v) => <span className="text-xs text-ghost">{new Date(v).toLocaleDateString("en-IN")}</span> },
    { key: "id", label: "Actions", render: (id, row) => can("MANAGER") && (
      <div className="flex items-center gap-1">
        <button className="btn-ghost text-xs text-jade" onClick={() => release(row.vehicle_id, row.vehicle_name)}>Release Vehicle</button>
        <button className="btn-ghost text-xs text-rose/70 hover:text-rose" onClick={() => { setSel(row); setModal("confirm"); }}>Delete</button>
      </div>
    )},
  ];

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader title="Maintenance Logs" sub={`${rows.length} records · ₹${totalCost.toLocaleString()} total cost`}>
        <select className="field-select text-xs py-2 w-40" value={filterVeh} onChange={(e) => setFilterVeh(e.target.value)}>
          <option value="">All Vehicles</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        {can("MANAGER") && (
          <button className="btn-primary" onClick={() => { setForm(EMPTY); setErr({}); setModal("create"); }}>
            <Plus /> Log Service
          </button>
        )}
      </PageHeader>

      {/* Warning banner */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber/10 border border-amber/20 text-amber text-sm">
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span><b>Auto-logic:</b> Logging a service automatically sets the vehicle status to <b>IN_SHOP</b>, removing it from dispatch. Use <b>Release Vehicle</b> to restore it to AVAILABLE.</span>
      </div>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={rows} loading={loading} empty="No maintenance logs." />
      </div>

      <Modal open={modal === "create"} onClose={() => setModal(null)} title="Log Maintenance Service">
        <div className="space-y-4">
          <Field label="Vehicle" required error={err.vehicle_id}>
            <select className={`field-select ${err.vehicle_id ? "border-rose/50" : ""}`}
              value={form.vehicle_id} onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.plate_number}) — {v.status}</option>)}
            </select>
          </Field>

          <Field label="Description" required error={err.description}>
            <textarea className={`field-input h-20 resize-none ${err.description ? "border-rose/50" : ""}`}
              value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Oil change, brake service…" />
          </Field>

          <Field label="Cost (₹)">
            <input type="number" className="field-input" value={form.cost}
              onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} placeholder="0" />
          </Field>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-plate">
          <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={create} disabled={saving}>
            {saving && <Spinner size="sm" />} Log Service
          </button>
        </div>
      </Modal>

      <ConfirmModal open={modal === "confirm"} onClose={() => setModal(null)} onConfirm={del}
        title="Delete Log" message="Delete this maintenance log? This won't change vehicle status." />
    </div>
  );
}

const Plus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>;