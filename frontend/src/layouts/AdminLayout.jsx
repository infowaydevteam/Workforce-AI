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
      items: [
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
          name: "Employees",
          icon: <Users size={20} />,
          action: () => navigate("/admin/employee"),
        },
      ],
    },

    {
      label: "ANALYTICS",
      items: [
        {
          name: "Reports",
          icon: <FileText size={20} />,
          action: () => navigate("/admin/reports"),
        },
        // {
        //   name: "Productivity",
        //   icon: <BarChart3 size={20} />,
        //   action: () => navigate("/admin/productivity"),
        // },
      ],
    },

    // {
    //   label: "SETTINGS",
    //   items: [
    //     {
    //       name: "Settings",
    //       icon: <Settings size={20} />,
    //       action: () => navigate("/admin/settings"),
    //     },
    //   ],
    // },
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