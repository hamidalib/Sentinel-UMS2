import React, { useEffect, useState } from "react";
import { Search, ArrowUpDown, Edit, Trash } from "lucide-react";

export default function SentinelUsersTable({ data, refreshData }) {
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("All");
  const [setupCodes, setSetupCodes] = useState([]);
  const [selectedSetupCode, setSelectedSetupCode] = useState("All");
  const [editingItem, setEditingItem] = useState(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Extract unique departments when data loads
  useEffect(() => {
    if (Array.isArray(data)) {
      setFiltered(data);
      const uniqueDepts = [...new Set(data.map((d) => d.dept))];
      const filteredDepts = uniqueDepts.filter(
        (d) => d !== null && d !== undefined && String(d).trim() !== ""
      );

      const uniqueSetups = [...new Set(data.map((d) => d.setupcode))];
      const filteredSetups = uniqueSetups.filter(
        (s) => s !== null && s !== undefined && String(s).trim() !== ""
      );

      // Numeric-aware sort: if both values are numeric, compare as numbers; otherwise localeCompare
      const numericAwareSort = (a, b) => {
        const na = Number(a);
        const nb = Number(b);
        const aIsNum = !Number.isNaN(na) && String(a).trim() !== "";
        const bIsNum = !Number.isNaN(nb) && String(b).trim() !== "";
        if (aIsNum && bIsNum) return na - nb;
        return String(a).localeCompare(String(b));
      };

      filteredDepts.sort(numericAwareSort);
      filteredSetups.sort(numericAwareSort);

      setDepartments(filteredDepts);
      setSetupCodes(filteredSetups);
    }
  }, [data]);

  // Filtering + searching + sorting
  useEffect(() => {
    if (!Array.isArray(data)) return;

    let updated = [...data];

    // Search
    if (search.trim() !== "") {
      updated = updated.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(search.toLowerCase())
        )
      );
    }

    // Department filter
    if (selectedDept !== "All") {
      updated = updated.filter((row) => row.dept === selectedDept);
    }

    // Setup Code filter
    if (selectedSetupCode !== "All") {
      updated = updated.filter((row) => row.setupcode === selectedSetupCode);
    }

    // Sorting behavior:
    // - When no specific filter is applied, sort by created_at (latest/oldest)
    // - When a filter is applied (department or setup code), sort by numeric suffix in username if present
    const extractTrailingNumber = (username) => {
      if (!username) return NaN;
      const s = String(username).trim();
      // match last sequence of digits
      const m = s.match(/(\d+)\s*$/);
      if (m && m[1]) return Number(m[1]);
      return NaN;
    };

    const isFilterActive =
      selectedDept !== "All" || selectedSetupCode !== "All";

    if (isFilterActive) {
      updated.sort((a, b) => {
        const an = extractTrailingNumber(a.username);
        const bn = extractTrailingNumber(b.username);
        const aName = String(a.username || "");
        const bName = String(b.username || "");

        if (!isNaN(an) && !isNaN(bn)) return an - bn; // numeric compare
        if (!isNaN(an)) return -1;
        if (!isNaN(bn)) return 1;
        return aName.localeCompare(bName); // fallback to string compare
      });
    } else {
      // Sort by created_at
      updated.sort((a, b) => {
        const da = new Date(a.created_at);
        const db = new Date(b.created_at);
        return sortOrder === "latest" ? db - da : da - db;
      });
    }

    setFiltered(updated);
    setCurrentPage(1); // RESET to page 1 on new filter/sort/search
  }, [search, selectedDept, selectedSetupCode, sortOrder, data]);

  if (!data || !Array.isArray(data)) {
    return (
      <div className="mt-6 bg-[#18181b] border border-gray-800 rounded-xl p-4 text-gray-400">
        No data available.
      </div>
    );
  }

  // ------------------ PAGINATION LOGIC ------------------
  const totalPages = Math.ceil(filtered.length / pageSize);

  const paginatedData = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePrev = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNext = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  // Global row index (continues with pages)
  const startRowIndex = (currentPage - 1) * pageSize;

  // ---------- Delete handler ----------
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/records/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error("Delete failed");
      if (typeof refreshData === "function") await refreshData();
    } catch (err) {
      console.error("Failed to delete record:", err);
      alert("Failed to delete record");
    }
  };

  // ---------- Edit handlers ----------
  const openEdit = (item) => {
    setEditingItem({ ...item });
  };

  const closeEdit = () => setEditingItem(null);

  const handleEditChange = (key, value) => {
    setEditingItem((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editingItem.id) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:5000/api/records/${editingItem.id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: editingItem.username,
            password: editingItem.password,
            dept: editingItem.dept,
            fullname: editingItem.fullname,
            setup: editingItem.setup,
            setupcode: editingItem.setupcode,
            apptcode: editingItem.apptcode,
            remarks: editingItem.remarks,
            ip_address: editingItem.ip_address,
          }),
        }
      );

      if (!res.ok) throw new Error("Update failed");
      closeEdit();
      if (typeof refreshData === "function") await refreshData();
    } catch (err) {
      console.error("Failed to update record:", err);
      alert("Failed to update record");
    }
  };

  return (
    <div className="mt-6">
      {/* ----------------------- TOP BAR ----------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 bg-[#0C0E12] p-2 rounded-md">
        <h2 className="text-xl font-bold">Sentinel Users</h2>
        <div className="flex gap-2">
          {/* SEARCH */}
          <div className="flex items-center bg-[#18181b] border border-gray-800 px-3 py-2 rounded-lg">
            <Search className="w-4 h-4 text-gray-500 mr-2" />
            <input
              placeholder="Search..."
              className="bg-transparent text-sm text-gray-200 outline-none placeholder-gray-600"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* DEPARTMENT FILTER */}
          <select
            className="bg-[#18181b] border border-gray-800 px-3 py-2 rounded-lg text-gray-300 text-sm"
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="All">All Departments</option>
            {departments.map((dept, idx) => (
              <option key={idx} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          {/* SETUP CODE FILTER */}
          <select
            className="bg-[#18181b] border border-gray-800 px-3 py-2 rounded-lg text-gray-300 text-sm"
            value={selectedSetupCode}
            onChange={(e) => setSelectedSetupCode(e.target.value)}
          >
            <option value="All">All Setup Codes</option>
            {setupCodes.map((code, idx) => (
              <option key={idx} value={code}>
                {code}
              </option>
            ))}
          </select>

          {/* SORT BUTTON */}
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

      {/* ----------------------- TABLE ----------------------- */}
      <div className="bg-[#0C0E12] border border-gray-800 rounded-xl shadow-lg overflow-x-auto ">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#171b20] border-b border-[#ffffff54] text-left text-gray-300">
              <th className="p-3 font-semibold text-white">#</th>
              <th className="p-3 font-semibold text-white">Username</th>
              <th className="p-3 font-semibold text-white">Password</th>
              <th className="p-3 font-semibold text-white">Department</th>
              <th className="p-3 font-semibold text-white">Full Name</th>
              <th className="p-3 font-semibold text-white">Setup</th>
              <th className="font-semibold text-center w-fit text-white">
                Setup Code
              </th>
              <th className="p-3 font-semibold text-center text-white">
                Appt Code
              </th>
              <th className="p-3 font-semibold text-center text-white">
                Remarks
              </th>
              <th className="p-3 font-semibold text-center text-white">
                IP Address
              </th>
              <th className="p-3 font-semibold text-center text-white">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center p-4 text-gray-500">
                  No accounts to show!
                </td>
              </tr>
            ) : (
              paginatedData.map((item, index) => (
                <tr
                  key={item.id || index}
                  className="border-b border-gray-800 hover:bg-gray-800/50 text-gray-300"
                >
                  <td className="p-2">{startRowIndex + index + 1}</td>
                  <td className="p-2">{item.username || "-"}</td>
                  <td className="p-2">{item.password || "-"}</td>
                  <td className="p-2">{item.dept || "-"}</td>
                  <td className="p-2">{item.fullname || "-"}</td>
                  <td className="p-2">{item.setup || "-"}</td>
                  <td className="p-2 text-center">{item.setupcode || "-"}</td>
                  <td className="p-2 text-center">{item.apptcode || "-"}</td>
                  <td className="p-2 text-center">{item.remarks || "-"}</td>
                  <td className="p-2 text-center">{item.ip_address || "-"}</td>
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

      {/* ---------- Edit Modal ---------- */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-2xl bg-[#0C0E12] border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Record</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                <label className="text-sm text-gray-400 mb-1 block">
                  Password (Don't edit blank to keep current)
                </label>
                <input
                  type="text"
                  className="w-full bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
                  value={editingItem.password || ""}
                  onChange={(e) => handleEditChange("password", e.target.value)}
                  placeholder="Password"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Department
                </label>
                <input
                  className="w-full bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
                  value={editingItem.dept || ""}
                  onChange={(e) => handleEditChange("dept", e.target.value)}
                  placeholder="Department"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Full Name
                </label>
                <input
                  className="w-full bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
                  value={editingItem.fullname || ""}
                  onChange={(e) => handleEditChange("fullname", e.target.value)}
                  placeholder="Full Name"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Setup
                </label>
                <input
                  className="w-full bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
                  value={editingItem.setup || ""}
                  onChange={(e) => handleEditChange("setup", e.target.value)}
                  placeholder="Setup"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Setup Code
                </label>
                <input
                  className="w-full bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
                  value={editingItem.setupcode || ""}
                  onChange={(e) =>
                    handleEditChange("setupcode", e.target.value)
                  }
                  placeholder="Setup Code"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  Appt Code
                </label>
                <input
                  className="w-full bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
                  value={editingItem.apptcode || ""}
                  onChange={(e) => handleEditChange("apptcode", e.target.value)}
                  placeholder="Appt Code"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">
                  IP Address
                </label>
                <input
                  className="w-full bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
                  value={editingItem.ip_address || ""}
                  onChange={(e) =>
                    handleEditChange("ip_address", e.target.value)
                  }
                  placeholder="IP Address"
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="text-sm text-gray-400 mb-1 block">
                  Remarks
                </label>
                <textarea
                  rows={3}
                  className="w-full bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
                  value={editingItem.remarks || ""}
                  onChange={(e) => handleEditChange("remarks", e.target.value)}
                  placeholder="Remarks"
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

      {/* ----------------------- PAGINATION ----------------------- */}
      <div className="flex justify-between items-center mt-4 px-2">
        {/* PREVIOUS BUTTON */}
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-[#18181b] border border-gray-800 rounded-lg text-gray-300 disabled:opacity-40"
        >
          Previous
        </button>

        {/* PAGE NUMBERS */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((page) => {
              // Always show first, last, current, and neighbors
              if (page === 1 || page === totalPages) return true;
              if (Math.abs(page - currentPage) <= 1) return true;
              return false;
            })
            .reduce((acc, page, idx, arr) => {
              // Add ellipsis where pages are skipped
              if (idx > 0 && page - arr[idx - 1] > 1) {
                acc.push("ellipsis");
              }
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

        {/* NEXT BUTTON */}
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
