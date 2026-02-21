import { useEffect, useState } from "react";
import { fuelAPI, vehiclesAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { DataTable, Modal, Spinner, PageHeader, Field, ConfirmModal } from "../components/UI";

const EMPTY = { vehicle_id: "", liters: "", cost: "" };

export default function FuelLogs() {
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
      fuelAPI.getAll(filterVeh ? { vehicle_id: filterVeh } : {}),
      vehiclesAPI.getAll(),
    ]).then(([f, v]) => {
      setRows(f.data.data);
      setVehicles(v.data.data);
    }).catch(() => toast.error("Failed to load")).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterVeh]);

  const validate = () => {
    const e = {};
    if (!form.vehicle_id) e.vehicle_id = "Required";
    if (!form.liters || parseInt(form.liters) <= 0) e.liters = "Must be positive";
    if (!form.cost || parseInt(form.cost) <= 0) e.cost = "Must be positive";
    setErr(e); return !Object.keys(e).length;
  };

  const create = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await fuelAPI.create({ vehicle_id: form.vehicle_id, liters: parseInt(form.liters), cost: parseInt(form.cost) });
      toast.success("Fuel log added.");
      setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed."); }
    finally { setSaving(false); }
  };

  const del = async () => {
    try { await fuelAPI.delete(sel.id); toast.success("Deleted."); setModal(null); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Failed."); }
  };

  const totalLiters = rows.reduce((s, r) => s + parseInt(r.liters || 0), 0);
  const totalCost   = rows.reduce((s, r) => s + parseInt(r.cost || 0), 0);

  const columns = [
    { key: "id",           label: "#",       render: (v) => <span className="text-mono text-xs text-dim">#{v}</span> },
    { key: "vehicle_name", label: "Vehicle", render: (v, row) => (
      <div>
        <div className="font-display font-semibold text-snow text-sm">{v || "—"}</div>
        <div className="text-mono text-xs text-dim">{row.plate_number}</div>
      </div>
    )},
    { key: "liters",     label: "Liters",   render: (v) => <span className="text-mono text-sm text-light">{v} L</span> },
    { key: "cost",       label: "Total Cost",render: (v) => <span className="text-mono text-sm text-jade">₹{parseInt(v || 0).toLocaleString()}</span> },
    { key: "created_at", label: "Date",      render: (v) => <span className="text-xs text-ghost">{new Date(v).toLocaleDateString("en-IN")}</span> },
    { key: "id", label: "Actions", render: (id, row) => can("MANAGER","FINANCE") && (
      <button className="btn-ghost text-xs text-rose/70 hover:text-rose" onClick={() => { setSel(row); setModal("confirm"); }}>Delete</button>
    )},
  ];

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader title="Fuel Logs" sub={`${rows.length} records · ${totalLiters} L · ₹${totalCost.toLocaleString()} total`}>
        <select className="field-select text-xs py-2 w-40" value={filterVeh} onChange={(e) => setFilterVeh(e.target.value)}>
          <option value="">All Vehicles</option>
          {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        {can("MANAGER","DISPATCHER","FINANCE") && (
          <button className="btn-primary" onClick={() => { setForm(EMPTY); setErr({}); setModal("create"); }}>
            <Plus /> Add Fuel Log
          </button>
        )}
      </PageHeader>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card card-body text-center border border-jade/20">
          <p className="field-label">Total Liters</p>
          <p className="text-mono text-2xl font-bold text-jade mt-1">{totalLiters} <span className="text-base text-ghost">L</span></p>
        </div>
        <div className="card card-body text-center border border-amber/20">
          <p className="field-label">Total Spend</p>
          <p className="text-mono text-2xl font-bold text-amber mt-1">₹{totalCost.toLocaleString()}</p>
        </div>
        <div className="card card-body text-center border border-sky/20">
          <p className="field-label">Avg Cost / L</p>
          <p className="text-mono text-2xl font-bold text-sky mt-1">
            ₹{rows.length && totalLiters ? (totalCost / totalLiters).toFixed(0) : "0"}
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={rows} loading={loading} empty="No fuel logs yet." />
      </div>

      <Modal open={modal === "create"} onClose={() => setModal(null)} title="Add Fuel Log">
        <div className="space-y-4">
          <Field label="Vehicle" required error={err.vehicle_id}>
            <select className={`field-select ${err.vehicle_id ? "border-rose/50" : ""}`}
              value={form.vehicle_id} onChange={(e) => setForm((f) => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">Select vehicle…</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.plate_number})</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Liters" required error={err.liters}>
              <input type="number" className={`field-input ${err.liters ? "border-rose/50" : ""}`}
                value={form.liters} onChange={(e) => setForm((f) => ({ ...f, liters: e.target.value }))} placeholder="e.g. 45" />
            </Field>
            <Field label="Total Cost (₹)" required error={err.cost}>
              <input type="number" className={`field-input ${err.cost ? "border-rose/50" : ""}`}
                value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} placeholder="e.g. 4500" />
            </Field>
          </div>
          {form.liters && form.cost && (
            <div className="flex justify-between px-3 py-2.5 rounded-lg bg-plate/50 text-sm">
              <span className="text-ghost">Per liter:</span>
              <span className="text-mono text-jade">₹{(parseInt(form.cost) / parseInt(form.liters)).toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-plate">
          <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={create} disabled={saving}>
            {saving && <Spinner size="sm" />} Add Log
          </button>
        </div>
      </Modal>

      <ConfirmModal open={modal === "confirm"} onClose={() => setModal(null)} onConfirm={del}
        title="Delete Fuel Log" message="Delete this fuel log? This cannot be undone." />
    </div>
  );
}

const Plus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>;