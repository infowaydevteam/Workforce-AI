import React, { useState } from "react";
import { BarChart3, LogOut, Menu } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const Sidebar = ({ menuItems }) => {
  const [collapsed, setCollapsed] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div
      className={`
        fixed left-0 top-0 h-screen bg-slate-900 text-white
        flex flex-col shadow-xl z-50 transition-all duration-300
        ${collapsed ? "w-20" : "w-64"}
      `}
    >

      {/* HEADER */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">

        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
              <BarChart3 size={20} />
            </div>

            <div>
              <h1 className="font-bold text-lg">IWF</h1>
              <p className="text-xs text-slate-400">InfoWorkforce</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-slate-800 rounded-lg"
        >
          <Menu size={20} />
        </button>

      </div>

      {/* MENU */}
      <div className="flex-1 overflow-y-auto p-3">

        {menuItems.map((group, idx) => (
          <div key={idx} className="mb-5">

            {!collapsed && group.label && (
              <p className="text-xs text-slate-500 uppercase mb-2 px-2">
                {group.label}
              </p>
            )}

            <div className="space-y-1">
              {group.items.map((item, i) => (
                <button
                  key={i}
                  onClick={item.action}
                  className={`
                    w-full flex items-center gap-3 px-3 py-3 rounded-xl
                    transition-all duration-200
                    ${
                      isActive(item.path)
                        ? "bg-indigo-600 text-white"
                        : "text-slate-300 hover:bg-slate-800"
                    }
                    ${collapsed ? "justify-center" : ""}
                  `}
                >
                  {item.icon}

                  {!collapsed && (
                    <span className="text-sm font-medium">
                      {item.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

      </div>

      {/* FOOTER */}
      <div className="p-3 border-t border-slate-800">

        {!collapsed && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-semibold">
              {user?.name?.charAt(0)?.toUpperCase() || "A"}
            </div>

            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.role}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={`
            w-full flex items-center gap-2 px-3 py-3 rounded-xl
            text-slate-300 hover:bg-red-500 hover:text-white
            transition-all
            ${collapsed ? "justify-center" : ""}
          `}
        >
          <LogOut size={18} />
          {!collapsed && "Logout"}
        </button>

      </div>
    </div>
  );
};

export default Sidebar;