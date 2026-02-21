import { useEffect, useState } from "react";
import { analyticsAPI, tripsAPI } from "../services/api";
import { KPICard, Spinner, StatusBadge } from "../components/UI";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [activeTrips, setActiveTrips] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([analyticsAPI.dashboard(), tripsAPI.getAll({ status: "DISPATCHED" })])
      .then(([d, t]) => {
        setData(d.data.data);
        setActiveTrips(t.data.data?.slice(0, 5) || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>;

  const { fleet = {}, drivers = {}, trips = {}, maintenance = {} } = data || {};
  const util = fleet.utilization_rate || 0;

  return (
    <div className="space-y-5 animate-fade-up">
      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active Fleet" value={fleet.on_trip ?? 0} sub={`of ${fleet.total ?? 0} vehicles`} accent="sky" anim="animate-fade-up" icon={<TruckIco />} />
        <KPICard title="Available" value={fleet.available ?? 0} sub="ready for dispatch" accent="jade" anim="animate-fade-up-1" icon={<CheckIco />} />
        <KPICard title="In Maintenance" value={fleet.in_shop ?? 0} sub={`₹${parseInt(maintenance.total_cost || 0).toLocaleString()} logged`} accent="amber" anim="animate-fade-up-2" icon={<WrenchIco />} />
        <KPICard title="Pending Trips" value={trips.draft ?? 0} sub={`${trips.dispatched ?? 0} dispatched`} accent="violet" anim="animate-fade-up-3" icon={<RouteIco />} />
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Utilization" value={`${util}%`} sub="vehicles on trip vs total" accent={util > 60 ? "jade" : util > 30 ? "amber" : "rose"} icon={<ChartIco />} />
        <KPICard title="Expired Licenses" value={drivers.expired_licenses ?? 0} sub="drivers need attention" accent={parseInt(drivers.expired_licenses) > 0 ? "rose" : "jade"} icon={<IdIco />} />
        <KPICard title="Completed Trips" value={trips.completed ?? 0} sub={`${trips.cancelled ?? 0} cancelled`} accent="sky" icon={<DoneIco />} />
      </div>

      {/* Fleet status + Active trips */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Status breakdown */}
        <div className="card card-body">
          <p className="font-display font-bold text-snow mb-4">Fleet Status</p>
          <div className="space-y-3">
            {[
              { label: "Available", val: fleet.available, total: fleet.total, color: "bg-jade" },
              { label: "On Trip",   val: fleet.on_trip,   total: fleet.total, color: "bg-sky" },
              { label: "In Shop",   val: fleet.in_shop,   total: fleet.total, color: "bg-amber" },
              { label: "Retired",   val: fleet.retired,   total: fleet.total, color: "bg-dim" },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ghost">{s.label}</span>
                  <span className="text-mono text-light">{s.val ?? 0}</span>
                </div>
                <div className="h-1.5 bg-plate rounded-full overflow-hidden">
                  <div className={`h-full ${s.color} rounded-full transition-all duration-700`}
                    style={{ width: s.total ? `${((s.val ?? 0) / s.total) * 100}%` : "0%" }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-plate space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-ghost">Drivers On Trip</span>
              <span className="text-mono text-sky">{drivers.on_trip ?? 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-ghost">Suspended Drivers</span>
              <span className={`text-mono ${parseInt(drivers.suspended) > 0 ? "text-rose" : "text-ghost"}`}>{drivers.suspended ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Active trips */}
        <div className="card card-body xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <p className="font-display font-bold text-snow">Active Trips</p>
            <span className="text-mono text-xs text-ghost">{activeTrips.length} dispatched</span>
          </div>
          {activeTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-ghost text-sm gap-2">
              <svg className="w-8 h-8 text-wire" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="5" cy="6" r="2" strokeWidth="1.5"/><circle cx="19" cy="18" r="2" strokeWidth="1.5"/>
                <path d="M5 8v5a4 4 0 004 4h6M19 16V11a4 4 0 00-4-4H9" strokeWidth="1.5"/>
              </svg>
              No trips currently dispatched
            </div>
          ) : (
            <div className="space-y-2">
              {activeTrips.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-plate/50 border border-wire/30 hover:border-wire/60 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-sky/10 border border-sky/20 flex items-center justify-center text-sky flex-shrink-0">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 4v4h-7V8z"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-mono text-xs text-amber">#{t.id}</span>
                      <span className="text-xs text-dim">·</span>
                      <span className="text-xs text-ghost truncate">{t.vehicle_name} ({t.plate_number})</span>
                    </div>
                    <p className="text-sm text-light">{t.origin} → {t.destination}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-ghost">{t.driver_name}</p>
                    <p className="text-mono text-xs text-dim">{t.cargo_weight} kg</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const TruckIco  = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 4v4h-7V8z"/><circle cx="5.5" cy="18.5" r="1.5"/><circle cx="18.5" cy="18.5" r="1.5"/></svg>;
const CheckIco  = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M20 6L9 17l-5-5"/></svg>;
const WrenchIco = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>;
const RouteIco  = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="5" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M5 8v5a4 4 0 004 4h6M19 16V11a4 4 0 00-4-4H9"/></svg>;
const ChartIco  = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IdIco     = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M14 10h4M14 14h2"/></svg>;
const DoneIco   = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/></svg>;