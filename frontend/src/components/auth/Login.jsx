import React from 'react'
import { useState } from "react";
import { Building2, User, Lock, BarChart3 } from "lucide-react";
import { API_BASE_URL } from '../../../config';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mode, setMode] = useState("login");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed");
        return;
      }

      // ✅ Save token
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("role", JSON.stringify(data.user.role));

      setSuccess("Login successful! Redirecting...");

      // Redirect after 1 second
      setTimeout(() => {
        setTimeout(() => {
          if (data.user.role === "admin") {
            navigate("/admin");
          }
        }, 1000);

      }, 1000);

    } catch (err) {
      console.error(err);
      setError("Server error. Please try again.");
    }
  };

  const handleCompanySignup = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const form = e.target;

    try {
      const response = await fetch(`${API_BASE_URL}/api/level1/company-signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company_name: form.company_name.value,
          company_domain: form.company_domain.value,
          admin_name: form.admin_name.value,
          admin_email: form.admin_email.value,
          admin_password: form.admin_password.value,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Company signup failed");
        return;
      }

      setSuccess("Company created. Sign in with the admin account.");
      setMode("login");
      form.reset();
    } catch (err) {
      console.error(err);
      setError("Server error. Please try again.");
    }
  };


  return (
    <div className="min-h-screen flex bg-gray-50">

      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-linear-to-br from-indigo-700 via-blue-600 to-purple-600 text-white p-16 flex-col justify-center">

        <div>
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-8">
            <BarChart3 size={40} />
          </div>

          <h1 className="text-5xl font-bold leading-tight">
            IWF
            <br />
            InfoWorkforce
          </h1>

          <p className="mt-6 text-lg text-indigo-100 max-w-md">
            Internal Workforce Intelligence Platform designed
            to manage employees, attendance, analytics and
            workforce operations efficiently.
          </p>

          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              Employee Management
            </div>

            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              Attendance Tracking
            </div>

            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              Workforce Analytics
            </div>

            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              Role Based Access
            </div>
          </div>
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

              <h2 className="mt-4 text-3xl font-bold text-gray-900">
                {mode === "login" ? "Welcome Back" : "Create Company"}
              </h2>

              <p className="text-gray-500 mt-2">
                {mode === "login" ? "Sign in to continue" : "Start Level 1 onboarding"}
              </p>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-xl">
                {success}
              </div>
            )}

            {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>

                <div className="relative mt-2">
                  <User
                    className="absolute left-3 top-3.5 text-gray-400"
                    size={18}
                  />

                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="Enter email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Password
                </label>

                <div className="relative mt-2">
                  <Lock
                    className="absolute left-3 top-3.5 text-gray-400"
                    size={18}
                  />

                  <input
                    type="password"
                    name="password"
                    required
                    placeholder="Enter password"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition-all shadow-lg"
              >
                Sign In
              </button>
            </form>
            ) : (
              <form onSubmit={handleCompanySignup} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Company
                  </label>
                  <div className="relative mt-2">
                    <Building2
                      className="absolute left-3 top-3.5 text-gray-400"
                      size={18}
                    />
                    <input
                      name="company_name"
                      required
                      placeholder="Company name"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <input
                  name="company_domain"
                  placeholder="Company domain"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />

                <input
                  name="admin_name"
                  required
                  placeholder="Admin name"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />

                <input
                  name="admin_email"
                  type="email"
                  required
                  placeholder="Admin email"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />

                <input
                  name="admin_password"
                  type="password"
                  required
                  placeholder="Admin password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-semibold transition-all shadow-lg"
                >
                  Create Company
                </button>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-500">
                {mode === "login" ? "New company?" : "Already have an account?"}
              </span>

              <button
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setMode(mode === "login" ? "signup" : "login");
                }}
                className="ml-1 text-indigo-600 font-medium hover:underline"
              >
                {mode === "login" ? "Create one" : "Sign in"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login
