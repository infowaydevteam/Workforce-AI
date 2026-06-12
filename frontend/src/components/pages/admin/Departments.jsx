import React, { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Building2, X, Check } from "lucide-react";
import { API_BASE_URL } from "../../../../config";

const Departments = () => {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [departments, setDepartments] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [managers, setManagers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", organization_id: "", manager_id: "" });
  const [error, setError] = useState("");

  const fetchAll = async () => {
    const [dRes, oRes, uRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/departments`, { headers }),
      fetch(`${API_BASE_URL}/api/organization`, { headers }),
      fetch(`${API_BASE_URL}/api/employee`, { headers }),
    ]);
    if (dRes.ok) setDepartments(await dRes.json());
    if (oRes.ok) setOrganizations(await oRes.json());
    if (uRes.ok) {
      const users = await uRes.json();
      setManagers(users.filter((u) => ["manager", "user", "hr"].includes(u.role)));
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", organization_id: "", manager_id: "" });
    setError("");
    setShowModal(true);
  };

  const openEdit = (dept) => {
    setEditing(dept);
    setForm({ name: dept.name, organization_id: dept.organization_id || "", manager_id: dept.manager_id || "" });
    setError("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const url = editing ? `${API_BASE_URL}/api/departments/${editing.id}` : `${API_BASE_URL}/api/departments`;
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.message || "Failed"); return; }
    setShowModal(false);
    fetchAll();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this department?")) return;
    await fetch(`${API_BASE_URL}/api/departments/${id}`, { method: "DELETE", headers });
    fetchAll();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
          <p className="text-gray-500 text-sm mt-1">Organize your workforce into departments with assigned managers</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all">
          <Plus size={18} /> New Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <div key={dept.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <Building2 size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                  <p className="text-xs text-gray-500">{dept.organization_name || "No organization"}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(dept)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                  <Pencil size={15} />
                </button>
                <button onClick={() => handleDelete(dept.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Manager:</span> {dept.manager_name || <span className="text-gray-400 italic">Unassigned</span>}</p>
              <p><span className="font-medium">Members:</span> {dept.employee_count}</p>
            </div>
          </div>
        ))}

        {departments.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No departments yet</p>
            <p className="text-sm">Create your first department to get started</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">{editing ? "Edit Department" : "New Department"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Department Name *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  placeholder="e.g. Engineering"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Organization</label>
                <select
                  value={form.organization_id}
                  onChange={(e) => setForm({ ...form, organization_id: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                >
                  <option value="">Select organization</option>
                  {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Manager</label>
                <select
                  value={form.manager_id}
                  onChange={(e) => setForm({ ...form, manager_id: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                >
                  <option value="">Unassigned</option>
                  {managers.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.email})</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-all">
                  Cancel
                </button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium transition-all">
                  {editing ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
