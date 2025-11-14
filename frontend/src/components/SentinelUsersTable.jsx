import React, { useEffect, useState } from "react";
import { Search, ArrowUpDown } from "lucide-react";

export default function SentinelUsersTable({ data }) {
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState("latest");
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("All");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Extract unique departments when data loads
  useEffect(() => {
    if (Array.isArray(data)) {
      setFiltered(data);

      const uniqueDepts = [...new Set(data.map((d) => d.dept))];
      setDepartments(uniqueDepts);
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

    // Sort by created_at
    updated.sort((a, b) => {
      const da = new Date(a.created_at);
      const db = new Date(b.created_at);
      return sortOrder === "latest" ? db - da : da - db;
    });

    setFiltered(updated);
    setCurrentPage(1); // RESET to page 1 on new filter/sort/search
  }, [search, selectedDept, sortOrder, data]);

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
              <th className="p-3 font-semibold">#</th>
              <th className="p-3 font-semibold">Username</th>
              <th className="p-3 font-semibold">Password</th>
              <th className="p-3 font-semibold">Department</th>
              <th className="p-3 font-semibold">Full Name</th>
              <th className="p-3 font-semibold">Setup</th>
              <th className="p-3 font-semibold">Setup Code</th>
              <th className="p-3 font-semibold">Appt Code</th>
              <th className="p-3 font-semibold">Remarks</th>
              <th className="p-3 font-semibold">IP Address</th>
            </tr>
          </thead>

          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center p-4 text-gray-500">
                  No matching records.
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
                  <td className="p-2">{item.setupcode || "-"}</td>
                  <td className="p-2">{item.apptcode || "-"}</td>
                  <td className="p-2">{item.remarks || "-"}</td>
                  <td className="p-2">{item.ip_address || "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ----------------------- PAGINATION ----------------------- */}
      <div className="flex justify-between items-center mt-4 px-2">
        <button
          onClick={handlePrev}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-[#18181b] border border-gray-800 rounded-lg text-gray-300 disabled:opacity-40"
        >
          Previous
        </button>

        <span className="text-gray-400 text-sm">
          Page {currentPage} of {totalPages || 1}
        </span>

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
