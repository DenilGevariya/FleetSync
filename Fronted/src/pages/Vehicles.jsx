import { useEffect, useState } from "react";
import { vehiclesAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  DataTable,
  StatusBadge,
  Modal,
  Spinner,
  PageHeader,
  Field,
  ConfirmModal,
} from "../components/UI";

const EMPTY = { name: "", plate_number: "", capacity: "" };

export default function Vehicles() {
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

  /* ───────── LOAD ───────── */
  const load = () => {
    setLoading(true);
    vehiclesAPI
      .getAll()
      .then((r) => setRows(r.data.data))
      .catch(() => toast.error("Failed to load vehicles"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  /* ───────── STABLE INPUT HANDLER ───────── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* ───────── VALIDATION ───────── */
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.plate_number.trim()) e.plate_number = "Required";
    if (!form.capacity || parseInt(form.capacity) <= 0)
      e.capacity = "Must be positive";
    setErr(e);
    return !Object.keys(e).length;
  };

  /* ───────── SAVE ───────── */
  const save = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      if (modal === "create") {
        await vehiclesAPI.create({
          ...form,
          capacity: parseInt(form.capacity),
        });
        toast.success("Vehicle added.");
      } else {
        await vehiclesAPI.update(sel.id, {
          ...form,
          capacity: parseInt(form.capacity),
        });
        toast.success("Vehicle updated.");
      }

      setModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ───────── STATUS ───────── */
  const setStatus = async (status) => {
    setSaving(true);
    try {
      await vehiclesAPI.setStatus(sel.id, status);
      toast.success(`Status → ${status}`);
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ───────── DELETE ───────── */
  const del = async () => {
    try {
      await vehiclesAPI.delete(sel.id);
      toast.success("Vehicle deleted.");
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Cannot delete.");
    }
  };

  const filtered = filter
    ? rows.filter((r) => r.status === filter)
    : rows;

  /* ───────── TABLE ───────── */
  const columns = [
    {
      key: "id",
      label: "#",
      render: (v) => (
        <span className="text-mono text-xs text-dim">
          #{v}
        </span>
      ),
    },
    {
      key: "name",
      label: "Vehicle",
      render: (v, row) => (
        <div>
          <div className="font-display font-semibold text-snow text-sm">
            {v}
          </div>
          <div className="text-mono text-xs text-dim">
            {row.plate_number}
          </div>
        </div>
      ),
    },
    {
      key: "capacity",
      label: "Capacity",
      render: (v) => (
        <span className="text-mono text-xs text-ghost">
          {v} kg
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: "created_at",
      label: "Added",
      render: (v) => (
        <span className="text-xs text-dim">
          {new Date(v).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) =>
        can("MANAGER") && (
          <div className="flex items-center gap-1">
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                setSel(row);
                setForm({
                  name: row.name,
                  plate_number: row.plate_number,
                  capacity: row.capacity,
                });
                setErr({});
                setModal("edit");
              }}
            >
              Edit
            </button>

            <button
              className="btn-ghost text-xs"
              onClick={() => {
                setSel(row);
                setModal("status");
              }}
            >
              Status
            </button>

            <button
              className="btn-ghost text-xs text-rose/70 hover:text-rose"
              onClick={() => {
                setSel(row);
                setModal("confirm");
              }}
            >
              Delete
            </button>
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader
        title="Vehicle Registry"
        sub={`${rows.length} vehicles`}
      >
        <select
          className="field-select text-xs py-2 w-36"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All Status</option>
          {["AVAILABLE", "ON_TRIP", "IN_SHOP", "RETIRED"].map(
            (s) => (
              <option key={s}>{s}</option>
            )
          )}
        </select>

        {can("MANAGER") && (
          <button
            className="btn-primary"
            onClick={() => {
              setForm(EMPTY);
              setErr({});
              setModal("create");
            }}
          >
            <Plus /> Add Vehicle
          </button>
        )}
      </PageHeader>

      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          empty="No vehicles yet."
        />
      </div>

      {/* CREATE / EDIT */}
      <Modal
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal(null)}
        title={
          modal === "create"
            ? "Add Vehicle"
            : "Edit Vehicle"
        }
      >
        <div className="space-y-4">
          <Field label="Vehicle Name" required error={err.name}>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className={`field-input ${
                err.name ? "border-rose/50" : ""
              }`}
            />
          </Field>

          <Field
            label="Plate Number"
            required
            error={err.plate_number}
          >
            <input
              name="plate_number"
              value={form.plate_number}
              onChange={handleChange}
              className={`field-input ${
                err.plate_number ? "border-rose/50" : ""
              }`}
            />
          </Field>

          <Field
            label="Capacity (kg)"
            required
            error={err.capacity}
          >
            <input
              name="capacity"
              type="number"
              value={form.capacity}
              onChange={handleChange}
              className={`field-input ${
                err.capacity ? "border-rose/50" : ""
              }`}
            />
          </Field>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-plate">
          <button
            className="btn-outline"
            onClick={() => setModal(null)}
          >
            Cancel
          </button>

          <button
            className="btn-primary"
            onClick={save}
            disabled={saving}
          >
            {saving && <Spinner size="sm" />}
            {modal === "create"
              ? "Add Vehicle"
              : "Save"}
          </button>
        </div>
      </Modal>

      {/* STATUS */}
      <Modal
        open={modal === "status"}
        onClose={() => setModal(null)}
        title="Change Status"
      >
        <p className="text-sm text-ghost mb-4">
          Current: <StatusBadge status={sel?.status} />
        </p>

        <div className="space-y-2">
          {["AVAILABLE", "IN_SHOP", "RETIRED"].map((s) => (
            <button
              key={s}
              disabled={sel?.status === s || saving}
              onClick={() => setStatus(s)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-display font-semibold
              ${
                sel?.status === s
                  ? "border-amber/30 bg-amber/10 text-amber"
                  : "border-wire bg-plate hover:border-dim text-light"
              }`}
            >
              <span
                className={`dot ${
                  s === "AVAILABLE"
                    ? "bg-jade"
                    : s === "IN_SHOP"
                    ? "bg-amber"
                    : "bg-dim"
                }`}
              />
              {s}
              {sel?.status === s && (
                <span className="ml-auto text-xs text-dim">
                  Current
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex justify-end mt-4 pt-4 border-t border-plate">
          <button
            className="btn-outline"
            onClick={() => setModal(null)}
          >
            Close
          </button>
        </div>
      </Modal>

      <ConfirmModal
        open={modal === "confirm"}
        onClose={() => setModal(null)}
        onConfirm={del}
        title="Delete Vehicle"
        message={`Delete "${sel?.name}" (${sel?.plate_number})?`}
      />
    </div>
  );
}

const Plus = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M12 5v14M5 12h14" />
  </svg>
);