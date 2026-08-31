import React, { useEffect, useState } from "react";
import { Copy, ExternalLink, Plus, Trash2, UserCog, Users as UsersIcon } from "lucide-react";
import { API_BASE_URL } from "../../../../config";
import { useNavigate } from "react-router-dom";

const Users = () => {
  const [users, setUsers] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [teams, setTeams] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "employee",
    organization_id: "",
    team_id: "",
    manager_id: "",
  });

  const [assignmentForm, setAssignmentForm] = useState({
    role: "employee",
    organization_id: "",
    team_id: "",
    manager_id: "",
  });

  const getAgentDownloadUrl = (agentToken, platform = "") => {
    if (!agentToken) return "";

    const url = `${API_BASE_URL}/api/agent/download-agent/${agentToken}`;
    return platform ? `${url}?platform=${platform}` : url;
  };

  const copyAgentLink = async (agentToken) => {
    const url = getAgentDownloadUrl(agentToken);

    try {
      await navigator.clipboard.writeText(url);
      alert("Agent download link copied");
    } catch {
      window.prompt("Copy agent download link", url);
    }
  };

  const openAgentLink = (agentToken) => {
    const url = getAgentDownloadUrl(agentToken);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };


     const getArrayData = (data) => {
    if (Array.isArray(data)) return data;

    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.organizations)) return data.organizations;
    if (Array.isArray(data.departments)) return data.departments;
    if (Array.isArray(data.users)) return data.users;
    if (Array.isArray(data.teams)) return data.teams;

    return [];
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/employee`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      console.log("Users API:", data);

      const userList = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.users)
            ? data.users
            : Array.isArray(data.data?.users)
              ? data.data.users
              : [];

      setUsers(userList);
    } catch (error) {
      console.error(error);
    }
  };


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

      console.log("Organizations API:", data);

      if (Array.isArray(data)) {
        setOrgs(data);
      } else if (Array.isArray(data.data)) {
        setOrgs(data.data);
      } else if (Array.isArray(data.organizations)) {
        setOrgs(data.organizations);
      } else if (Array.isArray(data.data?.organizations)) {
        setOrgs(data.data.organizations);
      } else {
        console.error("Invalid organizations response:", data);
        setOrgs([]);
      }
    } catch (err) {
      console.error("Failed to fetch organizations:", err);
      setOrgs([]);
    }
  };


  const fetchTeamsByOrg = async (orgId) => {
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

      const teamList = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.teams)
            ? data.teams
            : Array.isArray(data.data?.teams)
              ? data.data.teams
              : [];

      const filtered = teamList.filter(
        (team) =>
          String(team.organization_id) === String(orgId)
      );

      setTeams(filtered);
    } catch (err) {
      console.error("Failed to fetch teams:", err);
      setTeams([]);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
    fetchOrgs();
  }, []);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this user?"
    );

    if (!confirmDelete) return;

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `${API_BASE_URL}/api/employee/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        fetchUsers();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleOrgChange = (e) => {
    const orgId = e.target.value;

    setFormData((prev) => ({
      ...prev,
      organization_id: orgId,
      team_id: "",
      manager_id: "",
    }));

    fetchTeamsByOrg(orgId);
  };

  useEffect(() => {
    if (showModal && role === "admin") {
      handleOrgChange({
        target: {
          value: user.organization_id,
        },
      });

      setFormData((prev) => ({
        ...prev,
        role: "employee",
        organization_id: user.organization_id,
        team_id: user.team_id,
      }));
    }
  }, [showModal]);

  const handleAddUser = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
    };

    if (role !== "superadmin") {
      payload.role = "employee";
      payload.organization_id = user.organization_id;
      payload.team_id = user.team_id;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setShowModal(false);

        setFormData({
          name: "",
          email: "",
          password: "",
          role: "employee",
          organization_id: "",
          team_id: "",
        });

        fetchUsers();

        alert("User added successfully");
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <div className="p-8 bg-slate-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800">
                Users Management
              </h1>

              <p className="text-slate-500 mt-1">
                Manage users, teams and organizations
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
              Add User
            </button>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full min-w-[1180px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500">
                    User
                  </th>

                  <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500">
                    Email
                  </th>

                  <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500">
                    Role
                  </th>

                  <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500">
                    Organization
                  </th>

                  <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500">
                    Team
                  </th>

                  <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500">
                    Manager
                  </th>

                  <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500">
                    Status
                  </th>

                  <th className="text-left p-4 text-xs uppercase tracking-wider text-slate-500">
                    Agent Install
                  </th>

                  <th className="text-center p-4 text-xs uppercase tracking-wider text-slate-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => navigate(`/admin/employee/${user.id}`)}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-all cursor-pointer"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">

                          <div
                            className=" w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold"
                          >
                            {user.name?.charAt(0)?.toUpperCase()}
                          </div>

                          <span className="font-medium text-slate-800">
                            {user.name}
                          </span>

                        </div>
                      </td>
                      <td className="p-4">{user.email}</td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${user.role === "manager" ? "bg-amber-100 text-amber-700" : user.role === "executive" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                          {user.role}
                        </span>
                      </td>

                      {/* FIXED FIELDS */}
                      <td className="p-4">
                        {user.organization_name || "-"}
                      </td>

                      <td className="p-4">
                        {user.team_name || "-"}
                      </td>

                      <td className="p-4">
                        {user.manager_name || "-"}
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold
      ${user.status === "Online"
                              ? "bg-green-100 text-green-700"
                              : user.status === "Idle"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                        >
                          {user.status || "Offline"}
                        </span>
                      </td>

                      <td className="p-4">
                        {user.agent_token ? (
                          <div
                            className="flex flex-wrap gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => copyAgentLink(user.agent_token)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold"
                              title="Copy employee-specific download link"
                            >
                              <Copy size={13} />
                              Copy
                            </button>
                            <button
                              onClick={() => openAgentLink(user.agent_token)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold"
                              title="Open employee download page"
                            >
                              <ExternalLink size={13} />
                              Open
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400">Not generated</span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssignmentModal(user);
                            }}
                            className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
                          >
                            <UserCog size={16} />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(user.id);
                            }}
                            className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-gray-400">
                      <div className="flex flex-col items-center py-10 text-slate-400">
                        <UsersIcon size={50} />

                        <h3 className="mt-4 text-lg font-medium">
                          No Users Found
                        </h3>

                        <p className="text-sm">
                          Create your first user account
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200">
            <h2 className="text-xl font-bold mb-4">Add User</h2>

            <form onSubmit={handleAddUser} className="space-y-4">
              <input
                name="name"
                placeholder="Name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border p-3 rounded-xl"
                required
              />

              <input
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                className="w-full border p-3 rounded-xl"
                required
              />

              <input
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="w-full border p-3 rounded-xl"
                required
              />

              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full border p-3 rounded-xl"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="executive">Executive</option>
              </select>

              <select
                value={formData.organization_id}
                onChange={handleOrgChange}
                className="w-full border p-3 rounded-xl"
              >
                <option value="">Select Organization</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>

              <select
                value={formData.team_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    team_id: e.target.value,
                  }))
                }
                className="w-full border p-3 rounded-xl"
              >
                <option value="">Select Team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.team_name || team.name}
                  </option>
                ))}
              </select>

              <select
                value={formData.manager_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    manager_id: e.target.value,
                  }))
                }
                className="w-full border p-3 rounded-xl"
              >
                <option value="">Select Manager</option>
                {users
                  .filter((user) => user.role === "manager" && String(user.organization_id) === String(formData.organization_id))
                  .map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
              </select>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2 border rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl"
                >
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignmentModal && selectedUser && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200">
            <h2 className="text-xl font-bold mb-4">
              Edit Assignment
            </h2>

            <form onSubmit={handleUpdateAssignment} className="space-y-4">
              <select
                value={assignmentForm.role}
                onChange={(e) =>
                  setAssignmentForm((prev) => ({
                    ...prev,
                    role: e.target.value,
                  }))
                }
                className="w-full border p-3 rounded-xl"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="executive">Executive</option>
              </select>

              <select
                value={assignmentForm.organization_id}
                onChange={handleAssignmentOrgChange}
                className="w-full border p-3 rounded-xl"
              >
                <option value="">Select Organization</option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>

              <select
                value={assignmentForm.team_id}
                onChange={(e) =>
                  setAssignmentForm((prev) => ({
                    ...prev,
                    team_id: e.target.value,
                  }))
                }
                className="w-full border p-3 rounded-xl"
              >
                <option value="">Select Team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.team_name || team.name}
                  </option>
                ))}
              </select>

              <select
                value={assignmentForm.manager_id}
                onChange={(e) =>
                  setAssignmentForm((prev) => ({
                    ...prev,
                    manager_id: e.target.value,
                  }))
                }
                className="w-full border p-3 rounded-xl"
              >
                <option value="">Select Manager</option>
                {users
                  .filter((user) => user.role === "manager" && String(user.organization_id) === String(assignmentForm.organization_id))
                  .map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}
                    </option>
                  ))}
              </select>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(false)}
                  className="px-5 py-2 border rounded-xl"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-xl"
                >
                  Save Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Users;
