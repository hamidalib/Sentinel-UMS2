import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import AddSentinelUserModal from "../components/ui/AddSentinelUserModal";
import ImportSentinelUsersModal from "../components/ui/ImportSentinelUsersModal";
import AddAdminUserModal from "../components/ui/AddAdminUserModal";

export default function DashboardLayout() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);

  return (
    <div className="flex h-screen bg-[#1a1a1a] text-white">
      <Sidebar
        onAddUserClick={() => setShowAddModal(true)}
        onImportClick={() => setShowImportModal(true)}
        onCreateAdminClick={() => setShowAddAdminModal(true)}
      />

      {/* Content area where pages load */}
      <div className="flex-1 p-4 overflow-y-auto">
        <Outlet />
      </div>

      {/* Modals */}
      <AddSentinelUserModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
      />
      <ImportSentinelUsersModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
      />
      <AddAdminUserModal
        open={showAddAdminModal}
        onClose={() => setShowAddAdminModal(false)}
      />
    </div>
  );
}
