import { useEffect, useState } from "react";
import { driversAPI } from "../services/api";
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

/* ========= CONSTANT ========= */
const EMPTY = {
  name: "",
  license_number: "",
  license_expiry: "",
};

/* ========= STABLE INPUT (OUTSIDE COMPONENT) ========= */
function DriverInput({
  name,
  label,
  type = "text",
  req,
  value,
  onChange,
  error,
}) {
  return (
    <Field label={label} required={req} error={error}>
      <input
        name={name}
        type={type}
        value={value || ""}
        onChange={onChange}
        className={`field-input ${error ? "border-rose/50" : ""}`}
      />
    </Field>
  );
}

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

  /* ========= LOAD ========= */
  const load = () => {
    setLoading(true);
    driversAPI
      .getAll()
      .then((r) => setRows(r.data.data))
      .catch(() => toast.error("Failed to load drivers"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  /* ========= INPUT CHANGE ========= */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* ========= VALIDATION ========= */
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.license_number.trim()) e.license_number = "Required";
    if (!form.license_expiry) e.license_expiry = "Required";
    setErr(e);
    return !Object.keys(e).length;
  };

  /* ========= SAVE ========= */
  const save = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      if (modal === "create") {
        await driversAPI.create(form);
        toast.success("Driver registered.");
      } else {
        await driversAPI.update(sel.id, form);
        toast.success("Driver updated.");
      }

      setModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ========= STATUS ========= */
  const setStatus = async (status) => {
    setSaving(true);
    try {
      await driversAPI.setStatus(sel.id, status);
      toast.success(`Status → ${status}`);
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed.");
    } finally {
      setSaving(false);
    }
  };

  /* ========= DELETE ========= */
  const del = async () => {
    try {
      await driversAPI.delete(sel.id);
      toast.success("Driver deleted.");
      setModal(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || "Cannot delete.");
    }
  };

  /* ========= FILTER ========= */
  const filtered = filter
    ? rows.filter((r) => r.status === filter)
    : rows;

  /* ========= TABLE ========= */
  const columns = [
    { key: "id", label: "#", render: (v) => <span>#{v}</span> },
    { key: "name", label: "Driver" },
    { key: "license_number", label: "License" },
    { key: "license_expiry", label: "Expiry" },
    {
      key: "status",
      label: "Status",
      render: (v) => <StatusBadge status={v} />,
    },
    {
      key: "actions",
      label: "Actions",
      render: (_, row) =>
        can("MANAGER", "SAFETY") && (
          <div className="flex gap-2">
            <button
              className="btn-ghost text-xs"
              onClick={() => {
                setSel(row);
                setForm({
                  name: row.name,
                  license_number: row.license_number,
                  license_expiry:
                    row.license_expiry?.slice(0, 10) || "",
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

            {can("MANAGER") && (
              <button
                className="btn-ghost text-xs text-rose"
                onClick={() => {
                  setSel(row);
                  setModal("confirm");
                }}
              >
                Delete
              </button>
            )}
          </div>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Driver Profiles">
        <select
          className="field-select text-xs py-2 w-36"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All</option>
          {["AVAILABLE", "ON_TRIP", "SUSPENDED"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        {can("MANAGER", "SAFETY") && (
          <button
            className="btn-primary"
            onClick={() => {
              setForm(EMPTY);
              setErr({});
              setModal("create");
            }}
          >
            Add Driver
          </button>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
      />

      {/* CREATE / EDIT */}
      <Modal
        open={modal === "create" || modal === "edit"}
        onClose={() => setModal(null)}
        title={
          modal === "create"
            ? "Register Driver"
            : "Edit Driver"
        }
      >
        <div className="space-y-4">
          <DriverInput
            name="name"
            label="Full Name"
            req
            value={form.name}
            onChange={handleChange}
            error={err.name}
          />

          <DriverInput
            name="license_number"
            label="License Number"
            req
            value={form.license_number}
            onChange={handleChange}
            error={err.license_number}
          />

          <DriverInput
            name="license_expiry"
            label="License Expiry"
            type="date"
            req
            value={form.license_expiry}
            onChange={handleChange}
            error={err.license_expiry}
          />
        </div>

        <div className="flex justify-end gap-3 mt-6">
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
            {saving && <Spinner size="sm" />} Save
          </button>
        </div>
      </Modal>

      {/* STATUS */}
      <Modal
        open={modal === "status"}
        onClose={() => setModal(null)}
        title="Update Status"
      >
        <div className="space-y-2">
          {["AVAILABLE", "SUSPENDED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className="btn-outline w-full"
            >
              {s}
            </button>
          ))}
        </div>
      </Modal>

      {/* DELETE */}
      <ConfirmModal
        open={modal === "confirm"}
        onClose={() => setModal(null)}
        onConfirm={del}
        title="Delete Driver"
        message={`Delete "${sel?.name}"?`}
      />
    </div>
  );
}