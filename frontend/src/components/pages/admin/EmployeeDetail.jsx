import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../../../../config";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from "recharts";

const COLORS = ["#4f46e5", "#facc15", "#22c55e"];

// ---------------- TIME FORMATTER ----------------
const formatDuration = (seconds) => {
  const sec = Number(seconds || 0);

  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

// ---------------- DATE FORMAT ----------------
const formatTime = (date) =>
  new Date(date).toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour12: true,
  });

const getTodayDate = () => new Date().toISOString().split("T")[0];

const EmployeeDetail = () => {
  const { id } = useParams();

  const [user, setUser] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [appUsage, setAppUsage] = useState([]);
  const [summary, setSummary] = useState({});
  const [activityLogs, setActivityLogs] = useState([]);

  const [date, setDate] = useState(getTodayDate());

  // ---------------- FETCH ----------------
  const fetchAll = async (selectedDate = date) => {
    const token = localStorage.getItem("token");
    const headers = { Authorization: `Bearer ${token}` };

    const userRes = await fetch(`${API_BASE_URL}/api/employee/${id}`, { headers });

    const loginRes = await fetch(
      `${API_BASE_URL}/api/employee/${id}/login-history?date=${selectedDate}`,
      { headers }
    );

    const appRes = await fetch(
      `${API_BASE_URL}/api/employee/${id}/app-usage?date=${selectedDate}`,
      { headers }
    );

    const summaryRes = await fetch(
      `${API_BASE_URL}/api/employee/${id}/summary?date=${selectedDate}`,
      { headers }
    );

    const activityRes = await fetch(
      `${API_BASE_URL}/api/employee/${id}/activity-logs?date=${selectedDate}`,
      { headers }
    );

    setUser(await userRes.json());
    setLoginHistory(await loginRes.json());
    setAppUsage(await appRes.json());
    setSummary(await summaryRes.json());
    setActivityLogs(await activityRes.json());
  };

  useEffect(() => {
    fetchAll(date);
  }, [id, date]);

  if (!user) {
    return <div className="p-8 text-slate-500">Loading...</div>;
  }

  const loginChart = loginHistory.map((l) => ({
    time: formatTime(l.login_time),
    duration: Number(l.total_duration),
  }));

  const appChart = appUsage.map((a) => ({
    name: a.app_name,
    usage: Number(a.total_duration),
  }));

  console.log("activity",appChart)

  const pieData = [
    { name: "Active", value: Number(summary.active_time || 0) },
    { name: "Idle", value: Number(summary.idle_time || 0) },
  ];

  const OFFLINE_TIME =
    28800 - Number(summary.total_working_time || 0);

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER + DATE FILTER */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 p-8 rounded-3xl shadow-xl text-white flex justify-between items-center">

          {/* User Info */}
          <div className="flex items-center gap-5">

            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center text-3xl font-bold">
              {user.name?.charAt(0)}
            </div>

            <div>
              <h2 className="text-3xl font-bold">
                {user.name}
              </h2>

              <p className="text-indigo-100 mt-1">
                {user.email}
              </p>
            </div>

          </div>

          {/* Right Side */}
          <div className="flex items-center gap-6">

            {/* Date Picker */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3">

              <p className="text-xs text-indigo-100 mb-1 uppercase tracking-wider">
                Select Date
              </p>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="
          bg-transparent
          text-white
          outline-none
          border-none
          cursor-pointer
        "
              />
            </div>

            {/* Last Active */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-5 py-3 text-right">

              <p className="text-xs text-indigo-100 uppercase tracking-wider">
                Last Active
              </p>

              <p className="font-semibold text-white mt-1">
                {user.last_active
                  ? formatTime(user.last_active)
                  : "Never Active"}
              </p>

            </div>

          </div>

        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* <div className="bg-white p-5 rounded-2xl border shadow-sm">
            <p className="text-slate-500 text-sm">Sessions</p>
            <h3 className="text-xl font-bold">{summary.total_sessions}</h3>
          </div> */}

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Working Time</p>
            <h3 className="text-3xl font-bold mt-3">
              {formatDuration(summary.total_working_time)}
            </h3>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Active Time</p>
            <h3 className="text-3xl font-bold mt-3">{formatDuration(summary.active_time)}</h3>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Idle Time</p>
            <h3 className="text-3xl font-bold mt-3">{formatDuration(summary.idle_time)}</h3>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
            <p className="text-xs uppercase tracking-wider text-slate-500 font-medium">Offline Time</p>
            <h3 className="text-3xl font-bold mt-3">
              {formatDuration(Math.max(OFFLINE_TIME, 0))}
            </h3>
          </div>

        </div>

        {/* CHARTS */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* LOGIN TIMELINE */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="font-bold mb-4">Login Timeline</h2>

            <div className="space-y-3 max-h-[250px] overflow-auto">
              {loginHistory.map((l, i) => (
                <div key={i} className="flex justify-between items-center bg-slate-50 hover:bg-indigo-50 transition-all p-4 rounded-2xl">
                  <span>{formatTime(l.login_time)}</span>
                  <span className="text-slate-500">→ {formatTime(l.logout_time)}</span>
                  <span className="text-indigo-600 font-semibold">
                    {formatDuration(l.total_duration)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* APP USAGE */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Application Usage</h2>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={appChart}>
                <CartesianGrid />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v) => formatDuration(v)} />
                <Bar dataKey="usage" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PIE */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Activity Distribution</h2>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" outerRadius={120} label>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatDuration(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* ACTIVITY LOGS */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b bg-slate-50">
            <h2 className="text-lg font-bold text-slate-800">
              Activity Logs
            </h2>
          </div>

          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">App</th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">Start</th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">End</th>
                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider font-semibold text-slate-500">Duration</th>
              </tr>
            </thead>

            <tbody>
              {activityLogs.map((a, i) => (
                <tr key={i} className="border-t hover:bg-slate-50 transition-all">
                  <td className="px-6 py-4">{a.app_name}</td>
                  <td className="px-6 py-4">{formatTime(a.start_time)}</td>
                  <td className="px-6 py-4">{formatTime(a.end_time)}</td>
                  <td className="px-6 py-4">{formatDuration(a.duration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default EmployeeDetail;