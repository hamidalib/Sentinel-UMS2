import React, { useEffect, useState } from "react";
import { Search, ArrowUpDown, Edit, Trash } from "lucide-react";

export default function AdminUsersTable({ data, refreshData }) {
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [editingItem, setEditingItem] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (Array.isArray(data)) setFiltered(data);
  }, [data]);

  useEffect(() => {
    if (!Array.isArray(data)) return;

    let updated = [...data];

    // Search across username and role
    if (search.trim() !== "") {
      updated = updated.filter((row) => {
        const username = String(row.username || "").toLowerCase();
        const role = String(row.role || "").toLowerCase();
        const q = search.toLowerCase();
        return username.includes(q) || role.includes(q);
      });
    }

    // Sort by created_at (latest/oldest)
    updated.sort((a, b) => {
      const da = new Date(a.created_at);
      const db = new Date(b.created_at);
      return sortOrder === "latest" ? db - da : da - db;
    });

    setFiltered(updated);
    setCurrentPage(1);
  }, [search, sortOrder, data]);

  if (!data || !Array.isArray(data)) return null;

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginatedData = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const startRowIndex = (currentPage - 1) * pageSize;

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };
  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/users/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Delete failed");
      if (typeof refreshData === "function") await refreshData();
    } catch (err) {
      console.error("Failed to delete user:", err);
      alert("Failed to delete user");
    }
  };

  const openEdit = (item) => setEditingItem({ ...item, password: "" });
  const closeEdit = () => setEditingItem(null);

  const handleEditChange = (key, value) =>
    setEditingItem((prev) => ({ ...prev, [key]: value }));

  const handleSaveEdit = async () => {
    if (!editingItem || !editingItem.id) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/users/${editingItem.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: editingItem.username,
            role: editingItem.role,
            password: editingItem.password,
          }),
        }
      );

      if (!res.ok) throw new Error("Update failed");
      closeEdit();
      if (typeof refreshData === "function") await refreshData();
    } catch (err) {
      console.error("Failed to update user:", err);
      alert("Failed to update user");
    }
  };

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 bg-[#0C0E12] p-2 rounded-md">
        <h2 className="text-xl font-bold">Admin Users</h2>
        <div className="flex gap-2">
          <div className="flex items-center bg-[#18181b] border border-gray-800 px-3 py-2 rounded-lg">
            <Search className="w-4 h-4 text-gray-500 mr-2" />
            <input
              placeholder="Search users..."
              className="bg-transparent text-sm text-gray-200 outline-none placeholder-gray-600"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            onClick={() =>
              setSortOrder(sortOrder === "latest" ? "oldest" : "latest")
            }
            className="flex items-center bg-[#18181b] border border-gray-800 px-3 py-2 rounded-lg text-gray-300 text-sm"
          >
            <ArrowUpDown className="w-4 h-4 mr-2" />
            {sortOrder === "latest" ? "Latest First" : "Oldest First"}
          </button>
        </div>
      </div>

      <div className="bg-[#0C0E12] border border-gray-800 rounded-xl shadow-lg overflow-x-auto ">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#171b20] border-b border-[#ffffff54] text-left text-gray-300">
              <th className="p-3 font-semibold text-white">#</th>
              <th className="p-3 font-semibold text-white">Username</th>
              <th className="p-3 font-semibold text-white">Role</th>
              <th className="p-3 font-semibold text-white">Created At</th>
              <th className="p-3 font-semibold text-white text-center">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center p-4 text-gray-500">
                  No users to show!
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr
                  key={item.id || index}
                  className="border-b border-gray-800 hover:bg-gray-800/50 text-gray-300"
                >
                  <td className="p-3">{startRowIndex + index + 1}</td>
                  <td className="p-3">{item.username || "-"}</td>
                  <td className="p-3">{item.role || "-"}</td>
                  <td className="p-3">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => openEdit(item)}
                        title="Edit"
                        className="p-2 rounded hover:bg-gray-800/60"
                      >
                        <Edit className="w-4 h-4 text-gray-300" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        title="Delete"
                        className="p-2 rounded hover:bg-gray-800/60"
                      >
                        <Trash className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md bg-[#0C0E12] border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Edit User</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Username
                </label>
                <input
                  className="w-full bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
                  value={editingItem.username || ""}
                  onChange={(e) => handleEditChange("username", e.target.value)}
                  placeholder="Username"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">Role</label>
                <input
                  className="w-full bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
                  value={editingItem.role || ""}
                  onChange={(e) => handleEditChange("role", e.target.value)}
                  placeholder="Role"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Password (leave blank to keep current)
                </label>
                <input
                  type="text"
                  className="w-full bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
                  value={editingItem.password || ""}
                  onChange={(e) => handleEditChange("password", e.target.value)}
                  placeholder="Password"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeEdit}
                className="px-4 py-2 bg-[#18181b] border border-gray-800 rounded text-sm text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-blue-600 rounded text-sm text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 px-2">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-[#18181b] border border-gray-800 rounded-lg text-gray-300 disabled:opacity-40"
        >
          Previous
        </button>

        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              if (page === 1 || page === totalPages) return true;
              if (Math.abs(page - currentPage) <= 1) return true;
              return false;
            })
            .reduce((acc, page, idx, arr) => {
              if (idx > 0 && page - arr[idx - 1] > 1) acc.push("ellipsis");
              acc.push(page);
              return acc;
            }, [])
            .map((item, idx) =>
              item === "ellipsis" ? (
                <span key={idx} className="text-gray-500">
                  ...
                </span>
              ) : (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(item)}
                  className={`px-3 py-1 rounded-lg border ${
                    currentPage === item
                      ? "bg-blue-600 border-blue-700 text-white"
                      : "bg-[#18181b] border-gray-800 text-gray-300"
                  }`}
                >
                  {item}
                </button>
              )
            )}
        </div>

        <button
          onClick={handleNext}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-4 py-2 bg-[#18181b] border border-gray-800 rounded-lg text-gray-300 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
