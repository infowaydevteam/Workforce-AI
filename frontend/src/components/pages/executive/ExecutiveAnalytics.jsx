import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Users, TrendingUp, Building2, Award } from "lucide-react";
import { API_BASE_URL } from "../../../../config";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

const fmt = (secs) => {
  const h = Math.floor(secs / 3600);
  return h > 0 ? `${h}h` : "<1h";
};

const ExecutiveAnalytics = () => {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();

  const [data, setData] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const params = from && to ? `?from=${from}&to=${to}` : "";
    const res = await fetch(`${API_BASE_URL}/api/productivity/executive${params}`, { headers });
    if (res.ok) setData(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const productiveApps = data?.top_apps?.filter((a) => a.is_productive) || [];
  const unproductiveApps = data?.top_apps?.filter((a) => !a.is_productive) || [];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Analytics</h1>
          <p className="text-gray-500 text-sm mt-1">Company-wide workforce intelligence overview</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          <button onClick={fetchData} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all">
            Apply
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-400">Loading analytics...</div>
      ) : data ? (
        <>
          {/* Headline Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Users size={18} className="text-blue-600" /></div>
                <span className="text-sm font-medium text-gray-600">Total Employees</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{data.headline?.total_employees || 0}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><TrendingUp size={18} className="text-green-600" /></div>
                <span className="text-sm font-medium text-gray-600">Online Right Now</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{data.headline?.online_now || 0}</p>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center"><Award size={18} className="text-purple-600" /></div>
                <span className="text-sm font-medium text-gray-600">Managers</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{data.headline?.total_managers || 0}</p>
            </div>
          </div>

          {/* Organization Productivity */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Productivity by Organization</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.by_organization} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="organization" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [`${v}%`, "Score"]} />
                  <Bar dataKey="productivity_score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Headcount by Organization</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={data.by_organization} dataKey="headcount" nameKey="organization" cx="50%" cy="50%" outerRadius={80} label={({ organization, headcount }) => `${organization}: ${headcount}`}>
                    {data.by_organization.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Org Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Organization Summary</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Organization", "Headcount", "Productivity Score", "Active Time", "Productive Time"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.by_organization.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-800">{org.organization}</td>
                    <td className="px-5 py-3 text-gray-600">{org.headcount}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${org.productivity_score}%` }} />
                        </div>
                        <span className="text-xs font-bold text-indigo-700">{org.productivity_score}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">{fmt(org.total_active_time)}</td>
                    <td className="px-5 py-3 text-green-600">{fmt(org.productive_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Top Apps */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Productive Apps</h3>
              <div className="space-y-2">
                {productiveApps.slice(0, 5).map((app) => (
                  <div key={app.app_name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{app.app_name}</span>
                    <span className="text-green-600 font-medium">{fmt(app.total_duration)}</span>
                  </div>
                ))}
                {productiveApps.length === 0 && <p className="text-gray-400 text-sm">No productive app data</p>}
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Unproductive Apps</h3>
              <div className="space-y-2">
                {unproductiveApps.slice(0, 5).map((app) => (
                  <div key={app.app_name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{app.app_name}</span>
                    <span className="text-red-500 font-medium">{fmt(app.total_duration)}</span>
                  </div>
                ))}
                {unproductiveApps.length === 0 && <p className="text-gray-400 text-sm">No unproductive app data</p>}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-20 text-gray-400">Failed to load analytics</div>
      )}
    </div>
  );
};

export default ExecutiveAnalytics;
