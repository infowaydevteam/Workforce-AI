import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  ClipboardCheck,
  Plus,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { API_BASE_URL } from "../../../../config";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const defaultSetup = {
  organization: {
    subscription_plan_id: "",
    timezone: "America/Los_Angeles",
    working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    working_start: "09:00",
    working_end: "17:00",
  },
  attendance_rules: {
    late_after_minutes: 10,
    half_day_after_minutes: 240,
    minimum_hours_per_day: 8,
    allow_weekend_work: false,
  },
  monitoring_policy: {
    screenshot_interval_seconds: 0,
    idle_threshold_seconds: 300,
    url_tracking_enabled: true,
    app_tracking_enabled: true,
    keyboard_activity_tracking_enabled: false,
    mouse_activity_tracking_enabled: false,
  },
  holidays: [],
  productivity_rules: [],
  departments: [],
};

const AdminPolicies = () => {
  const [orgs, setOrgs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [setup, setSetup] = useState(defaultSetup);
  const [holidayForm, setHolidayForm] = useState({ name: "", holiday_date: "" });
  const [ruleForm, setRuleForm] = useState({
    rule_type: "app",
    pattern: "",
    category: "productive",
  });
  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    description: "",
    // manager_id: "",
  });

  const token = localStorage.getItem("token");

  const managers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.role === "admin" &&
          String(user.organization_id) === String(selectedOrgId)
      ),
    [users, selectedOrgId]
  );

  const fetchJson = async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      throw new Error("Request failed");
    }

    return res.json();
  };

  const fetchBaseData = async () => {
    try {
      const [orgData, planData, userData] = await Promise.all([
        fetchJson(`${API_BASE_URL}/api/organization`),
        fetchJson(`${API_BASE_URL}/api/admin-workflow/subscription-plans`),
        fetchJson(`${API_BASE_URL}/api/employee`),
      ]);

      setOrgs(orgData);
      setPlans(planData);
      setUsers(userData);

      if (!selectedOrgId && orgData.length > 0) {
        setSelectedOrgId(String(orgData[0].id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSetup = async (organizationId) => {
    if (!organizationId) return;

    try {
      const data = await fetchJson(
        `${API_BASE_URL}/api/admin-workflow/organizations/${organizationId}/setup`
      );

      setSetup({
        organization: data.organization || defaultSetup.organization,
        attendance_rules: data.attendance_rules || defaultSetup.attendance_rules,
        monitoring_policy: data.monitoring_policy || defaultSetup.monitoring_policy,
        holidays: data.holidays || [],
        productivity_rules: data.productivity_rules || [],
        departments: data.departments || [],
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchSetup(selectedOrgId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrgId]);

  const updateOrganizationField = (field, value) => {
    setSetup((prev) => ({
      ...prev,
      organization: { ...prev.organization, [field]: value },
    }));
  };

  const updateAttendanceField = (field, value) => {
    setSetup((prev) => ({
      ...prev,
      attendance_rules: { ...prev.attendance_rules, [field]: value },
    }));
  };

  const updateMonitoringField = (field, value) => {
    setSetup((prev) => ({
      ...prev,
      monitoring_policy: { ...prev.monitoring_policy, [field]: value },
    }));
  };

  const toggleWorkingDay = (day) => {
    const workingDays = setup.organization.working_days || [];

    updateOrganizationField(
      "working_days",
      workingDays.includes(day)
        ? workingDays.filter((item) => item !== day)
        : [...workingDays, day]
    );
  };

  const saveSetup = async () => {
    try {
      await fetchJson(
        `${API_BASE_URL}/api/admin-workflow/organizations/${selectedOrgId}/setup`,
        {
          method: "PUT",
          body: JSON.stringify({
            subscription_plan_id: setup.organization.subscription_plan_id,
            timezone: setup.organization.timezone,
            working_days: setup.organization.working_days,
            working_start: setup.organization.working_start,
            working_end: setup.organization.working_end,
            attendance_rules: setup.attendance_rules,
            monitoring_policy: setup.monitoring_policy,
          }),
        }
      );

      fetchSetup(selectedOrgId);
      alert("Settings saved");
    } catch (err) {
      console.error(err);
      alert("Failed to save settings");
    }
  };

  const addHoliday = async (e) => {
    e.preventDefault();
    try {
      await fetchJson(`${API_BASE_URL}/api/admin-workflow/holidays`, {
        method: "POST",
        body: JSON.stringify({
          organization_id: selectedOrgId,
          ...holidayForm,
        }),
      });
      setHolidayForm({ name: "", holiday_date: "" });
      fetchSetup(selectedOrgId);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteHoliday = async (id) => {
    await fetchJson(`${API_BASE_URL}/api/admin-workflow/holidays/${id}`, {
      method: "DELETE",
    });
    fetchSetup(selectedOrgId);
  };

  const addRule = async (e) => {
    e.preventDefault();
    try {
      await fetchJson(`${API_BASE_URL}/api/admin-workflow/productivity-rules`, {
        method: "POST",
        body: JSON.stringify({
          organization_id: selectedOrgId,
          ...ruleForm,
        }),
      });
      setRuleForm({ rule_type: "app", pattern: "", category: "productive" });
      fetchSetup(selectedOrgId);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteRule = async (id) => {
    await fetchJson(`${API_BASE_URL}/api/admin-workflow/productivity-rules/${id}`, {
      method: "DELETE",
    });
    fetchSetup(selectedOrgId);
  };

  const addDepartment = async (e) => {
  e.preventDefault();

  try {
    await fetchJson(`${API_BASE_URL}/api/admin-workflow/departments`, {
      method: "POST",
      body: JSON.stringify({
        organization_id: selectedOrgId,
        name: departmentForm.name,
        description: departmentForm.description,
      }),
    });

    setDepartmentForm({
      name: "",
      description: "",
    });

    fetchSetup(selectedOrgId);
  } catch (err) {
    console.error(err);
  }
};

  const deleteDepartment = async (id) => {
    await fetchJson(`${API_BASE_URL}/api/admin-workflow/departments/${id}`, {
      method: "DELETE",
    });
    fetchSetup(selectedOrgId);
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Admin Policies</h1>
            <p className="text-slate-500 mt-1">
              Configure onboarding, structure, productivity, and monitoring rules
            </p>
          </div>

          <button
            onClick={saveSetup}
            disabled={!selectedOrgId}
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl shadow-sm"
          >
            <Save size={18} />
            Save Settings
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <label className="block text-sm font-medium text-slate-600 mb-2">
            Organization
          </label>
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="w-full md:w-96 border border-slate-300 px-4 py-3 rounded-xl"
          >
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="text-indigo-600" size={20} />
              <h2 className="text-xl font-semibold text-slate-800">Company Onboarding</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Monitoring follows these working days and hours. Weekends stay paused unless
              Saturday or Sunday is selected here.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <select
                value={setup.organization.subscription_plan_id || ""}
                onChange={(e) => updateOrganizationField("subscription_plan_id", e.target.value)}
                className="border border-slate-300 px-4 py-3 rounded-xl"
              >
                <option value="">Select Subscription Plan</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>

              <input
                value={setup.organization.timezone || ""}
                onChange={(e) => updateOrganizationField("timezone", e.target.value)}
                className="border border-slate-300 px-4 py-3 rounded-xl"
                placeholder="Timezone"
              />

              <input
                type="time"
                value={setup.organization.working_start || "09:00"}
                onChange={(e) => updateOrganizationField("working_start", e.target.value)}
                className="border border-slate-300 px-4 py-3 rounded-xl"
              />

              <input
                type="time"
                value={setup.organization.working_end || "17:00"}
                onChange={(e) => updateOrganizationField("working_end", e.target.value)}
                className="border border-slate-300 px-4 py-3 rounded-xl"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleWorkingDay(day)}
                  className={`px-3 py-2 rounded-lg text-sm border ${
                    setup.organization.working_days?.includes(day)
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-300"
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <ClipboardCheck className="text-indigo-600" size={20} />
              <h2 className="text-xl font-semibold text-slate-800">Attendance Rules</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1">
                  Late After (minutes)
                </span>
                <input
                  type="number"
                  value={setup.attendance_rules.late_after_minutes ?? 10}
                  onChange={(e) => updateAttendanceField("late_after_minutes", Number(e.target.value))}
                  className="w-full border border-slate-300 px-4 py-3 rounded-xl"
                  placeholder="Late after minutes"
                />
                <span className="block text-xs text-slate-500 mt-1">
                  Example: 10 means employees are marked late after 10 minutes.
                </span>
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1">
                  Half-Day Threshold (minutes)
                </span>
                <input
                  type="number"
                  value={setup.attendance_rules.half_day_after_minutes ?? 240}
                  onChange={(e) => updateAttendanceField("half_day_after_minutes", Number(e.target.value))}
                  className="w-full border border-slate-300 px-4 py-3 rounded-xl"
                  placeholder="Half-day after minutes"
                />
                <span className="block text-xs text-slate-500 mt-1">
                  Example: 240 means 4 hours is the half-day threshold.
                </span>
              </label>

              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1">
                  Minimum Hours Per Day
                </span>
                <input
                  type="number"
                  step="0.25"
                  value={setup.attendance_rules.minimum_hours_per_day ?? 8}
                  onChange={(e) => updateAttendanceField("minimum_hours_per_day", Number(e.target.value))}
                  className="w-full border border-slate-300 px-4 py-3 rounded-xl"
                  placeholder="Minimum hours per day"
                />
                <span className="block text-xs text-slate-500 mt-1">
                  Expected working hours for a full attendance day.
                </span>
              </label>

              <label className="flex items-center gap-3 border border-slate-300 px-4 py-3 rounded-xl text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(setup.attendance_rules.allow_weekend_work)}
                  onChange={(e) => updateAttendanceField("allow_weekend_work", e.target.checked)}
                />
                <span>
                  Allow weekend work
                  <span className="block text-xs text-slate-500">
                    Attendance exception only. To monitor weekends, also select Saturday or Sunday
                    in working days.
                  </span>
                </span>
              </label>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Settings className="text-indigo-600" size={20} />
              <h2 className="text-xl font-semibold text-slate-800">Monitoring Policies</h2>
            </div>
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Agent monitoring is active only during selected working days and hours. It pauses
              automatically on weekends outside the selected days, company holidays, and non-working
              hours.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1">
                  Screenshot Interval (seconds)
                </span>
                <input
                  type="number"
                  value={setup.monitoring_policy.screenshot_interval_seconds ?? 0}
                  onChange={(e) => updateMonitoringField("screenshot_interval_seconds", Number(e.target.value))}
                  className="w-full border border-slate-300 px-4 py-3 rounded-xl"
                  placeholder="Screenshot interval seconds"
                />
                <span className="block text-xs text-slate-500 mt-1">
                  0 means screenshots are disabled.
                </span>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1">
                  Idle Threshold (seconds)
                </span>
                <input
                  type="number"
                  value={setup.monitoring_policy.idle_threshold_seconds ?? 300}
                  onChange={(e) => updateMonitoringField("idle_threshold_seconds", Number(e.target.value))}
                  className="w-full border border-slate-300 px-4 py-3 rounded-xl"
                  placeholder="Idle threshold seconds"
                />
                <span className="block text-xs text-slate-500 mt-1">
                  Employee is marked idle after this many inactive seconds during monitored time.
                </span>
              </label>
              {[
                ["url_tracking_enabled", "URL Tracking"],
                ["app_tracking_enabled", "App Tracking"],
                ["keyboard_activity_tracking_enabled", "Keyboard Activity Tracking"],
                ["mouse_activity_tracking_enabled", "Mouse Activity Tracking"],
              ].map(([field, label]) => (
                <label
                  key={field}
                  className="flex items-center gap-3 border border-slate-300 px-4 py-3 rounded-xl text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(setup.monitoring_policy[field])}
                    onChange={(e) => updateMonitoringField(field, e.target.checked)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <ShieldCheck className="text-indigo-600" size={20} />
              <h2 className="text-xl font-semibold text-slate-800">Productivity Rules</h2>
            </div>

            <form onSubmit={addRule} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <select
                value={ruleForm.rule_type}
                onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value })}
                className="border border-slate-300 px-3 py-2 rounded-xl"
              >
                <option value="app">App</option>
                <option value="site">Site</option>
              </select>
              <input
                value={ruleForm.pattern}
                onChange={(e) => setRuleForm({ ...ruleForm, pattern: e.target.value })}
                className="border border-slate-300 px-3 py-2 rounded-xl"
                placeholder="Pattern"
                required
              />
              <select
                value={ruleForm.category}
                onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}
                className="border border-slate-300 px-3 py-2 rounded-xl"
              >
                <option value="productive">Productive</option>
                <option value="unproductive">Unproductive</option>
                <option value="neutral">Neutral</option>
              </select>
              <button className="flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl">
                <Plus size={16} />
                Add
              </button>
            </form>

            <div className="space-y-2 max-h-64 overflow-auto">
              {setup.productivity_rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl px-4 py-3"
                >
                  <span className="text-sm text-slate-700">
                    {rule.rule_type} / {rule.pattern} / {rule.category}
                  </span>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <CalendarDays className="text-indigo-600" size={20} />
              <h2 className="text-xl font-semibold text-slate-800">Holidays</h2>
            </div>

            <form onSubmit={addHoliday} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <input
                value={holidayForm.name}
                onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                className="border border-slate-300 px-3 py-2 rounded-xl"
                placeholder="Holiday name"
                required
              />
              <input
                type="date"
                value={holidayForm.holiday_date}
                onChange={(e) => setHolidayForm({ ...holidayForm, holiday_date: e.target.value })}
                className="border border-slate-300 px-3 py-2 rounded-xl"
                required
              />
              <button className="flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl">
                <Plus size={16} />
                Add
              </button>
            </form>

            <div className="space-y-2 max-h-64 overflow-auto">
              {setup.holidays.map((holiday) => (
                <div
                  key={holiday.id}
                  className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl px-4 py-3"
                >
                  <span className="text-sm text-slate-700">
                    {holiday.name} / {String(holiday.holiday_date).slice(0, 10)}
                  </span>
                  <button
                    onClick={() => deleteHoliday(holiday.id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-5">
              <Building2 className="text-indigo-600" size={20} />
              <h2 className="text-xl font-semibold text-slate-800">Departments</h2>
            </div>

            <form onSubmit={addDepartment} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
              <input
                value={departmentForm.name}
                onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
                className="border border-slate-300 px-3 py-2 rounded-xl"
                placeholder="Department"
                required
              />
              <input
                value={departmentForm.description}
                onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                className="border border-slate-300 px-3 py-2 rounded-xl"
                placeholder="Description"
              />
              {/* <select
                value={departmentForm.manager_id}
                onChange={(e) => setDepartmentForm({ ...departmentForm, manager_id: e.target.value })}
                className="border border-slate-300 px-3 py-2 rounded-xl"
              >
                <option value="">Manager</option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </select> */}
              <button className="flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl">
                <Plus size={16} />
                Add
              </button>
            </form>

            <div className="space-y-2 max-h-64 overflow-auto">
              {setup.departments.map((department) => (
                <div
                  key={department.id}
                  className="flex items-center justify-between gap-3 border border-slate-200 rounded-xl px-4 py-3"
                >
                  <span className="text-sm text-slate-700">
                    {department.name} / {department.manager_name || "No manager"}
                  </span>
                  <button
                    onClick={() => deleteDepartment(department.id)}
                    className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminPolicies;
