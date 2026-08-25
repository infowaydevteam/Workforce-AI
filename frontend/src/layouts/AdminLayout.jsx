import React from "react";
import Sidebar from "../components/sidebar/Sidebar";
import {
  LayoutDashboard,
  Users,
  Building2,
  UsersRound,
  FileText,
  BarChart3,
  Settings,
} from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";

const AdminLayout = () => {
  const navigate = useNavigate();

  const role = localStorage.getItem("role");

  const managementItems = [];

  // Sirf Super Admin
  if (role === "superadmin") {
    managementItems.push({
      name: "Organizations",
      icon: <Building2 size={20} />,
      action: () => navigate("/admin/organizations"),
    },
      {
        name: "Teams",
        icon: <UsersRound size={20} />,
        action: () => navigate("/admin/teams"),
      }
    );
  }

  if (role !== "hr") {
    managementItems.push(
      {
        name: "Employees",
        icon: <Users size={20} />,
        action: () => navigate("/admin/employee"),
      },
      {
        name: "Policies",
        icon: <Settings size={20} />,
        action: () => navigate("/admin/policies"),
      }
    );
  }

  const menuItems = [
    ...(role !== "hr"
      ? [
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
        ]
      : []),
    ...(managementItems.length
      ? [
          {
            label: "MANAGEMENT",
            items: managementItems,
          },
        ]
      : []),
    {
      label: "ANALYTICS",
      items: [
        {
          name: "Reports",
          icon: <FileText size={20} />,
          action: () => navigate("/admin/reports"),
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        title="Admin Panel"
        menuItems={menuItems}
      />

      <div className="ml-64">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
