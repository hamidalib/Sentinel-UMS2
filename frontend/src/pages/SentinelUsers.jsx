import { useEffect, useState, useCallback } from "react";
import StatsCards from "../components/StatsCards";
import SentinelUsersTable from "../components/SentinelUsersTable";

export default function SentinelUsers() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalSentinelUsers, setTotalSentinelUsers] = useState(0);
  const [totalAdminUsers, setTotalAdminUsers] = useState(0);
  const [newUsersLast7Days, setNewUsersLast7Days] = useState(0);

  const fetchRecords = useCallback(() => {
    setLoading(true);
    const token = localStorage.getItem("token");
    // Fetch records and counts in parallel
    const recordsReq = fetch("http://localhost:5000/api/records", {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        "Content-Type": "application/json",
      },
    }).then((res) => {
      if (!res.ok) throw new Error("Failed to fetch records");
      return res.json();
    });

    const adminsReq = fetch("http://localhost:5000/api/users/count", {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        "Content-Type": "application/json",
      },
    }).then((res) => {
      if (!res.ok) throw new Error("Failed to fetch admin count");
      return res.json();
    });

    Promise.all([recordsReq, adminsReq])
      .then(([recordsData, adminsData]) => {
        // records endpoint returns { records, totalRecords, newUsersLast7Days }
        setRecords(recordsData.records || recordsData || []);
        setTotalSentinelUsers(recordsData.totalRecords || 0);
        setNewUsersLast7Days(recordsData.newUsersLast7Days || 0);

        // admins endpoint returns { totalAdmins }
        setTotalAdminUsers(adminsData.totalAdmins || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch records/counts:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchRecords();

    const handler = () => fetchRecords();
    window.addEventListener("recordsImported", handler);

    return () => {
      window.removeEventListener("recordsImported", handler);
    };
  }, [fetchRecords]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Sentinel Users</h1>
      <p className="mt-1 text-gray-400">Manage and view all sentinel users.</p>

      <StatsCards
        totalSentinelUsers={totalSentinelUsers}
        totalAdminUsers={totalAdminUsers}
        newUsersLast7Days={newUsersLast7Days}
      />

      {loading ? (
        <p className="mt-6 text-gray-500">Loading...</p>
      ) : (
        <SentinelUsersTable data={records} refreshData={fetchRecords} />
      )}
    </div>
  );
}
