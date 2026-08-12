import React from "react";
import Sidebar from "../components/sidebar/Sidebar";
import {
  LayoutDashboard,
  Users,
  Building2,
  UsersRound,
  FileText,
  BarChart3,
} from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";

const AdminLayout = () => {
  const navigate = useNavigate();

  const role = localStorage.getItem("role");

  const managementItems = [];

  if (role === "superadmin") {
    managementItems.push(
      {
        name: "Organizations",
        icon: <Building2 size={20} />,
        action: () => navigate("/admin/organizations"),
      },
      {
        name: "Teams",
        icon: <UsersRound size={20} />,
        action: () => navigate("/admin/teams"),
      },
      {
        name: "Policies",
        icon: <FileText size={20} />,
        action: () => navigate("/admin/policies"),
      }
    );
  }


  managementItems.push({
    name: "Employees",
    icon: <Users size={20} />,
    action: () => navigate("/admin/employee"),
  });

  const menuItems = [
    {
      label: "MAIN",
      items: [
        {
          name: "Dashboard",
          icon: <LayoutDashboard size={20} />,
          action: () => navigate("/admin"),
        },
      ],
    },
    {
      label: "MANAGEMENT",
      items: managementItems,
    },
    {
      label: "ANALYTICS",
      items: [
        {
          name: "Reports",
          icon: <BarChart3 size={20} />,
          action: () => navigate("/admin/reports"),
        },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen">
      <Sidebar menuItems={menuItems} />

      <div className="ml-64 flex-1">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;