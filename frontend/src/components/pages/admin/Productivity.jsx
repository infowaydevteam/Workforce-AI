import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Users, Award, Clock } from "lucide-react";
import { API_BASE_URL } from "../../../../config";

const fmt = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const scoreColor = (score) => {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
};

const Productivity = () => {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const [ranking, setRanking] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchRanking = async () => {
    setLoading(true);
    const params = from && to ? `?from=${from}&to=${to}` : "";
    const res = await fetch(`${API_BASE_URL}/api/productivity/team${params}`, { headers });
    if (res.ok) setRanking(await res.json());
    setLoading(false);
  };

  useEffect(() => { fetchRanking(); }, []);

  const avg = ranking.length > 0 ? Math.round(ranking.reduce((s, r) => s + Number(r.score), 0) / ranking.length) : 0;
  const top = ranking[0];

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Productivity</h1>
          <p className="text-gray-500 text-sm mt-1">Productivity scores based on classified app usage</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-gray-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
          <button onClick={fetchRanking} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all">
            Filter
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
              <TrendingUp size={18} className="text-indigo-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Avg Score</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{avg}%</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Award size={18} className="text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Top Performer</span>
          </div>
          <p className="text-lg font-bold text-gray-900 truncate">{top?.name || "—"}</p>
          {top && <p className="text-sm text-green-600 font-medium">{top.score}% productive</p>}
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users size={18} className="text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-600">Total Tracked</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{ranking.length}</p>
        </div>
      </div>

      {/* Chart */}
      {ranking.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Productivity Score by Employee</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ranking.slice(0, 15)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}%`, "Score"]} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {ranking.slice(0, 15).map((entry, i) => (
                  <Cell key={i} fill={scoreColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["#", "Employee", "Organization", "Team", "Department", "Score", "Active Time", "Productive", "Unproductive"].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={9} className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : ranking.map((row, i) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-5 py-3.5 text-gray-400 text-xs">{i + 1}</td>
                <td className="px-5 py-3.5 font-medium text-gray-800">{row.name}</td>
                <td className="px-5 py-3.5 text-gray-500">{row.organization_name || "—"}</td>
                <td className="px-5 py-3.5 text-gray-500">{row.team_name || "—"}</td>
                <td className="px-5 py-3.5 text-gray-500">{row.department_name || "—"}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5 w-16">
                      <div className="h-1.5 rounded-full" style={{ width: `${row.score}%`, backgroundColor: scoreColor(row.score) }} />
                    </div>
                    <span className="text-xs font-bold" style={{ color: scoreColor(row.score) }}>{row.score}%</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-gray-600">{fmt(row.total_active_time)}</td>
                <td className="px-5 py-3.5 text-green-600">{fmt(row.productive_time)}</td>
                <td className="px-5 py-3.5 text-red-500">{fmt(row.unproductive_time)}</td>
              </tr>
            ))}
            {!loading && ranking.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">No data. Ensure apps are classified and employees are active.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Productivity;
