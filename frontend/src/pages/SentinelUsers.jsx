import { useEffect, useState } from "react";
import StatsCards from "../components/StatsCards";
import SentinelUsersTable from "../components/SentinelUsersTable";

export default function SentinelUsers() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    
    fetch("http://localhost:5000/api/records", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch records");
        }
        return res.json();
      })
      .then((data) => {
        // API returns { records: [...], totalRecords: ... }
        setRecords(data.records || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch records:", err);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Sentinel Users</h1>
      <p className="mt-1 text-gray-400">Manage and view all sentinel users.</p>

      <StatsCards />

      {loading ? (
        <p className="mt-6 text-gray-500">Loading...</p>
      ) : (
        <SentinelUsersTable data={records} />
      )}
    </div>
  );
}
