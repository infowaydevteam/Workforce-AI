import React, { useEffect, useState } from "react";
import { Users, TrendingUp, Clock, Award } from "lucide-react";
import { API_BASE_URL } from "../../../../config";
import { useNavigate } from "react-router-dom";

const fmt = (secs) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const scoreColor = (score) => {
  if (score >= 70) return "text-green-600";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
};

const ManagerDashboard = () => {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const navigate = useNavigate();
  const [team, setTeam] = useState([]);
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();

  useEffect(() => {
    const fetch_ = async () => {
      const res = await fetch(`${API_BASE_URL}/api/productivity/my-team`, { headers });
      if (res.ok) setTeam(await res.json());
    };
    fetch_();
    const interval = setInterval(fetch_, 30000);
    return () => clearInterval(interval);
  }, []);

  const online = team.filter((m) => m.status === "Online").length;
  const avg = team.length > 0 ? Math.round(team.reduce((s, m) => s + Number(m.score), 0) / team.length) : 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back, {user?.name} — here's your team overview</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Users size={18} className="text-blue-600" /></div>
            <span className="text-sm font-medium text-gray-600">Team Size</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{team.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center"><Clock size={18} className="text-green-600" /></div>
            <span className="text-sm font-medium text-gray-600">Online Now</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{online}</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center"><TrendingUp size={18} className="text-indigo-600" /></div>
            <span className="text-sm font-medium text-gray-600">Avg Productivity</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{avg}%</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">Team Members</h2>
          <button onClick={() => navigate("/manager/productivity")} className="text-xs text-indigo-600 hover:underline font-medium">View full productivity →</button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Name", "Status", "Department", "Score", "Active Time", "Productive Time"].map((h) => (
                <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {team.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-5 py-3 font-medium text-gray-800">{m.name}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.status === "Online" ? "bg-green-100 text-green-700" : m.status === "Idle" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
                    {m.status}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-500">{m.department_name || "—"}</td>
                <td className="px-5 py-3">
                  <span className={`text-sm font-bold ${scoreColor(m.score)}`}>{m.score}%</span>
                </td>
                <td className="px-5 py-3 text-gray-600">{fmt(m.total_active_time)}</td>
                <td className="px-5 py-3 text-green-600">{fmt(m.productive_time)}</td>
              </tr>
            ))}
            {team.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No team members in your departments yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagerDashboard;
