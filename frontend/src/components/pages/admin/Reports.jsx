import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../../config";
import { Download } from "lucide-react";
import ScreenshotReports from "./ScreenshotReports";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

const COLORS = ["#4f46e5", "#22c55e", "#ef4444"];

const formatDuration = (sec) => {
  sec = Number(sec || 0);

  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h) return `${h}h ${m}m ${s}s`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
};

const Card = ({ title, value }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border hover:shadow-md transition">
    <p className="text-gray-500 text-sm">{title}</p>
    <h2 className="text-2xl font-bold mt-2 text-gray-800">{value}</h2>
  </div>
);

const Reports = () => {
  const token = localStorage.getItem("token");

  const [orgs, setOrgs] = useState([]);
  const [organizationId, setOrganizationId] = useState("");
  const [teams, setTeams] = useState([]);
  const [teamId, setTeamId] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [report, setReport] = useState(null);
  const [expandedUser, setExpandedUser] = useState(null);
  const [activeReportView, setActiveReportView] = useState("team");

  useEffect(() => {
    loadOrganizations();
    loadTeams();
  }, []);

  const loadOrganizations = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/organization`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (res.ok) {
        setOrgs(data);
      }
    } catch (err) {
      console.log(err);
    }
  };

  const loadTeams = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      setTeams(data);
    } catch (err) {
      console.log(err);
    }
  };

  const filteredTeams = organizationId
    ? teams.filter((team) => String(team.organization_id) === String(organizationId))
    : teams;

  const handleOrganizationChange = (e) => {
    setOrganizationId(e.target.value);
    setTeamId("");
    setReport(null);
  };

  const generateReport = async () => {
    if (!organizationId) {
      alert("Please Select Organization");
      return;
    }

    if (!teamId) {
      alert("Please Select Team");
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/team-report/${teamId}?from=${fromDate}&to=${toDate}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      console.log(data);

      if (data.success) {
        setReport(data.data);
      } else {
        alert(data.message || "Unable to generate report");
      }
    } catch (err) {
      console.log(err);
    }
  };

  const exportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("IWF Team Productivity Report", 14, 18);

    doc.setFontSize(11);

    doc.text(`Admin : ${report.admin.name}`, 14, 30);

    doc.text(`Email : ${report.admin.email}`, 14, 37);

    doc.text(`Organization ID : ${report.organization.id}`, 14, 44);

    doc.text(`Team ID : ${report.team.id}`, 14, 51);

    doc.text(
      `Report : ${report.report_period.from}  To  ${report.report_period.to}`,
      14,
      58
    );

    autoTable(doc, {
      startY: 68,

      head: [["Metric", "Value"]],

      body: [
        ["Members", report.summary.total_members],

        ["Working Time", formatDuration(report.summary.working_time)],

        ["Active Time", formatDuration(report.summary.active_time)],

        ["Idle Time", formatDuration(report.summary.idle_time)],

        ["Offline Time", formatDuration(report.summary.offline_time)],

        ["Productivity", `${report.summary.productivity}%`],
      ],
    });

    // Employees Application Details

    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(
      "Employees Application Details",
      14,
      doc.lastAutoTable.finalY + 10
    );

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,

      head: [["Application", "Active", "Idle", "Total"]],

      body: report.app_usage.map((app) => [
        app.app_name || "Idle / No Active App",
        formatDuration(app.active_time),
        formatDuration(app.idle_time),
        formatDuration(app.total_time),
      ]),
    });


    // Employee Wise Summary PDF

    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text(
      "Employee Wise Summary",
      14,
      doc.lastAutoTable.finalY + 10
    );

    doc.setFontSize(11);
    doc.setFont(undefined, "normal");

    autoTable(doc, {

      startY: doc.lastAutoTable.finalY + 18,

      head: [
        [
          "Employee",
          "Active Time",
          "Idle Time",
          "Working Time",
          "Productivity Time",
          "Productivity"
        ]
      ],


      body: report.user_details.map((user) => [

        user.name,

        formatDuration(user.active_time),

        formatDuration(user.idle_time),

        formatDuration(user.working_time),

        formatDuration(user.productivity_time),

        `${user.top10_productivity}%`

      ])

    });





    // Employee Application Details


    report.user_details.forEach((user) => {


      doc.addPage();



      doc.setFontSize(16);

      doc.text(
        `${user.name} - Application Details`,
        14,
        20
      );

      doc.setFontSize(11);

      doc.text(
        `Working Time : ${formatDuration(user.working_time)}`,
        14,
        30
      );

      doc.text(
        `Active Time : ${formatDuration(user.active_time)}`,
        14,
        37
      );

      doc.text(
        `Idle Time : ${formatDuration(user.idle_time)}`,
        14,
        44
      );

      doc.text(
        `Productivity Time : ${formatDuration(user.productivity_time)}`,
        14,
        51
      );

      doc.text(
        `Productivity : ${user.top10_productivity}%`,
        14,
        58
      );



      if (user.applications.length === 0) {


        doc.setFontSize(12);

        doc.text(
          "No Activity Found",
          14,
          35
        );


      }

      else {


        autoTable(doc, {


          startY: 68,


          head: [

            [
              "Application",
              "Active",
              "Idle",
              "Total"

            ]

          ],



          body:


            user.applications.map((app) => [


              app.app_name || "Unknown",


              formatDuration(app.active_time),


              formatDuration(app.idle_time),


              formatDuration(app.total_time)


            ])


        });


      }



    });

    doc.save("Team_Productivity_Report.pdf");
  };

  const reportTabs = (
    <div className="bg-white rounded-2xl p-2 shadow-sm border inline-flex gap-2">
      <button
        onClick={() => setActiveReportView("team")}
        className={`px-4 py-2 rounded-xl ${
          activeReportView === "team"
            ? "bg-indigo-600 text-white"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        Team Report
      </button>
      <button
        onClick={() => {
          setReport(null);
          setActiveReportView("screenshots");
        }}
        className={`px-4 py-2 rounded-xl ${
          activeReportView === "screenshots"
            ? "bg-indigo-600 text-white"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        Screenshots
      </button>
    </div>
  );

  if (activeReportView === "screenshots") {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-gradient-to-r from-indigo-700 to-purple-700 rounded-3xl p-8 text-white">
            <h1 className="text-4xl font-bold">Reports</h1>
            <p className="mt-2 text-indigo-100">
              Review employee screenshots by employee and date range
            </p>
          </div>

          {reportTabs}

          <ScreenshotReports />
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="bg-gradient-to-r from-indigo-700 to-purple-700 rounded-3xl p-8 text-white">
            <h1 className="text-4xl font-bold">Team Reports</h1>

            <p className="mt-2 text-indigo-100">
              Generate Team Productivity Report
            </p>
          </div>

          {reportTabs}

          <div className="bg-white rounded-2xl p-6 grid md:grid-cols-5 gap-4">
            <select
              value={organizationId}
              onChange={handleOrganizationChange}
              className="border rounded-xl p-3"
            >
              <option value="">Select Organization</option>

              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>

            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="border rounded-xl p-3"
              disabled={!organizationId}
            >
              <option value="">Select Team</option>

              {filteredTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.team_name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border rounded-xl p-3"
            />

            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border rounded-xl p-3"
            />

            <button
              onClick={generateReport}
              className="bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
            >
              Generate Report
            </button>
          </div>
        </div>
      </div>
    );
  }

  const pieData = [
    {
      name: "Active",
      value: Number(report.summary.active_time),
    },
    {
      name: "Idle",
      value: Number(report.summary.idle_time),
    },
    {
      name: "Offline",
      value: Number(report.summary.offline_time),
    },
  ];

  const appData = [...report.app_usage]
    .sort((a, b) => Number(b.total_time) - Number(a.total_time))
    .slice(0, 10)
    .map((app) => ({
      name: app.app_name || "Idle",
      time: Number(app.total_time),
    }));

  const totalAppTime = report.app_usage.reduce(
    (sum, app) => sum + Number(app.total_time || 0),
    0
  );
  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="bg-gradient-to-r from-indigo-700 to-purple-700 rounded-3xl p-8 text-white flex flex-col md:flex-row justify-between items-center gap-4">

          <div>
            <h1 className="text-3xl font-bold">
              {report.admin.name}
            </h1>

            <p className="text-indigo-100 mt-2">
              Team Productivity Report
            </p>

            <p className="text-sm mt-2 text-indigo-200">
              {report.report_period.from} → {report.report_period.to}
            </p>
          </div>

          <button
            onClick={exportPDF}
            className="bg-white text-indigo-700 px-5 py-3 rounded-xl flex items-center gap-2 hover:bg-indigo-50"
          >
            <Download size={18} />
            Export PDF
          </button>

        </div>

        <div className="grid lg:grid-cols-6 md:grid-cols-3 grid-cols-2 gap-4">

          <Card
            title="Members"
            value={report.summary.total_members}
          />

          <Card
            title="Working Time"
            value={formatDuration(report.summary.working_time)}
          />

          <Card
            title="Active Time"
            value={formatDuration(report.summary.active_time)}
          />

          <Card
            title="Idle Time"
            value={formatDuration(report.summary.idle_time)}
          />

          <Card
            title="Offline Time"
            value={formatDuration(report.summary.offline_time)}
          />

          <Card
            title="Productivity"
            value={`${report.summary.productivity}%`}
          />

        </div>

        <div className="grid lg:grid-cols-2 gap-6">

          <div className="bg-white rounded-2xl p-6 shadow-sm">

            <h2 className="text-lg font-bold mb-5">
              Active vs Idle vs Offline
            </h2>

            <ResponsiveContainer width="100%" height={320}>

              <PieChart>

                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={110}
                  label
                >

                  {pieData.map((entry, index) => (

                    <Cell
                      key={index}
                      fill={COLORS[index % COLORS.length]}
                    />

                  ))}

                </Pie>

                <Tooltip
                  formatter={(value) => formatDuration(value)}
                />

                <Legend />

              </PieChart>

            </ResponsiveContainer>

          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">

            <h2 className="text-lg font-bold mb-5">
              Top 10 Application Usage
            </h2>

            <ResponsiveContainer width="100%" height={320}>

              <BarChart
                data={appData}
                margin={{
                  top: 20,
                  right: 20,
                  left: 10,
                  bottom: 90,
                }}
              >

                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-35}
                  textAnchor="end"
                  height={100}
                  tick={{
                    fontSize: 11,
                  }}
                />

                <YAxis
                  tickFormatter={(v) =>
                    Math.round(v / 60) + "m"
                  }
                />

                <Tooltip
                  formatter={(value) =>
                    formatDuration(value)
                  }
                />

                <Legend />

                <Bar
                  dataKey="time"
                  name="Usage Time"
                  radius={[6, 6, 0, 0]}
                />

              </BarChart>

            </ResponsiveContainer>

          </div>

        </div>



        <div className="bg-white rounded-2xl shadow-sm p-6">

          <div className="flex justify-between items-center mb-5">

            <h2 className="text-xl font-bold">
              Overall Application Usage
            </h2>

            <span className="text-sm text-gray-500">
              {report.app_usage.length} Applications
            </span>

          </div>

          <div className="overflow-x-auto">

            <table className="min-w-full">
              <thead>

                <tr className="bg-slate-100 border-b">

                  <th className="text-left p-3">
                    Application
                  </th>

                  <th className="text-center p-3">
                    Active
                  </th>

                  <th className="text-center p-3">
                    Idle
                  </th>

                  <th className="text-center p-3">
                    Total
                  </th>

                </tr>

              </thead>

              <tbody>                {report.app_usage.map((app, index) => (
                <tr
                  key={index}
                  className="border-b hover:bg-slate-50 transition"
                >
                  <td className="p-3 font-medium text-gray-700">
                    {app.app_name || "Idle / No Active App"}
                  </td>

                  <td className="p-3 text-center">
                    {formatDuration(app.active_time)}
                  </td>

                  <td className="p-3 text-center">
                    {formatDuration(app.idle_time)}
                  </td>

                  <td className="p-3 text-center font-semibold">
                    {formatDuration(app.total_time)}
                  </td>
                </tr>
              ))}
              </tbody>
            </table>

          </div>
        </div>

        {/* Employee Wise Summary */}

        <div className="bg-white rounded-2xl shadow-sm p-6">

          <h2 className="text-xl font-bold mb-5">
            Employee Wise Summary
          </h2>


          <div className="overflow-x-auto">

            <table className="min-w-full">

              <thead>

                <tr className="bg-slate-100 border-b">

                  <th className="text-left p-3">
                    Employee
                  </th>

                  <th className="text-center p-3">
                    Active Time
                  </th>

                  <th className="text-center p-3">
                    Idle Time
                  </th>

                  <th className="text-center p-3">
                    Total Time
                  </th>

                  <th className="text-center p-3">
                    Productivity Time
                  </th>
                  <th className="text-center p-3">
                    Productivity
                  </th>

                </tr>

              </thead>


              <tbody>

                {report.user_details.map((user, index) => (

                  <tr
                    key={index}
                    className="border-b hover:bg-slate-50"
                  >

                    <td className="p-3 font-semibold">
                      {user.name}
                    </td>

                    <td className="p-3 text-center">
                      {formatDuration(user.active_time)}
                    </td>

                    <td className="p-3 text-center">
                      {formatDuration(user.idle_time)}
                    </td>

                    <td className="p-3 text-center font-semibold">
                      {formatDuration(user.working_time)}
                    </td>
                    <td className="p-3 text-center font-semibold">
                      {formatDuration(user.productivity_time)}
                    </td>

                    <td className="p-3 text-center">

                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold
            ${user.top10_productivity >= 80
                            ? "bg-green-100 text-green-700"
                            : user.top10_productivity >= 50
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                      >
                        {user.top10_productivity}%
                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>


            </table>


          </div>


        </div>

        {/* Employee Application Details */}


        <div className="bg-white rounded-2xl shadow-sm p-6">


          <h2 className="text-xl font-bold mb-5">
            Employee Application Details
          </h2>



          <div className="space-y-4">



            {
              report.user_details.map((user, index) => {


                return (

                  <div
                    key={index}
                    className="border rounded-xl overflow-hidden"
                  >


                    <button

                      onClick={() => {

                        setExpandedUser(
                          expandedUser === user.user_id
                            ? null
                            : user.user_id
                        )

                      }}

                      className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100"


                    >


                      <div>

                        <p className="font-semibold text-gray-800">

                          {user.name}

                        </p>


                        <p className="text-sm text-gray-500">

                          {
                            user.applications.length
                          }

                          Applications

                        </p>


                      </div>



                      <div>

                        <span className="text-indigo-600 font-bold">

                          {
                            expandedUser === user.user_id
                              ?
                              "▲"
                              :
                              "▼"
                          }


                        </span>


                      </div>


                    </button>





                    {
                      expandedUser === user.user_id && (


                        <div className="p-4">


                          {
                            user.applications.length === 0

                              ?

                              <div className="text-center text-gray-500 py-5">

                                No Activity Found

                              </div>


                              :

                              <div className="overflow-x-auto">


                                <table className="min-w-full">


                                  <thead>

                                    <tr className="bg-slate-100 border-b">


                                      <th className="p-3 text-left">

                                        Application

                                      </th>


                                      <th className="p-3 text-center">

                                        Active

                                      </th>


                                      <th className="p-3 text-center">

                                        Idle

                                      </th>


                                      <th className="p-3 text-center">

                                        Total

                                      </th>


                                    </tr>


                                  </thead>



                                  <tbody>


                                    {
                                      user.applications.map((app, i) => (


                                        <tr
                                          key={i}
                                          className="border-b"
                                        >


                                          <td className="p-3 font-medium">

                                            {
                                              app.app_name || "Unknown"
                                            }

                                          </td>


                                          <td className="p-3 text-center">

                                            {
                                              formatDuration(app.active_time)
                                            }

                                          </td>


                                          <td className="p-3 text-center">

                                            {
                                              formatDuration(app.idle_time)
                                            }

                                          </td>


                                          <td className="p-3 text-center font-semibold">

                                            {
                                              formatDuration(app.total_time)
                                            }

                                          </td>


                                        </tr>


                                      ))

                                    }



                                  </tbody>


                                </table>



                              </div>


                          }


                        </div>


                      )


                    }




                  </div>


                )


              })

            }



          </div>



        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">

          <h2 className="text-xl font-bold mb-5">
            Report Information
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

            <div>
              <p className="text-sm text-gray-500">
                Admin Name
              </p>

              <p className="font-semibold mt-1">
                {report.admin.name}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Admin Email
              </p>

              <p className="font-semibold mt-1 break-all">
                {report.admin.email}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Organization ID
              </p>

              <p className="font-semibold mt-1">
                {report.organization.id}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Team ID
              </p>

              <p className="font-semibold mt-1">
                {report.team.id}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Report From
              </p>

              <p className="font-semibold mt-1">
                {report.report_period.from}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Report To
              </p>

              <p className="font-semibold mt-1">
                {report.report_period.to}
              </p>
            </div>

          </div>

        </div>

      </div>
    </div>
  )
};

export default Reports;
