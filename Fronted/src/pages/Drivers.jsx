import { useEffect, useState } from "react";
import { driversAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import { DataTable, StatusBadge, Modal, Spinner, PageHeader, Field, ConfirmModal } from "../components/UI";

const EMPTY = { name: "", license_number: "", license_expiry: "" };

export default function Drivers() {
  const { can } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [sel, setSel] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState({});
  const [filter, setFilter] = useState("");

  const load = () => {
    setLoading(true);
    driversAPI.getAll().then((r) => setRows(r.data.data)).catch(() => toast.error("Failed to load drivers")).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const isExp  = (d) => d && new Date(d) < new Date();
  const isSoon = (d) => { if (!d) return false; const dt = new Date(d), n = new Date(); n.setDate(n.getDate() + 30); return dt > new Date() && dt < n; };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.license_number.trim()) e.license_number = "Required";
    if (!form.license_expiry) e.license_expiry = "Required";
    setErr(e); return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (modal === "create") { await driversAPI.create(form); toast.success("Driver registered."); }
      else { await driversAPI.update(sel.id, form); toast.success("Driver updated."); }
      setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.message || "Failed."); }
    finally { setSaving(false); }
  };

  const setStatus = async (status) => {
    setSaving(true);
    try { await driversAPI.setStatus(sel.id, status); toast.success(`Status → ${status}`); setModal(null); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Failed."); }
    finally { setSaving(false); }
  };

  const del = async () => {
    try { await driversAPI.delete(sel.id); toast.success("Driver deleted."); setModal(null); load(); }
    catch (e) { toast.error(e.response?.data?.message || "Cannot delete."); }
  };

  const filtered = filter ? rows.filter((r) => r.status === filter) : rows;
  const expCount = rows.filter((r) => isExp(r.license_expiry)).length;

  const columns = [
    { key: "id",             label: "#",       render: (v) => <span className="text-mono text-xs text-dim">#{v}</span> },
    { key: "name",           label: "Driver",  render: (v) => <span className="font-display font-semibold text-snow text-sm">{v}</span> },
    { key: "license_number", label: "License", render: (v) => <span className="text-mono text-xs bg-plate px-2 py-0.5 rounded text-light">{v}</span> },
    { key: "license_expiry", label: "Expiry",  render: (v) => {
      const exp = isExp(v), soon = isSoon(v);
      return (
        <div className="flex items-center gap-1.5">
          {(exp || soon) && <span className={`dot animate-blink ${exp ? "bg-rose" : "bg-amber"}`} />}
          <span className={`text-mono text-xs ${exp ? "text-rose" : soon ? "text-amber" : "text-ghost"}`}>
            {v ? new Date(v).toLocaleDateString("en-IN") : "—"}
          </span>
          {exp  && <span className="text-xs text-rose font-display font-bold">EXPIRED</span>}
          {soon && !exp && <span className="text-xs text-amber font-display font-bold">SOON</span>}
        </div>
      );
    }},
    { key: "status",         label: "Status",  render: (v) => <StatusBadge status={v} /> },
    { key: "created_at",     label: "Added",   render: (v) => <span className="text-xs text-dim">{new Date(v).toLocaleDateString("en-IN")}</span> },
    { key: "id", label: "Actions", render: (id, row) => can("MANAGER","SAFETY") && (
      <div className="flex items-center gap-1">
        <button className="btn-ghost text-xs" onClick={() => { setSel(row); setForm({ name: row.name, license_number: row.license_number, license_expiry: row.license_expiry?.slice(0,10) || "" }); setErr({}); setModal("edit"); }}>Edit</button>
        <button className="btn-ghost text-xs" onClick={() => { setSel(row); setModal("status"); }}>Status</button>
        {can("MANAGER") && <button className="btn-ghost text-xs text-rose/70 hover:text-rose" onClick={() => { setSel(row); setModal("confirm"); }}>Delete</button>}
      </div>
    )},
  ];

  const I = ({ name, label, type = "text", req }) => (
    <Field label={label} required={req} error={err[name]}>
      <input type={type} className={`field-input ${err[name] ? "border-rose/50" : ""}`}
        value={form[name]} onChange={(e) => setForm((f) => ({ ...f, [name]: e.target.value }))} />
    </Field>
  );

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader title="Driver Profiles" sub={`${rows.length} drivers${expCount > 0 ? ` · ⚠ ${expCount} expired license${expCount > 1 ? "s" : ""}` : ""}`}>
        {expCount > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-rose bg-rose/10 border border-rose/20 px-3 py-1.5 rounded-full">
            <span className="dot bg-rose animate-blink" /> {expCount} expired
          </span>
        )}
        <select className="field-select text-xs py-2 w-36" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Status</option>
          {["AVAILABLE","ON_TRIP","SUSPENDED"].map((s) => <option key={s}>{s}</option>)}
        </select>
        {can("MANAGER","SAFETY") && (
          <button className="btn-primary" onClick={() => { setForm(EMPTY); setErr({}); setModal("create"); }}>
            <Plus /> Add Driver
          </button>
        )}
      </PageHeader>

      <div className="card overflow-hidden">
        <DataTable columns={columns} data={filtered} loading={loading} empty="No drivers yet." />
      </div>

      <Modal open={modal === "create" || modal === "edit"} onClose={() => setModal(null)} title={modal === "create" ? "Register Driver" : "Edit Driver"}>
        <div className="space-y-4">
          <I name="name" label="Full Name" req />
          <I name="license_number" label="License Number" req />
          <I name="license_expiry" label="License Expiry" type="date" req />
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-plate">
          <button className="btn-outline" onClick={() => setModal(null)}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving && <Spinner size="sm" />} {modal === "create" ? "Register" : "Save"}
          </button>
        </div>
      </Modal>

      <Modal open={modal === "status"} onClose={() => setModal(null)} title="Update Driver Status">
        <p className="text-sm text-ghost mb-4">Current: <StatusBadge status={sel?.status} /></p>
        <div className="space-y-2">
          {["AVAILABLE","SUSPENDED"].map((s) => (
            <button key={s} disabled={sel?.status === s || saving} onClick={() => setStatus(s)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-display font-semibold transition-all
                ${sel?.status === s ? "border-amber/30 bg-amber/10 text-amber" : "border-wire bg-plate hover:border-dim text-light"}`}>
              <span className={`dot ${s === "AVAILABLE" ? "bg-jade" : "bg-rose"}`} />
              {s}
              {sel?.status === s && <span className="ml-auto text-xs text-dim">Current</span>}
            </button>
          ))}
        </div>
        <div className="flex justify-end mt-4 pt-4 border-t border-plate">
          <button className="btn-outline" onClick={() => setModal(null)}>Close</button>
        </div>
      </Modal>

      <ConfirmModal open={modal === "confirm"} onClose={() => setModal(null)} onConfirm={del}
        title="Delete Driver" message={`Delete "${sel?.name}"? This cannot be undone.`} />
    </div>
  );
}

const Plus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>;