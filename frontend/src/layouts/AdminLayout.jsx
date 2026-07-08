import React from "react";
import Sidebar from "../components/sidebar/Sidebar";
import {
    LayoutDashboard,
    Users,
    Building2,
    UsersRound,
    FileText,
    ClipboardCheck,
    Settings2,
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
          path: "/admin",
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
          path: "/admin/organizations",
          icon: <Building2 size={20} />,
          action: () => navigate("/admin/organizations"),
        },
        {
          name: "Onboarding",
          path: "/admin/company-onboarding",
          icon: <Settings2 size={20} />,
          action: () => navigate("/admin/company-onboarding"),
        },
        {
          name: "Teams",
          path: "/admin/teams",
          icon: <UsersRound size={20} />,
          action: () => navigate("/admin/teams"),
        },
        {
          name: "Employees",
          path: "/admin/employee",
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
          path: "/admin/reports",
          icon: <FileText size={20} />,
          action: () => navigate("/admin/reports"),
        },
        {
          name: "Level 1 Flow",
          path: "/admin/level-1-flow",
          icon: <ClipboardCheck size={20} />,
          action: () => navigate("/admin/level-1-flow"),
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
