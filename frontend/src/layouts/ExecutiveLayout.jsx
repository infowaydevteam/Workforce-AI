import React from "react";
import Sidebar from "../components/sidebar/Sidebar";
import { LayoutDashboard, BarChart3, TrendingUp } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";

const ExecutiveLayout = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      label: "EXECUTIVE",
      items: [
        { name: "Analytics", icon: <LayoutDashboard size={20} />, action: () => navigate("/executive"), path: "/executive" },
        { name: "Productivity", icon: <TrendingUp size={20} />, action: () => navigate("/executive/productivity"), path: "/executive/productivity" },
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

export default ExecutiveLayout;
