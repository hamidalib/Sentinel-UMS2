import { NavLink } from "react-router-dom";
import { Users, Shield, Settings, LogOut } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="h-screen w-64 bg-[#0f0f0f] border-r border-gray-800 flex flex-col text-gray-300">

      <div className="px-6 py-6 text-xl font-bold text-white">
        Sentinel UMS
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <NavLink
          to="/dashboard/sentinel-users"
          className={({ isActive }) =>
            `flex items-center px-3 py-2 rounded-lg text-sm 
             hover:bg-gray-800 transition 
             ${isActive ? "bg-gray-800 text-white" : ""}`
          }
        >
          <Shield className="w-5 h-5 mr-3" />
          Sentinel Users
        </NavLink>

        <NavLink
          to="/dashboard/admin-users"
          className={({ isActive }) =>
            `flex items-center px-3 py-2 rounded-lg text-sm 
             hover:bg-gray-800 transition 
             ${isActive ? "bg-gray-800 text-white" : ""}`
          }
        >
          <Users className="w-5 h-5 mr-3" />
          Admin Users
        </NavLink>
      </nav>

      <div className="p-4 border-t border-gray-800 space-y-2">
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) =>
            `flex items-center px-3 py-2 rounded-lg text-sm 
             hover:bg-gray-800 transition 
             ${isActive ? "bg-gray-800 text-white" : ""}`
          }
        >
          <Settings className="w-5 h-5 mr-3" />
          Settings
        </NavLink>

        <button
          onClick={() => {
            localStorage.removeItem("token");
            window.location.href = "/";
          }}
          className="flex items-center w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-800 text-red-400"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </div>
  );
}
