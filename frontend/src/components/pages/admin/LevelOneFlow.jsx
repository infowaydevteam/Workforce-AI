import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Play,
  RefreshCcw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { API_BASE_URL } from "../../../../config";

const formatDuration = (seconds) => {
  const value = Number(seconds || 0);
  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);

  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${value}s`;
};

const getStatusClass = (complete) =>
  complete
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-slate-50 text-slate-500 border-slate-200";

const LevelOneFlow = () => {
  const [status, setStatus] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [seedResult, setSeedResult] = useState(null);
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    organization_id: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const loadLevelOne = useCallback(async () => {
    try {
      setError("");

      const [statusRes, analyticsRes, employeeRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/level1/status`, { headers }),
        fetch(`${API_BASE_URL}/api/level1/executive-analytics`, { headers }),
        fetch(`${API_BASE_URL}/api/employee`, { headers }),
      ]);

      if (!statusRes.ok || !analyticsRes.ok || !employeeRes.ok) {
        throw new Error("Level 1 data request failed");
      }

      setStatus(await statusRes.json());
      setAnalytics(await analyticsRes.json());
      setEmployees(await employeeRes.json());
    } catch (err) {
      setError(err.message);
    }
  }, [headers]);

  useEffect(() => {
    loadLevelOne();
  }, [loadLevelOne]);

  const seedDemo = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE_URL}/api/level1/demo-seed`, {
        method: "POST",
        headers,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Demo seed failed");
      }

      setSeedResult(data);
      await loadLevelOne();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (reviewerRole) => {
    const subject = employees.find((employee) => employee.role === "employee") || employees[0];

    if (!subject) {
      setError("Create or seed an employee before adding a review");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE_URL}/api/level1/reviews`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          subject_user_id: subject.id,
          reviewer_role: reviewerRole,
          status: "approved",
          notes:
            reviewerRole === "manager"
              ? "Manager approved the productivity report."
              : "HR approved the attendance and workforce summary.",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Review failed");
      }

      await loadLevelOne();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createDepartment = async (event) => {
    event.preventDefault();

    const organizationId =
      departmentForm.organization_id || analytics?.byOrganization?.[0]?.id;

    if (!departmentForm.name || !organizationId) {
      setError("Department name and organization are required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch(`${API_BASE_URL}/api/level1/departments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...departmentForm,
          organization_id: organizationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Department setup failed");
      }

      setDepartmentForm({
        name: "",
        organization_id: "",
        description: "",
      });
      await loadLevelOne();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = status
    ? Math.round((status.progress.completed / status.progress.total) * 100)
    : 0;

  const metrics = analytics?.overview?.metrics || status?.metrics || {};
  const topApps = analytics?.topApplications || [];
  const departments = analytics?.byDepartment || [];
  const organizations = analytics?.byOrganization || [];
  const reviews = analytics?.reviews || [];

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-slate-500">
              Platform Readiness
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Level 1 Complete Flow
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadLevelOne}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              <RefreshCcw size={17} />
              Refresh
            </button>

            <button
              onClick={seedDemo}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Play size={17} />
              {loading ? "Running" : "Seed Demo"}
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">Progress</p>
              <ShieldCheck className="text-emerald-600" size={22} />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {progressPercent}%
            </p>
            <div className="mt-4 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-emerald-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">Workforce</p>
              <Users className="text-sky-600" size={22} />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {metrics.workforce_count || 0}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {metrics.agent_installed_count || 0} agents installed
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">Productivity</p>
              <BarChart3 className="text-violet-600" size={22} />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {metrics.productivity_score || 0}%
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {formatDuration(metrics.active_seconds)} active
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500">Reviews</p>
              <ClipboardCheck className="text-amber-600" size={22} />
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {(metrics.manager_review_count || 0) + (metrics.hr_review_count || 0)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Manager and HR approvals
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Flow Milestones
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                {status?.progress.completed || 0}/{status?.progress.total || 17}
              </span>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {(status?.steps || []).map((step, index) => (
                <div
                  key={step.key}
                  className={`flex items-start gap-3 rounded-xl border p-4 ${getStatusClass(step.complete)}`}
                >
                  <div className="mt-0.5">
                    {step.complete ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border text-xs font-bold">
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold">{step.label}</p>
                    <p className="mt-1 text-sm opacity-80">{step.metric}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Department Setup
              </h2>
              <form onSubmit={createDepartment} className="mt-4 space-y-3">
                <select
                  value={departmentForm.organization_id}
                  onChange={(event) =>
                    setDepartmentForm((previous) => ({
                      ...previous,
                      organization_id: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm"
                >
                  <option value="">Select Organization</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                    </option>
                  ))}
                </select>

                <input
                  value={departmentForm.name}
                  onChange={(event) =>
                    setDepartmentForm((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm"
                  placeholder="Department name"
                />

                <input
                  value={departmentForm.description}
                  onChange={(event) =>
                    setDepartmentForm((previous) => ({
                      ...previous,
                      description: event.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-3 text-sm"
                  placeholder="Description"
                />

                <button
                  disabled={loading}
                  className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  Add Department
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">
                Review Actions
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  onClick={() => submitReview("manager")}
                  disabled={loading}
                  className="rounded-lg bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-60"
                >
                  Manager Review
                </button>
                <button
                  onClick={() => submitReview("hr")}
                  disabled={loading}
                  className="rounded-lg bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
                >
                  HR Review
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {reviews.slice(0, 4).map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-800">
                        {review.reviewer_role?.toUpperCase()}
                      </p>
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                        {review.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {review.subject_name || "Employee report"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {seedResult?.credentials?.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900">
                  Demo Credentials
                </h2>
                <div className="mt-4 space-y-2">
                  {seedResult.credentials.map((credential) => (
                    <div
                      key={credential.email}
                      className="rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <p className="font-semibold text-slate-800">
                        {credential.role}
                      </p>
                      <p className="text-slate-600">{credential.email}</p>
                      <p className="text-slate-500">{credential.password}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Organizations
            </h2>
            <div className="mt-4 space-y-4">
              {organizations.map((organization) => (
                <div key={organization.id}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">
                      {organization.name}
                    </span>
                    <span className="text-slate-500">
                      {organization.average_productivity || 0}%
                    </span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-sky-500"
                      style={{
                        width: `${Math.min(
                          organization.average_productivity || 0,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">
              Departments
            </h2>
            <div className="mt-4 space-y-3">
              {departments.slice(0, 6).map((department) => (
                <div
                  key={department.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {department.name}
                    </p>
                    <p className="text-sm text-slate-500">
                      {department.employee_count} people
                    </p>
                  </div>
                  <span className="font-semibold text-slate-700">
                    {department.average_productivity || 0}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Database className="text-slate-500" size={20} />
              <h2 className="text-lg font-bold text-slate-900">
                Classified Apps
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              {topApps.map((app) => (
                <div
                  key={`${app.app_name}-${app.activity_category}`}
                  className="rounded-xl border border-slate-100 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-800">
                      {app.app_name}
                    </p>
                    <span className="text-sm font-semibold text-slate-600">
                      {app.average_productivity || 0}%
                    </span>
                  </div>
                  <p className="mt-1 text-sm capitalize text-slate-500">
                    {app.activity_category || "neutral"} - {formatDuration(app.total_duration)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelOneFlow;
