import React, { useState, useEffect } from "react";
import { Lock, User, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { API_BASE_URL } from "../../../config";
import { useParams, useNavigate } from "react-router-dom";

const InviteAccept = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [invalid, setInvalid] = useState(false);
  const [form, setForm] = useState({ name: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const validate = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/invitations/validate/${token}`);
        if (!res.ok) { setInvalid(true); return; }
        const data = await res.json();
        setInvite(data);
      } catch {
        setInvalid(true);
      }
    };
    validate();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/invitations/accept/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Registration failed"); return; }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("role", data.user.role);
      setSuccess(true);
      setTimeout(() => {
        const role = data.user.role;
        if (role === "admin") navigate("/admin");
        else if (role === "manager") navigate("/manager");
        else if (role === "hr") navigate("/hr");
        else if (role === "executive") navigate("/executive");
        else navigate("/");
      }, 1500);
    } catch {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (invalid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-sm">
          <XCircle className="text-red-500 mx-auto mb-4" size={56} />
          <h2 className="text-2xl font-bold text-gray-900">Invalid Invitation</h2>
          <p className="text-gray-500 mt-2">This invitation link is invalid or has expired.</p>
          <button onClick={() => navigate("/")} className="mt-6 text-indigo-600 font-medium hover:underline">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Validating invitation...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <div className="text-center mb-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg mb-4">
              <BarChart3 className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">You're Invited!</h2>
            <p className="text-gray-500 mt-1 text-sm">Complete your registration to join IWF</p>
          </div>

          <div className="bg-indigo-50 rounded-xl p-4 mb-6 text-sm space-y-1">
            <p><span className="font-medium text-gray-700">Email:</span> <span className="text-indigo-700">{invite.email}</span></p>
            <p><span className="font-medium text-gray-700">Role:</span> <span className="capitalize text-indigo-700">{invite.role}</span></p>
            {invite.organization_name && <p><span className="font-medium text-gray-700">Organization:</span> {invite.organization_name}</p>}
            {invite.team_name && <p><span className="font-medium text-gray-700">Team:</span> {invite.team_name}</p>}
            {invite.department_name && <p><span className="font-medium text-gray-700">Department:</span> {invite.department_name}</p>}
          </div>

          {success ? (
            <div className="text-center py-4">
              <CheckCircle className="text-green-500 mx-auto mb-3" size={48} />
              <p className="text-green-700 font-semibold">Registration successful! Redirecting...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-700">Your Name *</label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-3.5 text-gray-400" size={16} />
                  <input
                    name="name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Full Name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Password *</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3.5 text-gray-400" size={16} />
                  <input
                    type="password"
                    name="password"
                    required
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Choose a password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3 rounded-xl font-semibold transition-all shadow-lg"
              >
                {loading ? "Registering..." : "Complete Registration"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteAccept;
