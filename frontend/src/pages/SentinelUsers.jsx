import { useEffect, useState, useCallback } from "react";
import StatsCards from "../components/StatsCards";
import SentinelUsersTable from "../components/SentinelUsersTable";

export default function SentinelUsers() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecords = useCallback(() => {
    setLoading(true);
    const token = localStorage.getItem("token");

    fetch("http://localhost:5000/api/records", {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch records");
        return res.json();
      })
      .then((data) => {
        setRecords(data.records || data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch records:", err);
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

      <StatsCards />

      {loading ? (
        <p className="mt-6 text-gray-500">Loading...</p>
      ) : (
        <SentinelUsersTable data={records} refreshData={fetchRecords} />
      )}
    </div>
  );
}
