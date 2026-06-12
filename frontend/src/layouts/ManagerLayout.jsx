import React from "react";
import Sidebar from "../components/sidebar/Sidebar";
import { LayoutDashboard, Users, TrendingUp, FileText } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";

const ManagerLayout = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      label: "MAIN",
      items: [
        { name: "Dashboard", icon: <LayoutDashboard size={20} />, action: () => navigate("/manager"), path: "/manager" },
      ],
    },
    {
      label: "MY TEAM",
      items: [
        { name: "Team Members", icon: <Users size={20} />, action: () => navigate("/manager/team"), path: "/manager/team" },
        { name: "Productivity", icon: <TrendingUp size={20} />, action: () => navigate("/manager/productivity"), path: "/manager/productivity" },
        { name: "Reports", icon: <FileText size={20} />, action: () => navigate("/manager/reports"), path: "/manager/reports" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar menuItems={menuItems} />
      <div className="ml-64">
        <Outlet />
      </div>
    </div>
  );
};

export default ManagerLayout;
