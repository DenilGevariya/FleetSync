import { useEffect, useState } from "react";
import { tripsAPI, vehiclesAPI, driversAPI } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";
import {
  DataTable,
  StatusBadge,
  Modal,
  Spinner,
  PageHeader,
  Field,
} from "../components/UI";

const EMPTY = {
  vehicle_id: "",
  driver_id: "",
  origin: "",
  destination: "",
  cargo_weight: "",
};

export default function Trips() {
  const { can } = useAuth();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState({});
  const [filter, setFilter] = useState("");

  /* ───────── LOAD ───────── */
  const load = () => {
    setLoading(true);

    Promise.all([
      tripsAPI.getAll(),
      vehiclesAPI.getAll({ status: "AVAILABLE" }),
      driversAPI.getAll({ status: "AVAILABLE" }),
    ])
      .then(([t, v, d]) => {
        setRows(t.data.data);
        setVehicles(v.data.data);
        setDrivers(d.data.data);
      })
      .catch(() => toast.error("Failed to load"))
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

  const selVehicle = vehicles.find(
    (v) => String(v.id) === String(form.vehicle_id)
  );

  /* ───────── VALIDATION ───────── */
  const validate = () => {
    const e = {};

    if (!form.vehicle_id) e.vehicle_id = "Select a vehicle";
    if (!form.driver_id) e.driver_id = "Select a driver";
    if (!form.origin.trim()) e.origin = "Required";
    if (!form.destination.trim()) e.destination = "Required";

    if (!form.cargo_weight || parseInt(form.cargo_weight) <= 0)
      e.cargo_weight = "Must be positive";

    if (
      selVehicle &&
      parseInt(form.cargo_weight) > selVehicle.capacity
    ) {
      e.cargo_weight = `Exceeds vehicle capacity (${selVehicle.capacity} kg)`;
    }

    setErr(e);
    return !Object.keys(e).length;
  };

  /* ───────── CREATE ───────── */
  const create = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      await tripsAPI.create({
        ...form,
        cargo_weight: parseInt(form.cargo_weight),
      });

      toast.success("Trip created (DRAFT).");
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ───────── ACTIONS ───────── */
  const dispatch = async (id) => {
    setSaving(true);
    try {
      await tripsAPI.dispatch(id);
      toast.success("Dispatched!");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed.");
    } finally {
      setSaving(false);
    }
  };

  const complete = async (id) => {
    setSaving(true);
    try {
      await tripsAPI.complete(id);
      toast.success("Trip completed!");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed.");
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (id) => {
    if (!confirm("Cancel this trip?")) return;

    try {
      await tripsAPI.cancel(id);
      toast.success("Trip cancelled.");
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed.");
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
        <span className="text-mono text-xs text-amber">
          #{v}
        </span>
      ),
    },
    {
      key: "origin",
      label: "Route",
      render: (v, row) => (
        <div>
          <div className="text-sm text-light">{v}</div>
          <div className="text-xs text-ghost">
            → {row.destination}
          </div>
        </div>
      ),
    },
    {
      key: "vehicle_name",
      label: "Vehicle",
      render: (v, row) => (
        <div>
          <div className="text-sm text-light">
            {v || "—"}
          </div>
          <div className="text-mono text-xs text-dim">
            {row.plate_number}
          </div>
        </div>
      ),
    },
    {
      key: "driver_name",
      label: "Driver",
      render: (v) => (
        <span className="text-sm text-light">
          {v || "—"}
        </span>
      ),
    },
    {
      key: "cargo_weight",
      label: "Cargo",
      render: (v, row) => (
        <div>
          <span className="text-mono text-xs text-ghost">
            {v} kg
          </span>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) =>
        can("MANAGER", "DISPATCHER") && (
          <div className="flex items-center gap-1 flex-wrap">
            {row.status === "DRAFT" && (
              <button
                className="btn-ghost text-xs text-sky"
                disabled={saving}
                onClick={() => dispatch(row.id)}
              >
                Dispatch
              </button>
            )}

            {row.status === "DISPATCHED" && (
              <button
                className="btn-ghost text-xs text-jade"
                disabled={saving}
                onClick={() => complete(row.id)}
              >
                Complete
              </button>
            )}

            {["DRAFT", "DISPATCHED"].includes(row.status) && (
              <button
                className="btn-ghost text-xs text-rose/70 hover:text-rose"
                onClick={() => cancel(row.id)}
              >
                Cancel
              </button>
            )}
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader
        title="Trip Dispatcher"
        sub={`${rows.filter(
          (r) => r.status === "DISPATCHED"
        ).length} active · ${rows.length} total`}
      >
        <select
          className="field-select text-xs py-2 w-36"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All Status</option>
          {["DRAFT", "DISPATCHED", "COMPLETED", "CANCELLED"].map(
            (s) => (
              <option key={s}>{s}</option>
            )
          )}
        </select>

        {can("MANAGER", "DISPATCHER") && (
          <button
            className="btn-primary"
            onClick={() => {
              setForm(EMPTY);
              setErr({});
              setModal("create");
            }}
          >
            <Plus /> New Trip
          </button>
        )}
      </PageHeader>

      <div className="card overflow-hidden">
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          empty="No trips found."
        />
      </div>

      {/* CREATE MODAL */}
      <Modal
        open={modal === "create"}
        onClose={() => setModal(null)}
        title="Create New Trip"
        width="max-w-2xl"
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Vehicle" required error={err.vehicle_id}>
            <select
              name="vehicle_id"
              value={form.vehicle_id}
              onChange={handleChange}
              className={`field-select ${
                err.vehicle_id ? "border-rose/50" : ""
              }`}
            >
              <option value="">Select…</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {v.plate_number} (max {v.capacity} kg)
                </option>
              ))}
            </select>
          </Field>

          <Field label="Driver" required error={err.driver_id}>
            <select
              name="driver_id"
              value={form.driver_id}
              onChange={handleChange}
              className={`field-select ${
                err.driver_id ? "border-rose/50" : ""
              }`}
            >
              <option value="">Select…</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Origin" required error={err.origin}>
            <input
              name="origin"
              value={form.origin}
              onChange={handleChange}
              className="field-input"
            />
          </Field>

          <Field
            label="Destination"
            required
            error={err.destination}
          >
            <input
              name="destination"
              value={form.destination}
              onChange={handleChange}
              className="field-input"
            />
          </Field>

          <Field
            label="Cargo Weight (kg)"
            required
            error={err.cargo_weight}
          >
            <input
              name="cargo_weight"
              type="number"
              value={form.cargo_weight}
              onChange={handleChange}
              className="field-input"
            />
            {selVehicle && !err.cargo_weight && (
              <p className="text-xs text-ghost mt-1">
                Vehicle capacity: {selVehicle.capacity} kg
              </p>
            )}
          </Field>
        </div>

        {selVehicle &&
          form.cargo_weight &&
          parseInt(form.cargo_weight) > selVehicle.capacity && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-rose/10 border border-rose/20 text-rose text-sm">
              Cargo ({form.cargo_weight} kg) exceeds vehicle
              capacity ({selVehicle.capacity} kg)!
            </div>
          )}

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-plate">
          <button
            className="btn-outline"
            onClick={() => setModal(null)}
          >
            Cancel
          </button>

          <button
            className="btn-primary"
            onClick={create}
            disabled={saving}
          >
            {saving && <Spinner size="sm" />} Create Trip
          </button>
        </div>
      </Modal>
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