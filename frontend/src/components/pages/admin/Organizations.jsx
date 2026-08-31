import React, { useEffect, useState } from "react";
import { Plus, Trash2, Building2, Settings } from "lucide-react";
import { API_BASE_URL } from "../../../../config";
import { useNavigate } from "react-router-dom";

const Organizations = () => {
  const [orgs, setOrgs] = useState([]);
  const [plans, setPlans] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    description: "",
    subscription_plan_id: "",
    timezone: "America/Los_Angeles",
    working_start: "09:00",
    working_end: "17:00",
  });

   const getArrayData = (data) => {
    if (Array.isArray(data)) return data;

    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.organizations)) return data.organizations;
    if (Array.isArray(data.departments)) return data.departments;
    if (Array.isArray(data.users)) return data.users;
    if (Array.isArray(data.teams)) return data.teams;

    return [];
  };

  // Fetch organizations
const fetchOrgs = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_BASE_URL}/api/organization`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();

    console.log("Organizations API response:", data);

    if (Array.isArray(data)) {
      setOrgs(data);
    } else if (Array.isArray(data.data)) {
      setOrgs(data.data);
    } else if (Array.isArray(data.organizations)) {
      setOrgs(data.organizations);
    } else {
      console.error("Organizations is not an array:", data);
      setOrgs([]);
    }
  } catch (err) {
    console.error("Failed to fetch organizations:", err);
    setOrgs([]);
  }
};

const fetchPlans = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_BASE_URL}/api/admin-workflow/subscription-plans`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();

    console.log("Plans API response:", data);

    if (Array.isArray(data)) {
      setPlans(data);
    } else if (Array.isArray(data.data)) {
      setPlans(data.data);
    } else if (Array.isArray(data.plans)) {
      setPlans(data.plans);
    } else {
      setPlans([]);
    }
  } catch (err) {
    console.error("Failed to fetch plans:", err);
    setPlans([]);
  }
};

const fetchPlans = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_BASE_URL}/api/admin-workflow/subscription-plans`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    setPlans(data);
  } catch (err) {
    console.log(err);
  }
};

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrgs();
    fetchPlans();
  }, []);

  // Add organization
const handleAdd = async (e) => {
  e.preventDefault();

  try {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_BASE_URL}/api/organization`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      }
    );

    if (res.ok) {
      setShowModal(false);
      setForm({
        name: "",
        description: "",
        subscription_plan_id: "",
        timezone: "America/Los_Angeles",
        working_start: "09:00",
        working_end: "17:00",
      });

      fetchOrgs();
    }
  } catch (err) {
    console.log(err);
  }
};

  // Delete
const handleDelete = async (id) => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_BASE_URL}/api/organization/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (res.ok) {
      fetchOrgs();
    }
  } catch (err) {
    console.log(err);
  }
};

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Organizations
            </h1>

            <p className="text-slate-500 mt-1">
              Manage organizations across the platform
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="
      flex items-center gap-2
      px-5 py-3
      bg-indigo-600
      hover:bg-indigo-700
      text-white
      rounded-xl
      shadow-md
      transition-all
    "
          >
            <Plus size={18} />
            Add Organization
          </button>

        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>

                <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500">
                  Organization
                </th>

                <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500">
                  Description
                </th>

                <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500">
                  Plan
                </th>

                <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500">
                  Timezone
                </th>

                <th className="text-center p-4 text-xs uppercase tracking-wider text-slate-500">
                  Action
                </th>

              </tr>
            </thead>

            <tbody>
              {orgs.map((org) => (
                <tr key={org.id} className="border-b border-slate-100 hover:bg-slate-50 transition-all">
                  <td className="p-4">

                    <div className="flex items-center gap-3">

                      <div
                        className="
        w-10 h-10
        rounded-full
        bg-indigo-100
        text-indigo-700
        flex
        items-center
        justify-center
      "
                      >
                        <Building2 size={18} />
                      </div>

                      <div>
                        <p className="font-medium text-slate-800">
                          {org.name}
                        </p>
                      </div>

                    </div>

                  </td>
                  <td className="p-4 text-slate-600">
                    {org.description}
                  </td>
                  <td className="p-4 text-slate-600">
                    {org.subscription_plan_name || "-"}
                  </td>
                  <td className="p-4 text-slate-600">
                    {org.timezone || "-"}
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => navigate("/admin/policies")}
                        className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
                      >
                        <Settings size={18} />
                      </button>
                      <button
                        onClick={() =>
                          handleDelete(org.id)
                        }
                        className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all" >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800">
                Add Organization
              </h2>

              <p className="text-slate-500 mt-1 mb-6">
                Create a new organization for your platform
              </p>

              <form onSubmit={handleAdd}>
                <input
                  type="text"
                  placeholder="Name"
                  className="w-full border border-slate-300  px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500  mb-3"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                />

                <textarea
                  placeholder="Description"
                 className="w-full border border-slate-300  px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500  mb-3"
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                />

                <select
                  className="w-full border border-slate-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                  value={form.subscription_plan_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      subscription_plan_id: e.target.value,
                    })
                  }
                >
                  <option value="">Select Subscription Plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Timezone"
                  className="w-full border border-slate-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                  value={form.timezone}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      timezone: e.target.value,
                    })
                  }
                />

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input
                    type="time"
                    className="w-full border border-slate-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.working_start}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        working_start: e.target.value,
                      })
                    }
                  />
                  <input
                    type="time"
                    className="w-full border border-slate-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={form.working_end}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        working_end: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setShowModal(false)
                    }
                    className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700   text-white rounded-xl  shadow-sm"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div >
  );
};

export default Organizations;
