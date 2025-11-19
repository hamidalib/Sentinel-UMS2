// frontend/src/components/Sidebar.jsx
import { NavLink } from "react-router-dom";
import {
  Logs,
  FileSpreadsheet,
  Plus,
  UsersRound,
  Folder,
  Settings,
  LogOut,
  UploadCloud,
} from "lucide-react";
import logo from "@/Assets/sentinel-logo.svg";

export default function Sidebar({ onAddUserClick, onImportClick }) {
  return (
    <div className="p- h-screen w-64 bg-[#0f0f0f] border-r border-gray-800 flex flex-col text-gray-300">
      <div className="px-4 py-4 text-xl font-bold text-white flex items-center justify-center">
        <img
          src={logo}
          alt="Sentinel Logo"
          className="w-auto h-auto inline-block"
        />
      </div>

      {/* Add Sentinel User Button */}
      <div className="p-2">
        <button
          onClick={onAddUserClick}
          className="flex justify-between items-center cursor-pointer w-full bg-[#FFC300] text-[#001D3D] font-bold px-3 py-2 rounded-lg mb-2 border-b-4 border-yellow-600 active:border-b-0 active:translate-y-1 transition-all hover:brightness-110"
        >
          Add Sentinel User <Plus className="w-4 h-4 ml-1" />
        </button>

        {/* Import CSV Button */}
        <button
          onClick={onImportClick}
          className="flex justify-between items-center cursor-pointer w-full bg-[#001D3D] hover:bg-blue-900 py-2 rounded-lg text-white px-3"
        >
          Import CSV <FileSpreadsheet className="w-4 h-4 ml-1" />
        </button>
      </div>

      <nav className="p-2 flex-1 space-y-1">
        <NavLink
          to="/dashboard/sentinel-users"
          className={({ isActive }) =>
            `flex items-center px-3 py-2 rounded-lg text-sm
             hover:bg-gray-800 transition 
             ${isActive ? "bg-gray-800 text-white" : ""}`
          }
        >
          <Folder className="w-5 h-5 mr-3" />
          Sentinel Users
        </NavLink>

        <NavLink
          to="/dashboard/admin-users"
          className={({ isActive }) =>
            `flex items-center px-3 py-2  rounded-lg text-sm 
             hover:bg-gray-800 transition 
             ${isActive ? "bg-gray-800 text-white" : ""}`
          }
        >
          <UsersRound className="w-5 h-5 mr-3" />
          Admin Users
        </NavLink>
      </nav>

      <div className="p-4 border-t border-gray-800 space-y-2">
        <NavLink
          to="/dashboard/logs"
          className={({ isActive }) =>
            `flex items-center px-3 py-2 rounded-lg text-sm 
             hover:bg-gray-800 transition 
             ${isActive ? "bg-gray-800 text-white" : ""}`
          }
        >
          <Logs className="w-5 h-5 mr-3" />
          Actions Logs
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
