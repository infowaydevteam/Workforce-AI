import React, { useEffect, useState } from "react";
import { Users, UserPlus, Building2, Clock } from "lucide-react";
import { API_BASE_URL } from "../../../../config";
import { useNavigate } from "react-router-dom";

const HrDashboard = () => {
  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };
  const navigate = useNavigate();
  const user = (() => { try { return JSON.parse(localStorage.getItem("user")); } catch { return null; } })();

  const [employees, setEmployees] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    const fetchAll = async () => {
      const [eRes, iRes, dRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/employee`, { headers }),
        fetch(`${API_BASE_URL}/api/invitations`, { headers }),
        fetch(`${API_BASE_URL}/api/departments`, { headers }),
      ]);
      if (eRes.ok) setEmployees(await eRes.json());
      if (iRes.ok) setInvitations(await iRes.json());
      if (dRes.ok) setDepartments(await dRes.json());
    };
    fetchAll();
  }, []);

  const pendingInvites = invitations.filter((i) => !i.used && new Date(i.expires_at) > new Date());
  const online = employees.filter((e) => e.status === "Online").length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome, {user?.name} — manage your workforce</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Employees", value: employees.length, icon: <Users size={18} />, color: "blue" },
          { label: "Online Now", value: online, icon: <Clock size={18} />, color: "green" },
          { label: "Pending Invites", value: pendingInvites.length, icon: <UserPlus size={18} />, color: "amber" },
          { label: "Departments", value: departments.length, icon: <Building2 size={18} />, color: "purple" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 rounded-xl bg-${card.color}-50 flex items-center justify-center mb-3`}>
              <span className={`text-${card.color}-600`}>{card.icon}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Recent Employees */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Employees</h3>
            <button onClick={() => navigate("/hr/employees")} className="text-xs text-indigo-600 hover:underline">View all →</button>
          </div>
          <div className="divide-y divide-gray-50">
            {employees.slice(0, 6).map((e) => (
              <div key={e.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.name}</p>
                  <p className="text-xs text-gray-400">{e.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${e.status === "Online" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{e.status}</span>
              </div>
            ))}
            {employees.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No employees yet</p>}
          </div>
        </div>

        {/* Pending Invitations */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Pending Invitations</h3>
            <button onClick={() => navigate("/hr/invitations")} className="text-xs text-indigo-600 hover:underline">Manage →</button>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingInvites.slice(0, 6).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{inv.email}</p>
                  <p className="text-xs text-gray-400 capitalize">{inv.role} • Expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                </div>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Pending</span>
              </div>
            ))}
            {pendingInvites.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No pending invitations</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HrDashboard;
