import React, { useCallback, useEffect, useState } from "react";
import AdminUsersTable from "../components/AdminUsersTable";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAdmins, setTotalAdmins] = useState(0);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    const token = localStorage.getItem("token");

    const usersReq = fetch("http://localhost:5000/api/users", {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        "Content-Type": "application/json",
      },
    }).then((res) => {
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    });

    const countReq = fetch("http://localhost:5000/api/users/count", {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        "Content-Type": "application/json",
      },
    }).then((res) => {
      if (!res.ok) throw new Error("Failed to fetch admin count");
      return res.json();
    });

    Promise.all([usersReq, countReq])
      .then(([usersData, countData]) => {
        setUsers(usersData || []);
        setTotalAdmins(countData.totalAdmins || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch users/count:", err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchUsers();
    const handler = () => fetchUsers();
    window.addEventListener("usersUpdated", handler);
    return () => window.removeEventListener("usersUpdated", handler);
  }, [fetchUsers]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Admin Users</h1>
      <p className="mt-1 text-gray-400">
        Manage admin accounts ({totalAdmins})
      </p>

      {loading ? (
        <p className="mt-6 text-gray-500">Loading...</p>
      ) : (
        <AdminUsersTable data={users} refreshData={fetchUsers} />
      )}
    </div>
  );
}
