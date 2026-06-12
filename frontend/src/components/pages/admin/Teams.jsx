import React, { useEffect, useState } from "react";
import { Plus, Trash2, UsersRound, } from "lucide-react";
import { API_BASE_URL } from "../../../../config";

const Teams = () => {
  const [teams, setTeams] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    organization_id: "",
  });

const fetchTeams = async () => {
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(
      `${API_BASE_URL}/api/teams`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await res.json();
    setTeams(data);
  } catch (err) {
    console.log(err);
  }
};

  // fetch orgs for dropdown
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
    setOrgs(data);
  } catch (err) {
    console.log(err);
  }
};

  useEffect(() => {
    fetchTeams();
    fetchOrgs();
  }, []);

  // add team
const handleAdd = async (e) => {
  e.preventDefault();

  try {
    const token = localStorage.getItem("token");

    await fetch(`${API_BASE_URL}/api/teams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });

    setShowModal(false);
    setForm({
      name: "",
      organization_id: "",
    });

    fetchTeams();
  } catch (err) {
    console.log(err);
  }
};

  // delete team
const handleDelete = async (id) => {
  try {
    const token = localStorage.getItem("token");

    await fetch(
      `${API_BASE_URL}/api/teams/${id}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    fetchTeams();
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
              Teams Management
            </h1>

            <p className="text-slate-500 mt-1">
              Manage teams across organizations
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-5 py-3  bg-indigo-600  hover:bg-indigo-700  text-white rounded-xl shadow-md transition-all">
            <Plus size={18} />
            Add Team
          </button>

        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>

                <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500">
                  Team
                </th>

                <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500">
                  Organization
                </th>

                <th className="text-center p-4 text-xs uppercase tracking-wider text-slate-500">
                  Action
                </th>

              </tr>
            </thead>

            <tbody>
              {teams.map((team) => (
                <tr key={team.id} className="border-b border-slate-100  hover:bg-slate-50  transition-all">
                  <td className="p-4">

                    <div className="flex items-center gap-3">

                      <div
                        className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center"
                      >
                        <UsersRound size={18} />
                      </div>

                      <span className="font-medium text-slate-800">
                        {team.team_name}
                      </span>

                    </div>

                  </td>

                  <td className="p-4">

                    <span
                      className=" px-3 py-1  rounded-full  text-xs font-medium bg-indigo-100 text-indigo-700">
                      {team.organization_name}
                    </span>

                  </td>

                  <td className="p-4 text-center">
                    <button
                      onClick={() =>
                        handleDelete(team.id)
                      }
                      className=" p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white  p-8  rounded-3xl  w-full  max-w-xl shadow-2xl border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800">
                Add Team
              </h2>

              <p className="text-slate-500 mt-1 mb-6">
                Create a new team and assign it to an organization
              </p>

              <form onSubmit={handleAdd}>
                <input
                  type="text"
                  placeholder="Team Name"
                  className=" w-full border border-slate-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                />

                <select
                  className=" w-full border border-slate-300 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                  value={form.organization_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      organization_id: e.target.value,
                    })
                  }
                >
                  <option value="">
                    Select Organization
                  </option>

                  {orgs.map((org) => (
                    <option
                      key={org.id}
                      value={org.id}
                    >
                      {org.name}
                    </option>
                  ))}
                </select>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setShowModal(false)
                    }
                    className=" px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
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
    </div>
  );
};

export default Teams;