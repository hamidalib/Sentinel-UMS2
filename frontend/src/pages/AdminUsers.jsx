import React, { useCallback, useEffect, useState } from "react";
import AdminUsersTable from "../components/AdminUsersTable";
import { Avatar, AvatarFallback } from "@/components/lightswind/avatar";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalAdmins, setTotalAdmins] = useState(0);

  // helper to read a username from localStorage or JWT token
  const getUsernameFromStorage = () => {
    const stored = localStorage.getItem("username");
    if (stored) return stored;
    const userObj = localStorage.getItem("user");
    if (userObj) {
      try {
        const parsed = JSON.parse(userObj);
        if (parsed && parsed.username) return parsed.username;
      } catch (e) {
        // ignore
      }
    }
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          if (payload && payload.username) return payload.username;
        }
      } catch (e) {
        // ignore
      }
    }
    return null;
  };

  const usernameForHeader = getUsernameFromStorage() || "Unknown User";
  const avatarText = (() => {
    const u = getUsernameFromStorage().trim();
    return u ? u.slice(0, 2).toUpperCase() : "CN";
  })();

  // small clock component used in the header
  const Clock = () => {
    const [now, setNow] = useState(new Date());
    useEffect(() => {
      const id = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(id);
    }, []);
    return (
      <div className="flex gap-2 justify-center items-center mt-1 text-right text-white">
        <div className="font-medium text-sm text-white ">
          {now.toLocaleDateString()}
        </div>
        <div className="font-medium text-sm text-white">
          {now.toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>
    );
  };

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
      <div className="flex justify-between items-center bg-[#0f0f0f] p-2 rounded-xl border border-[#2f2f2f]">
        <div>
          <h1 className="text-2xl font-semibold">Admin Users</h1>
          <p className="mt-1 text-gray-400">Manage and view all Admin Users.</p>
        </div>
        <div className=" flex gap-2 items-center">
          <div className=" bg-gray-800/40 border border-white/10 flex w-fit rounded-md p-2">
            {(() => {
              const username = getUsernameFromStorage() || "Unknown User";

              const Clock = () => {
                const [now, setNow] = useState(new Date());

                useEffect(() => {
                  const id = setInterval(() => setNow(new Date()), 1000);
                  return () => clearInterval(id);
                }, []);

                return (
                  <div className="flex gap-2 justify-center items-center mt-1  text-right text-white">
                    <div className="font-medium text-sm text-white ">
                      {now.toLocaleDateString()}
                    </div>
                    <div className="font-medium text-sm text-white">
                      {now.toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                );
              };

              return (
                <div className="text-right ml-4">
                  <div
                    className="font-semibold text-sm text-white truncate"
                    title={username}
                  >
                    {username}
                  </div>
                  <Clock />
                </div>
              );
            })()}
          </div>
          <Avatar>
            <AvatarFallback className="bg-gray-700 text-sm text-white cursor-pointer ">
              {avatarText}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-gray-500">Loading...</p>
      ) : (
        <AdminUsersTable data={users} refreshData={fetchUsers} />
      )}
    </div>
  );
}
