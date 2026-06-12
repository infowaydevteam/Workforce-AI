import React, { useEffect, useState } from "react";
import { Users, Building2, Layers } from "lucide-react";
import { API_BASE_URL } from "../../../../config";
import Pagination from "../../Pagination";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart, Line
} from "recharts";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrganizations: 0,
    totalTeams: 0,

    onlineUsers: 0,
    idleUsers: 0,
    offlineUsers: 0,
  });

  const Navigate = useNavigate();


  const [activities, setActivities] = useState([]);
  const [liveUsers, setLiveUsers] = useState([]);
  const [orgSummary, setOrgSummary] = useState([]);
  const [topApps, setTopApps] = useState([]);


  const statusData = [
    { name: "Online", value: stats.onlineUsers },
    { name: "Idle", value: stats.idleUsers },
    { name: "Offline", value: stats.offlineUsers },
  ];

  // const COLORS = ["#22c55e", "#facc15", "#9ca3af"];

  const orgChartData = orgSummary.map((org) => ({
    name: org.name,
    value: Number(org.employee_count),
  }));

  const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4"];

    console.log("activities =", activities);

  const activityChartData = activities.map((a) => ({
    time: new Date(a.start_time).toLocaleTimeString(),
    usage: 1,
  }));



  const appChartData = topApps.map((app) => ({
    name: app.app_name,
    usage: Number(app.total_duration),
  }));

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE_URL}/api/dashboard/stats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      setStats(data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchActivities = async () => {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_BASE_URL}/api/dashboard/recent-activities`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();

    setActivities(data);
  };

  const fetchLiveUsers = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE_URL}/api/dashboard/live-users`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      console.log("LIVE USERS =>", data);

      setLiveUsers(data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchOrganizationSummary = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE_URL}/api/dashboard/organization-summary`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      setOrgSummary(data);
    } catch (err) {
      console.log(err);
    }
  };

  const fetchTopApps = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch(
        `${API_BASE_URL}/api/dashboard/top-apps`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();
      console.log("TOP APPS:", data);
      setTopApps(data);
    } catch (err) {
      console.log(err);
    }
  };


  useEffect(() => {
    fetchStats();
    fetchActivities();
    fetchLiveUsers();
    fetchOrganizationSummary();
    fetchTopApps();

    const interval = setInterval(() => {
      fetchStats();
      fetchActivities();
      fetchLiveUsers();
      fetchOrganizationSummary();
      fetchTopApps();
    }, 10000); // हर 10 sec refresh

    return () => clearInterval(interval);
  }, []);


  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: <Users size={28} />,
      color: "bg-blue-100 text-blue-600",
    },
    {
      title: "Online Users",
      value: stats.onlineUsers,
      icon: <Users size={28} />,
      color: "bg-green-100 text-green-600",
    },
    {
      title: "Organizations",
      value: stats.totalOrganizations,
      icon: <Building2 size={28} />,
      color: "bg-purple-100 text-purple-600",
    },
    {
      title: "Teams",
      value: stats.totalTeams,
      icon: <Layers size={28} />,
      color: "bg-orange-100 text-orange-600",
    },
  ];



  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-10">

        {/* HEADER */}
        <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-8 text-white shadow-xl">
          <h1 className="text-4xl font-bold">
            Workforce Intelligence Dashboard
          </h1>

          <p className="text-indigo-100 mt-2 text-lg">
            Real-time employee productivity & workforce monitoring
          </p>

          <div className="flex gap-4 mt-6">
            <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur">
              <span className="text-sm">🟢 Online</span>
              <p className="font-bold text-xl">{stats.onlineUsers}</p>
            </div>

            <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur">
              <span className="text-sm">🟡 Idle</span>
              <p className="font-bold text-xl">{stats.idleUsers}</p>
            </div>

            <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur">
              <span className="text-sm">⚫ Offline</span>
              <p className="font-bold text-xl">{stats.offlineUsers}</p>
            </div>
          </div>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex items-center justify-between"
            >
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider">
                  {card.title}
                </p>
                <h2 className="text-3xl font-bold text-slate-800 mt-2">
                  {card.value}
                </h2>
              </div>

              <div className={`p-3 rounded-xl ${card.color}`}>
                {card.icon}
              </div>
            </div>
          ))}
        </div>

        {/* CHART ROW 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* USER STATUS PIE */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              User Status Overview
            </h2>

            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label
                  >
                    {statusData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RECENT ACTIVITY LINE */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Activity Trend
            </h2>

            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={activityChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="usage"
                    stroke="#22c55e"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>

            </div>
          </div>
        </div>

        {/* CHART ROW 2 */}


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LIVE USERS */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <h2 className="text-lg font-semibold mb-5">
              Live Users
            </h2>

            <div className="space-y-4">
              {liveUsers.slice(0, 8).map((user, index) => (
                <div
                  key={index}
                  onClick={() => Navigate(`/admin/employee/${user.id}`)}
                  className="flex items-center justify-between border-b border-slate-100 pb-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-600">
                      {user.name?.charAt(0)}
                    </div>

                    <div>
                      <p className="font-medium text-slate-800">
                        {user.name}
                      </p>

                      <p className="text-xs text-slate-500">
                        {user.organization_name}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`flex items-center gap-2 text-sm font-medium
    ${user.status?.toLowerCase() === "online"
                        ? "text-green-600"
                        : user.status?.toLowerCase() === "idle"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }
  `}
                  >
                    <div
                      className={`w-2 h-2 rounded-full
      ${user.status?.toLowerCase() === "online"
                          ? "bg-green-500 animate-pulse"
                          : user.status?.toLowerCase() === "idle"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }
    `}
                    ></div>

                    {user.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT ACTIVITIES */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <h2 className="text-lg font-semibold mb-5">
              Recent Activities
            </h2>

            <div className="space-y-3 max-h-[400px] overflow-auto">
              {activities.slice(0, 15).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl"
                >
                  <div className="w-3 h-3 rounded-full bg-indigo-500"></div>

                  <div>
                    <p className="font-medium">
                      {activity.user_name}
                    </p>

                    <p className="text-sm text-slate-500">
                      {activity.app_name}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* ORGANIZATION PIE */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <h2 className="text-lg font-semibold mb-5">
              Organization Distribution
            </h2>

            <div className="space-y-5">
              {orgSummary.map((org, index) => (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{org.name}</span>
                    <span>{org.employee_count}</span>
                  </div>

                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 rounded-full"
                      style={{
                        width: `${Math.min(
                          (org.employee_count /
                            stats.totalUsers) *
                          100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TOP APPS BAR */}
          <div className="bg-white p-6 rounded-3xl border shadow-sm">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              Top Applications
            </h2>

            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />

                  <Bar dataKey="usage" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>


        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;





