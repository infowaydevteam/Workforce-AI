import React, { useEffect, useState } from "react";
import { Tag, Plus, Trash2, Zap, X } from "lucide-react";
import { API_BASE_URL } from "../../../../config";

const CATEGORIES = ["Development", "Office", "Communication", "Browser", "Entertainment", "Social Media", "Design", "Finance", "Uncategorized"];

const Classification = () => {
  const token = localStorage.getItem("token");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const [apps, setApps] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ app_name: "", category: "Uncategorized", is_productive: true });
  const [autoResult, setAutoResult] = useState(null);
  const [error, setError] = useState("");

  const fetchApps = async () => {
    const res = await fetch(`${API_BASE_URL}/api/classifications`, { headers });
    if (res.ok) setApps(await res.json());
  };

  useEffect(() => { fetchApps(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API_BASE_URL}/api/classifications`, { method: "POST", headers, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.message || "Failed"); return; }
    setShowModal(false);
    fetchApps();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this classification?")) return;
    await fetch(`${API_BASE_URL}/api/classifications/${id}`, { method: "DELETE", headers });
    fetchApps();
  };

  const handleAutoClassify = async () => {
    const res = await fetch(`${API_BASE_URL}/api/classifications/auto`, { method: "POST", headers });
    const data = await res.json();
    setAutoResult(data);
    fetchApps();
  };

  const grouped = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = apps.filter((a) => a.category === cat);
    return acc;
  }, {});

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Classification</h1>
          <p className="text-gray-500 text-sm mt-1">Classify apps as productive or unproductive to calculate productivity scores</p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleAutoClassify} className="flex items-center gap-2 border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2.5 rounded-xl font-medium transition-all">
            <Zap size={16} /> Auto-Classify Unknown
          </button>
          <button onClick={() => { setShowModal(true); setForm({ app_name: "", category: "Uncategorized", is_productive: true }); setError(""); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-medium transition-all">
            <Plus size={18} /> Add App
          </button>
        </div>
      </div>

      {autoResult && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
          Auto-classified {autoResult.count} new apps. {autoResult.count === 0 ? "All apps already classified." : "Review them below and mark as productive/unproductive."}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {CATEGORIES.map((cat) => (
          grouped[cat]?.length > 0 && (
            <div key={cat} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-sm">{cat}</h3>
                <span className="text-xs text-gray-400">{grouped[cat].length} apps</span>
              </div>
              <div className="divide-y divide-gray-50">
                {grouped[cat].map((app) => (
                  <div key={app.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <Tag size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-700">{app.app_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${app.is_productive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {app.is_productive ? "Productive" : "Unproductive"}
                      </span>
                      <button onClick={() => handleDelete(app.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ))}
      </div>

      {apps.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Tag size={48} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No classifications yet</p>
          <p className="text-sm">Add apps or use Auto-Classify to populate from activity logs</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Add App Classification</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            {error && <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">App Name *</label>
                <input required value={form.app_name} onChange={(e) => setForm({ ...form, app_name: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm" placeholder="e.g. Slack" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Productivity</label>
                <div className="flex gap-3 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={form.is_productive === true} onChange={() => setForm({ ...form, is_productive: true })} />
                    <span className="text-sm text-green-700 font-medium">Productive</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={form.is_productive === false} onChange={() => setForm({ ...form, is_productive: false })} />
                    <span className="text-sm text-red-600 font-medium">Unproductive</span>
                  </label>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-all">Cancel</button>
                <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-medium transition-all">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classification;
