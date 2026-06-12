import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../../config";
import { Download } from "lucide-react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const COLORS = ["#4f46e5", "#22c55e"];

// ===================== FORMATTERS =====================
const formatDuration = (sec) => {
  sec = Number(sec || 0);

  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const formatDate = (date) =>
  date ? new Date(date).toLocaleString("en-IN") : "-";

// ===================== CARD =====================
const Card = ({ title, value }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border">
    <p className="text-slate-500 text-sm">{title}</p>
    <h2 className="text-2xl font-bold mt-2">{value}</h2>
  </div>
);

const Reports = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [report, setReport] = useState(null);

  const token = localStorage.getItem("token");

  // ===================== FETCH EMPLOYEES =====================
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/employee`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        setEmployees(data);
      } catch (err) {
        console.log(err);
      }
    };

    fetchEmployees();
  }, []);

  // ===================== GENERATE REPORT =====================
  const generateReport = async () => {
    if (!selectedUser) return alert("Select Employee");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/employee/reports/${selectedUser}?from=${fromDate}&to=${toDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      setReport(data);
    } catch (err) {
      console.log(err);
    }
  };

  // ===================== EXPORT =====================
  const exportReport = () => {
    if (!report) return;

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "report.json";
    a.click();
  };

  // ===================== LOADING STATE =====================
  if (!report) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          <div className="bg-gradient-to-r from-indigo-700 to-purple-700 rounded-3xl p-8 text-white">
            <h1 className="text-4xl font-bold">Reports</h1>
            <p className="text-indigo-100 mt-2">
              Generate Employee Reports
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm grid lg:grid-cols-4 gap-4">

            <select
              className="border rounded-xl p-3"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">Select Employee</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              className="border rounded-xl p-3"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />

            <input
              type="date"
              className="border rounded-xl p-3"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />

            <button
              onClick={generateReport}
              className="bg-indigo-600 text-white rounded-xl flex items-center justify-center"
            >
              Generate Report
            </button>

          </div>

        </div>
      </div>
    );
  }

  // ===================== SAFE DATA =====================
  const pieData = [
    { name: "Active", value: report?.summary?.active_time || 0 },
    { name: "Idle", value: report?.summary?.idle_time || 0 },
  ];

  const appChart = (report?.appUsage || []).map((a) => ({
    name: a.app_name,
    usage: Number(a.total_duration),
  }));

  const productivity =
    report.summary.total_working_time > 0
      ? Math.round(
          (report.summary.active_time /
            report.summary.total_working_time) *
            100
        )
      : 0;

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 rounded-3xl p-8 text-white flex justify-between">
          <div>
            <h1 className="text-3xl font-bold">{report.user.name}</h1>
            <p className="text-indigo-100">{report.user.email}</p>
          </div>

          <button
            onClick={exportReport}
            className="bg-white text-indigo-700 px-4 py-2 rounded-xl flex items-center gap-2"
          >
            <Download size={18} />
            Export
          </button>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">

          <Card
            title="Work Hours"
            value={formatDuration(report.summary.total_working_time)}
          />

          <Card
            title="Active Time"
            value={formatDuration(report.summary.active_time)}
          />

          <Card
            title="Idle Time"
            value={formatDuration(report.summary.idle_time)}
          />

          <Card
            title="Sessions"
            value={report.summary.total_sessions || 0}
          />

          <Card
            title="Productivity"
            value={`${productivity}%`}
          />

        </div>

        {/* CHARTS */}
        <div className="grid md:grid-cols-2 gap-6">

          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="font-bold mb-4">Active vs Idle</h2>

            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" outerRadius={100} label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>

          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <h2 className="font-bold mb-4">App Usage</h2>

            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={appChart}>
                <CartesianGrid />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(v) => formatDuration(v)} />
                <Bar dataKey="usage" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>

          </div>

        </div>

        {/* ACTIVITY TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">

          <h2 className="font-bold mb-4">Activity Logs</h2>

          <table className="w-full text-sm">

            <thead>
              <tr className="text-left border-b">
                <th className="p-3">App</th>
                <th className="p-3">Start</th>
                <th className="p-3">End</th>
                <th className="p-3">Duration</th>
              </tr>
            </thead>

            <tbody>
              {(report.activityLogs || []).map((a, i) => (
                <tr key={i} className="border-b hover:bg-slate-50">
                  <td className="p-3">{a.app_name}</td>
                  <td className="p-3">{formatDate(a.start_time)}</td>
                  <td className="p-3">{formatDate(a.end_time)}</td>
                  <td className="p-3">{formatDuration(a.duration)}</td>
                </tr>
              ))}
            </tbody>

          </table>

        </div>

        {/* ===================== NEW ADDITION (CLEAN WEEKLY VIEW) ===================== */}
        {report.weeklySummary?.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <h2 className="font-bold mb-4">Weekly Summary</h2>

            <div className="space-y-2">
              {report.weeklySummary.map((w, i) => (
                <div key={i} className="flex justify-between border-b py-2">
                  <span>
                    {new Date(w.week).toLocaleDateString("en-IN")}
                  </span>
                  <span>{formatDuration(w.total_time)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default Reports;