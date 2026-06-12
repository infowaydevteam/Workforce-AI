import React, { useEffect, useState } from "react";
import { Mail, Plus, Trash2, Copy, CheckCheck, X, Clock, CheckCircle } from "lucide-react";
import { API_BASE_URL } from "../../../../config";

const Invitations = () => {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [invitations, setInvitations] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ email: "", role: "user", organization_id: "", team_id: "", department_id: "" });
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);

  const fetchAll = async () => {
    const [iRes, oRes, tRes, dRes] = await Promise.all([
      fetch(`${API_BASE_URL}/api/invitations`, { headers }),
      fetch(`${API_BASE_URL}/api/organization`, { headers }),
      fetch(`${API_BASE_URL}/api/teams`, { headers }),
      fetch(`${API_BASE_URL}/api/departments`, { headers }),
    ]);
    if (iRes.ok) setInvitations(await iRes.json());
    if (oRes.ok) setOrganizations(await oRes.json());
    if (tRes.ok) setTeams(await tRes.json());
    if (dRes.ok) setDepartments(await dRes.json());
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API_BASE_URL}/api/invitations`, {
      method: "POST",
      headers,
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.message || "Failed to send invite"); return; }
    setInviteLink(data.invite_link);
    fetchAll();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this invitation?")) return;
    await fetch(`${API_BASE_URL}/api/invitations/${id}`, { method: "DELETE", headers });
    fetchAll();
  };

  const roleColors = { admin: "bg-red-100 text-red-700", manager: "bg-blue-100 text-blue-700", hr: "bg-purple-100 text-purple-700", executive: "bg-amber-100 text-amber-700", user: "bg-gray-100 text-gray-700" };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Invitations</h1>
          <p className="text-gray-500 text-sm mt-1">Invite employees by email with role and department assignment</p>
        </div>
        <button onClick={() => { setShowModal(true); setInviteLink(""); setError(""); setForm({ email: "", role: "user", organization_id: "", team_id: "", department_id: "" }); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all">
          <Plus size={18} /> Invite Employee
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Email", "Role", "Organization", "Department", "Status", "Expires", ""].map((h) => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {invitations.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-gray-400" />
                    {inv.email}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleColors[inv.role] || roleColors.user}`}>{inv.role}</span>
                </td>
                <td className="px-5 py-3.5 text-gray-500">{inv.organization_name || "—"}</td>
                <td className="px-5 py-3.5 text-gray-500">{inv.department_name || "—"}</td>
                <td className="px-5 py-3.5">
                  {inv.used ? (
                    <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><CheckCircle size={12} /> Accepted</span>
                  ) : new Date(inv.expires_at) < new Date() ? (
                    <span className="text-red-500 text-xs font-medium">Expired</span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600 text-xs font-medium"><Clock size={12} /> Pending</span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-gray-400 text-xs">{new Date(inv.expires_at).toLocaleDateString()}</td>
                <td className="px-5 py-3.5">
                  {!inv.used && (
                    <button onClick={() => handleDelete(inv.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {invitations.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-gray-400">No invitations sent yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Invite Employee</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            {inviteLink ? (
              <div className="text-center">
                <CheckCircle className="text-green-500 mx-auto mb-3" size={40} />
                <p className="text-gray-700 font-medium mb-3">Invitation created!</p>
                <p className="text-xs text-gray-500 mb-3">Share this link with the employee:</p>
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2 text-xs break-all">
                  <span className="flex-1 text-indigo-700">{inviteLink}</span>
                  <button onClick={copyLink} className="text-gray-500 hover:text-indigo-600 shrink-0">
                    {copied ? <CheckCheck size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
                <button onClick={() => setShowModal(false)} className="mt-4 w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium">Done</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm">{error}</div>}

                <div>
                  <label className="text-sm font-medium text-gray-700">Email *</label>
                  <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" placeholder="employee@company.com" />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
                    <option value="user">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                    <option value="executive">Executive</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Organization</label>
                  <select value={form.organization_id} onChange={(e) => setForm({ ...form, organization_id: e.target.value })}
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
                    <option value="">Select organization</option>
                    {organizations.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Team</label>
                  <select value={form.team_id} onChange={(e) => setForm({ ...form, team_id: e.target.value })}
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
                    <option value="">Select team</option>
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Department</label>
                  <select value={form.department_id} onChange={(e) => setForm({ ...form, department_id: e.target.value })}
                    className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
                    <option value="">Select department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-all">Cancel</button>
                  <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium transition-all">Send Invite</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Invitations;
