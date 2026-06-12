import React, { useState } from "react";
import { Building2, User, Mail, Lock, BarChart3 } from "lucide-react";
import { API_BASE_URL } from "../../../config";
import { useNavigate, Link } from "react-router-dom";

const Signup = () => {
  const [form, setForm] = useState({
    company_name: "",
    domain: "",
    admin_name: "",
    admin_email: "",
    admin_password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/company-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Signup failed");
        return;
      }
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("role", data.user.role);
      navigate("/admin");
    } catch (err) {
      setError("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-700 via-blue-600 to-purple-600 text-white p-16 flex-col justify-center">
        <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-8">
          <Building2 size={40} />
        </div>
        <h1 className="text-5xl font-bold leading-tight">Get Started<br />with IWF</h1>
        <p className="mt-6 text-lg text-indigo-100 max-w-md">
          Create your company workspace in seconds. Manage teams, track productivity, and gain workforce insights.
        </p>
        <div className="mt-10 space-y-4 text-indigo-100">
          {["Company Signup & Tenant Creation", "Organization & Department Setup", "Team & Manager Assignment", "Employee Invitations", "Activity Tracking & Analytics"].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg">
                <BarChart3 className="text-white" />
              </div>
              <h2 className="mt-4 text-3xl font-bold text-gray-900">Create Workspace</h2>
              <p className="text-gray-500 mt-2">Set up your company on IWF</p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Company Name *</label>
                <div className="relative mt-1">
                  <Building2 className="absolute left-3 top-3.5 text-gray-400" size={16} />
                  <input
                    name="company_name"
                    required
                    value={form.company_name}
                    onChange={handleChange}
                    placeholder="Acme Corp"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Domain (optional)</label>
                <div className="relative mt-1">
                  <input
                    name="domain"
                    value={form.domain}
                    onChange={handleChange}
                    placeholder="acme.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <hr className="my-2" />
              <p className="text-xs text-gray-500 uppercase font-semibold">Admin Account</p>

              <div>
                <label className="text-sm font-medium text-gray-700">Your Name *</label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-3.5 text-gray-400" size={16} />
                  <input
                    name="admin_name"
                    required
                    value={form.admin_name}
                    onChange={handleChange}
                    placeholder="John Smith"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Admin Email *</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3.5 text-gray-400" size={16} />
                  <input
                    type="email"
                    name="admin_email"
                    required
                    value={form.admin_email}
                    onChange={handleChange}
                    placeholder="admin@acme.com"
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
                    name="admin_password"
                    required
                    value={form.admin_password}
                    onChange={handleChange}
                    placeholder="Min 8 characters"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-3 rounded-xl font-semibold transition-all shadow-lg"
              >
                {loading ? "Creating workspace..." : "Create Workspace"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-500">Already have an account? </span>
              <Link to="/" className="text-indigo-600 font-medium hover:underline">Sign In</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
