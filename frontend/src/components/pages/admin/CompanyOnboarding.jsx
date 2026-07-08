import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Globe2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { API_BASE_URL } from "../../../../config";

const currentYear = new Date().getFullYear();

const defaultForm = {
  organization: {
    id: "",
    name: "",
    description: "",
  },
  subscription_plan: "starter",
  timezone: "America/Los_Angeles",
  working_hours: {
    working_days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    working_start: "09:00",
    working_end: "17:00",
    break_minutes: 60,
  },
  holidays: [
    {
      name: "New Year's Day",
      holiday_date: `${currentYear}-01-01`,
      holiday_type: "company",
    },
  ],
  attendance_rules: {
    grace_period_minutes: 10,
    half_day_hours: 4,
    full_day_hours: 8,
    overtime_enabled: true,
    auto_checkout_enabled: true,
    allow_remote_check_in: false,
  },
};

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-200";

const sectionClass = "rounded-lg border border-slate-200 bg-white p-5 shadow-sm";

const CompanyOnboarding = () => {
  const [organizations, setOrganizations] = useState([]);
  const [options, setOptions] = useState({
    subscriptionPlans: [],
    timezones: [],
    workingDays: [],
  });
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  const loadOptions = async () => {
    const res = await fetch(`${API_BASE_URL}/api/onboarding/options`, {
      headers,
    });
    const data = await res.json();
    setOptions(data);
  };

  const loadOrganizations = async () => {
    const res = await fetch(`${API_BASE_URL}/api/organization`, {
      headers,
    });
    const data = await res.json();
    setOrganizations(data);
  };

  const loadOrganizationSetup = async (organizationId) => {
    if (!organizationId) {
      setForm(defaultForm);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/onboarding/${organizationId}`,
        { headers }
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to load organization setup");
      }

      setForm({
        organization: {
          id: data.organization.id,
          name: data.organization.name || "",
          description: data.organization.description || "",
        },
        subscription_plan: data.subscription_plan || "starter",
        timezone: data.timezone || "America/Los_Angeles",
        working_hours: {
          working_days:
            data.working_hours?.working_days ||
            defaultForm.working_hours.working_days,
          working_start:
            data.working_hours?.working_start?.slice(0, 5) || "09:00",
          working_end: data.working_hours?.working_end?.slice(0, 5) || "17:00",
          break_minutes: data.working_hours?.break_minutes ?? 60,
        },
        holidays:
          data.holidays?.length > 0
            ? data.holidays.map((holiday) => ({
                name: holiday.name,
                holiday_date: holiday.holiday_date?.slice(0, 10),
                holiday_type: holiday.holiday_type || "company",
              }))
            : [],
        attendance_rules: {
          ...defaultForm.attendance_rules,
          ...(data.attendance_rules || {}),
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
    loadOrganizations();
  }, []);

  const updateOrganization = (field, value) => {
    setForm((previous) => ({
      ...previous,
      organization: {
        ...previous.organization,
        [field]: value,
      },
    }));
  };

  const updateWorkingHours = (field, value) => {
    setForm((previous) => ({
      ...previous,
      working_hours: {
        ...previous.working_hours,
        [field]: value,
      },
    }));
  };

  const updateAttendanceRules = (field, value) => {
    setForm((previous) => ({
      ...previous,
      attendance_rules: {
        ...previous.attendance_rules,
        [field]: value,
      },
    }));
  };

  const toggleWorkingDay = (day) => {
    setForm((previous) => {
      const days = previous.working_hours.working_days.includes(day)
        ? previous.working_hours.working_days.filter((item) => item !== day)
        : [...previous.working_hours.working_days, day];

      return {
        ...previous,
        working_hours: {
          ...previous.working_hours,
          working_days: days,
        },
      };
    });
  };

  const addHoliday = () => {
    setForm((previous) => ({
      ...previous,
      holidays: [
        ...previous.holidays,
        {
          name: "",
          holiday_date: `${currentYear}-01-01`,
          holiday_type: "company",
        },
      ],
    }));
  };

  const updateHoliday = (index, field, value) => {
    setForm((previous) => ({
      ...previous,
      holidays: previous.holidays.map((holiday, itemIndex) =>
        itemIndex === index
          ? {
              ...holiday,
              [field]: value,
            }
          : holiday
      ),
    }));
  };

  const removeHoliday = (index) => {
    setForm((previous) => ({
      ...previous,
      holidays: previous.holidays.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const saveOnboarding = async (complete = false) => {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/onboarding`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...form,
          complete,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save onboarding");
      }

      setMessage(data.message);
      await loadOrganizations();
      await loadOrganizationSetup(data.organization_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const workflowSteps = [
    {
      label: "Create Organization",
      icon: <Building2 size={18} />,
      complete: Boolean(form.organization.name),
    },
    {
      label: "Select Subscription Plan",
      icon: <CreditCard size={18} />,
      complete: Boolean(form.subscription_plan),
    },
    {
      label: "Configure Timezone",
      icon: <Globe2 size={18} />,
      complete: Boolean(form.timezone),
    },
    {
      label: "Configure Working Hours",
      icon: <Clock3 size={18} />,
      complete:
        Boolean(form.working_hours.working_start) &&
        Boolean(form.working_hours.working_end) &&
        form.working_hours.working_days.length > 0,
    },
    {
      label: "Configure Holidays",
      icon: <CalendarDays size={18} />,
      complete: form.holidays.length > 0,
    },
    {
      label: "Configure Attendance Rules",
      icon: <ShieldCheck size={18} />,
      complete: Boolean(form.attendance_rules.full_day_hours),
    },
  ];

  const completedSteps = workflowSteps.filter((step) => step.complete).length;

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-slate-500">
              Company Setup
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              Company Onboarding
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => saveOnboarding(false)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              <Save size={17} />
              Save Draft
            </button>

            <button
              onClick={() => saveOnboarding(true)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              <CheckCircle2 size={17} />
              Complete Onboarding
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-6">
          {workflowSteps.map((step) => (
            <div
              key={step.label}
              className={`rounded-lg border p-4 ${
                step.complete
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between">
                {step.icon}
                {step.complete && <CheckCircle2 size={18} />}
              </div>
              <p className="mt-3 text-sm font-semibold">{step.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
            <span>Workflow Progress</span>
            <span>
              {completedSteps}/{workflowSteps.length}
            </span>
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-emerald-500"
              style={{
                width: `${(completedSteps / workflowSteps.length) * 100}%`,
              }}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className={sectionClass}>
            <div className="flex items-center gap-2">
              <Building2 className="text-slate-500" size={20} />
              <h2 className="font-bold text-slate-900">Organization</h2>
            </div>

            <div className="mt-4 space-y-4">
              <select
                className={inputClass}
                value={form.organization.id}
                onChange={(event) => loadOrganizationSetup(event.target.value)}
              >
                <option value="">New organization</option>
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>

              <input
                className={inputClass}
                value={form.organization.name}
                onChange={(event) =>
                  updateOrganization("name", event.target.value)
                }
                placeholder="Organization name"
              />

              <textarea
                className={inputClass}
                value={form.organization.description}
                onChange={(event) =>
                  updateOrganization("description", event.target.value)
                }
                placeholder="Description"
                rows={4}
              />
            </div>
          </div>

          <div className={sectionClass}>
            <div className="flex items-center gap-2">
              <CreditCard className="text-slate-500" size={20} />
              <h2 className="font-bold text-slate-900">Subscription Plan</h2>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {options.subscriptionPlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() =>
                    setForm((previous) => ({
                      ...previous,
                      subscription_plan: plan.id,
                    }))
                  }
                  className={`rounded-lg border p-4 text-left ${
                    form.subscription_plan === plan.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <p className="font-bold">{plan.name}</p>
                  <p className="mt-2 text-sm opacity-80">
                    {plan.employeeLimit} employees
                  </p>
                  <p className="mt-1 text-sm opacity-80">
                    {plan.retentionDays} days retention
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className={sectionClass}>
            <div className="flex items-center gap-2">
              <Globe2 className="text-slate-500" size={20} />
              <h2 className="font-bold text-slate-900">Timezone</h2>
            </div>

            <select
              className={`${inputClass} mt-4`}
              value={form.timezone}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  timezone: event.target.value,
                }))
              }
            >
              {options.timezones.map((timezone) => (
                <option key={timezone} value={timezone}>
                  {timezone}
                </option>
              ))}
            </select>
          </div>

          <div className={sectionClass}>
            <div className="flex items-center gap-2">
              <Clock3 className="text-slate-500" size={20} />
              <h2 className="font-bold text-slate-900">Working Hours</h2>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <input
                type="time"
                className={inputClass}
                value={form.working_hours.working_start}
                onChange={(event) =>
                  updateWorkingHours("working_start", event.target.value)
                }
              />
              <input
                type="time"
                className={inputClass}
                value={form.working_hours.working_end}
                onChange={(event) =>
                  updateWorkingHours("working_end", event.target.value)
                }
              />
              <input
                type="number"
                min="0"
                className={inputClass}
                value={form.working_hours.break_minutes}
                onChange={(event) =>
                  updateWorkingHours("break_minutes", Number(event.target.value))
                }
                placeholder="Break minutes"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {options.workingDays.map((day) => (
                <button
                  key={day}
                  onClick={() => toggleWorkingDay(day)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                    form.working_hours.working_days.includes(day)
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className={sectionClass}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="text-slate-500" size={20} />
                <h2 className="font-bold text-slate-900">Holidays</h2>
              </div>

              <button
                onClick={addHoliday}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                <Plus size={16} />
                Add
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {form.holidays.map((holiday, index) => (
                <div
                  key={`${holiday.name}-${index}`}
                  className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 md:grid-cols-[1fr_160px_150px_44px]"
                >
                  <input
                    className={inputClass}
                    value={holiday.name}
                    onChange={(event) =>
                      updateHoliday(index, "name", event.target.value)
                    }
                    placeholder="Holiday name"
                  />
                  <input
                    type="date"
                    className={inputClass}
                    value={holiday.holiday_date}
                    onChange={(event) =>
                      updateHoliday(index, "holiday_date", event.target.value)
                    }
                  />
                  <select
                    className={inputClass}
                    value={holiday.holiday_type}
                    onChange={(event) =>
                      updateHoliday(index, "holiday_type", event.target.value)
                    }
                  >
                    <option value="company">Company</option>
                    <option value="public">Public</option>
                    <option value="optional">Optional</option>
                  </select>
                  <button
                    onClick={() => removeHoliday(index)}
                    className="flex h-11 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={sectionClass}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-slate-500" size={20} />
              <h2 className="font-bold text-slate-900">Attendance Rules</h2>
            </div>

            <div className="mt-4 space-y-4">
              <label className="block text-sm font-semibold text-slate-600">
                Grace Period Minutes
                <input
                  type="number"
                  min="0"
                  className={`${inputClass} mt-2`}
                  value={form.attendance_rules.grace_period_minutes}
                  onChange={(event) =>
                    updateAttendanceRules(
                      "grace_period_minutes",
                      Number(event.target.value)
                    )
                  }
                />
              </label>

              <label className="block text-sm font-semibold text-slate-600">
                Half Day Hours
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className={`${inputClass} mt-2`}
                  value={form.attendance_rules.half_day_hours}
                  onChange={(event) =>
                    updateAttendanceRules(
                      "half_day_hours",
                      Number(event.target.value)
                    )
                  }
                />
              </label>

              <label className="block text-sm font-semibold text-slate-600">
                Full Day Hours
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  className={`${inputClass} mt-2`}
                  value={form.attendance_rules.full_day_hours}
                  onChange={(event) =>
                    updateAttendanceRules(
                      "full_day_hours",
                      Number(event.target.value)
                    )
                  }
                />
              </label>

              <div className="space-y-3 pt-2">
                {[
                  ["overtime_enabled", "Overtime Enabled"],
                  ["auto_checkout_enabled", "Auto Checkout"],
                  ["allow_remote_check_in", "Remote Check In"],
                ].map(([field, label]) => (
                  <label
                    key={field}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700"
                  >
                    {label}
                    <input
                      type="checkbox"
                      checked={Boolean(form.attendance_rules[field])}
                      onChange={(event) =>
                        updateAttendanceRules(field, event.target.checked)
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyOnboarding;
