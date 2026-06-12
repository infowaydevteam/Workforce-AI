import React from "react";
import Sidebar from "../components/sidebar/Sidebar";
import { LayoutDashboard, UserPlus, Users, Building2 } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";

const HrLayout = () => {
  const navigate = useNavigate();

  const menuItems = [
    {
      label: "MAIN",
      items: [
        { name: "Dashboard", icon: <LayoutDashboard size={20} />, action: () => navigate("/hr"), path: "/hr" },
      ],
    },
    {
      label: "HR TOOLS",
      items: [
        { name: "Invite Employees", icon: <UserPlus size={20} />, action: () => navigate("/hr/invitations"), path: "/hr/invitations" },
        { name: "All Employees", icon: <Users size={20} />, action: () => navigate("/hr/employees"), path: "/hr/employees" },
        { name: "Departments", icon: <Building2 size={20} />, action: () => navigate("/hr/departments"), path: "/hr/departments" },
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

export default HrLayout;
