import React from "react";
import Sidebar from "../components/sidebar/Sidebar";
import {
    LayoutDashboard,
    Users,
    Building2,
    UsersRound,
    FileText,
    BarChart3,
    Tag,
    TrendingUp,
    UserPlus,
    Layers,
} from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";

const AdminLayout = () => {
    const navigate = useNavigate();

  const menuItems = [
    {
      label: "MAIN",
      items: [
        {
          name: "Dashboard",
          icon: <LayoutDashboard size={20} />,
          path: "/admin",
          action: () => navigate("/admin"),
        },
      ],
    },

    {
      label: "SETUP",
      items: [
        {
          name: "Organizations",
          icon: <Building2 size={20} />,
          path: "/admin/organizations",
          action: () => navigate("/admin/organizations"),
        },
        {
          name: "Departments",
          icon: <Layers size={20} />,
          path: "/admin/departments",
          action: () => navigate("/admin/departments"),
        },
        {
          name: "Teams",
          icon: <UsersRound size={20} />,
          path: "/admin/teams",
          action: () => navigate("/admin/teams"),
        },
      ],
    },

    {
      label: "WORKFORCE",
      items: [
        {
          name: "Employees",
          icon: <Users size={20} />,
          path: "/admin/employee",
          action: () => navigate("/admin/employee"),
        },
        {
          name: "Invitations",
          icon: <UserPlus size={20} />,
          path: "/admin/invitations",
          action: () => navigate("/admin/invitations"),
        },
      ],
    },

    {
      label: "ANALYTICS",
      items: [
        {
          name: "Productivity",
          icon: <TrendingUp size={20} />,
          path: "/admin/productivity",
          action: () => navigate("/admin/productivity"),
        },
        {
          name: "Reports",
          icon: <FileText size={20} />,
          path: "/admin/reports",
          action: () => navigate("/admin/reports"),
        },
        {
          name: "Classification",
          icon: <Tag size={20} />,
          path: "/admin/classification",
          action: () => navigate("/admin/classification"),
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
