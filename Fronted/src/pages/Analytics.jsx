import { useEffect, useState } from "react";
import { analyticsAPI } from "../services/api";
import { useToast } from "../contexts/ToastContext";
import { Spinner, PageHeader } from "../components/UI";
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from "recharts";

const COLORS = ["#F59E0B", "#38BDF8", "#10B981", "#8B5CF6", "#F43F5E", "#FB923C"];

const Tip = ({ active, payload, label, prefix = "", suffix = "" }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-deck border border-plate rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="font-display font-semibold text-ghost mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="text-mono">
          {p.name}: {prefix}{typeof p.value === "number" ? p.value.toFixed(1) : p.value}{suffix}
        </p>
      ))}
    </div>
  );
};

const Empty = ({ msg }) => (
  <div className="h-36 flex flex-col items-center justify-center text-ghost text-sm gap-2">
    <svg className="w-7 h-7 text-wire" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
    {msg}
  </div>
);

const Section = ({ title, sub, children }) => (
  <div className="card card-body">
    <div className="mb-4">
      <p className="font-display font-bold text-snow">{title}</p>
      {sub && <p className="text-xs text-ghost mt-0.5">{sub}</p>}
    </div>
    {children}
  </div>
);

const AX = { tick: { fill: "#637898", fontSize: 11, fontFamily: "JetBrains Mono" }, axisLine: false, tickLine: false };

export default function Analytics() {
  const toast = useToast();
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setLoading(true);
    Promise.all([
      analyticsAPI.fuelSummary(),
      analyticsAPI.maintenanceSummary(),
      analyticsAPI.tripStats(),
      analyticsAPI.monthlyCosts(year),
    ]).then(([f, m, t, mc]) => {
      setData({ fuel: f.data.data, maint: m.data.data, trips: t.data.data, monthly: mc.data.data });
    }).catch(() => toast.error("Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [year]);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  const { fuel = [], maint = [], trips = [], monthly = [] } = data;

  // Chart data
  const fuelChart = fuel
    .filter((v) => parseInt(v.total_liters) > 0)
    .map((v) => ({ name: v.vehicle_name?.split(" ")[0] || v.plate_number, liters: parseInt(v.total_liters), cost: parseInt(v.total_fuel_cost) }))
    .slice(0, 10);

  const maintChart = maint
    .filter((v) => parseInt(v.total_maintenance_cost) > 0)
    .map((v) => ({ name: v.vehicle_name?.split(" ")[0] || v.plate_number, cost: parseInt(v.total_maintenance_cost), services: parseInt(v.service_count) }))
    .slice(0, 10);

  const tripChart = trips
    .filter((v) => parseInt(v.completed_trips) > 0)
    .map((v) => ({ name: v.vehicle_name?.split(" ")[0] || v.plate_number, completed: parseInt(v.completed_trips), cancelled: parseInt(v.cancelled_trips), cargo: parseInt(v.total_cargo_kg) }))
    .slice(0, 10);

  const monthlyChart = monthly.map((m) => ({
    month: m.month,
    fuel: parseInt(m.fuel_cost || 0),
    maintenance: parseInt(m.maintenance_cost || 0),
    total: parseInt(m.total_cost || 0),
  }));

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader title="Analytics" sub="Fleet performance & cost intelligence">
        <select className="field-select text-xs py-2 w-28" value={year} onChange={(e) => setYear(e.target.value)}>
          {[2023, 2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
        </select>
      </PageHeader>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Fuel per vehicle */}
        <Section title="Fuel Consumption by Vehicle" sub="Total liters per vehicle">
          {!fuelChart.length ? <Empty msg="No fuel logs yet." /> : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={fuelChart} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#161D2E" vertical={false} />
                <XAxis dataKey="name" {...AX} />
                <YAxis {...AX} />
                <Tooltip content={<Tip suffix=" L" />} />
                <Bar dataKey="liters" name="Liters" radius={[4,4,0,0]}>
                  {fuelChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        {/* Maintenance cost per vehicle */}
        <Section title="Maintenance Cost by Vehicle" sub="Total ₹ spent on maintenance">
          {!maintChart.length ? <Empty msg="No maintenance logs yet." /> : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={maintChart} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#161D2E" vertical={false} />
                <XAxis dataKey="name" {...AX} />
                <YAxis {...AX} />
                <Tooltip content={<Tip prefix="₹" />} />
                <Bar dataKey="cost" name="Cost" radius={[4,4,0,0]}>
                  {maintChart.map((_, i) => <Cell key={i} fill={COLORS[(i+1) % COLORS.length]} fillOpacity={0.85} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>

        {/* Monthly costs */}
        <Section title={`Monthly Costs — ${year}`} sub="Fuel + maintenance spend by month">
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={monthlyChart} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <defs>
                <linearGradient id="gFuel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gMaint" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#161D2E" vertical={false} />
              <XAxis dataKey="month" {...AX} />
              <YAxis {...AX} />
              <Tooltip content={<Tip prefix="₹" />} />
              <Legend wrapperStyle={{ color: "#637898", fontSize: 11 }} />
              <Area type="monotone" dataKey="fuel" name="Fuel" stroke="#F59E0B" fill="url(#gFuel)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="maintenance" name="Maintenance" stroke="#38BDF8" fill="url(#gMaint)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        {/* Trip completion by vehicle */}
        <Section title="Trip Activity by Vehicle" sub="Completed vs cancelled trips">
          {!tripChart.length ? <Empty msg="No completed trips yet." /> : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={tripChart} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#161D2E" vertical={false} />
                <XAxis dataKey="name" {...AX} />
                <YAxis {...AX} />
                <Tooltip content={<Tip />} />
                <Legend wrapperStyle={{ color: "#637898", fontSize: 11 }} />
                <Bar dataKey="completed" name="Completed" fill="#10B981" fillOpacity={0.85} radius={[4,4,0,0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill="#F43F5E" fillOpacity={0.6}  radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Section>
      </div>

      {/* Cost summary table */}
      {(fuel.length > 0 || maint.length > 0) && (
        <Section title="Vehicle Cost Summary" sub="Total fuel + maintenance per vehicle">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="t-head">
                  <th className="t-th">Vehicle</th>
                  <th className="t-th">Plate</th>
                  <th className="t-th">Fuel Cost</th>
                  <th className="t-th">Maint. Cost</th>
                  <th className="t-th">Total Cost</th>
                  <th className="t-th">Trips Done</th>
                  <th className="t-th">Total Cargo</th>
                </tr>
              </thead>
              <tbody>
                {fuel.map((v) => {
                  const m = maint.find((x) => x.vehicle_id === v.vehicle_id) || {};
                  const t = trips.find((x) => x.vehicle_id === v.vehicle_id) || {};
                  const total = parseInt(v.total_fuel_cost || 0) + parseInt(m.total_maintenance_cost || 0);
                  return (
                    <tr key={v.vehicle_id} className="t-row">
                      <td className="t-td font-display font-semibold text-snow">{v.vehicle_name}</td>
                      <td className="t-td text-mono text-xs text-dim">{v.plate_number}</td>
                      <td className="t-td text-mono text-xs text-amber">₹{parseInt(v.total_fuel_cost || 0).toLocaleString()}</td>
                      <td className="t-td text-mono text-xs text-sky">₹{parseInt(m.total_maintenance_cost || 0).toLocaleString()}</td>
                      <td className="t-td text-mono text-sm font-bold text-light">₹{total.toLocaleString()}</td>
                      <td className="t-td text-mono text-xs text-ghost">{t.completed_trips || 0}</td>
                      <td className="t-td text-mono text-xs text-ghost">{parseInt(t.total_cargo_kg || 0).toLocaleString()} kg</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}