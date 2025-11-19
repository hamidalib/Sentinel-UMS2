import { useEffect, useState, useCallback } from "react";
import StatsCards from "../components/StatsCards";
import SentinelUsersTable from "../components/SentinelUsersTable";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/lightswind/avatar";

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

  // derive avatar text from logged-in user (tries localStorage 'user'/'username', then token payload)
  const getUsernameFromStorage = () => {
    try {
      const rawUser =
        localStorage.getItem("user") || localStorage.getItem("username");
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser);
          return (
            parsed.username ||
            parsed.name ||
            parsed.email ||
            ""
          ).toString();
        } catch {
          return rawUser.toString();
        }
      }

      const token = localStorage.getItem("token");
      if (token) {
        const parts = token.split(".");
        if (parts.length > 1) {
          try {
            const payload = JSON.parse(atob(parts[1]));
            return (
              payload.username ||
              payload.name ||
              payload.email ||
              ""
            ).toString();
          } catch {}
        }
      }
    } catch {}
    return "";
  };

  const avatarText = (() => {
    const u = getUsernameFromStorage().trim();
    return u ? u.slice(0, 2).toUpperCase() : "CN";
  })();

  return (
    <div>
      <div className="flex justify-between items-center bg-[#0f0f0f] p-2 rounded-xl border border-[#2f2f2f]">
        <div>
          <h1 className="text-2xl font-semibold">Sentinel Users</h1>
          <p className="mt-1 text-gray-400">
            Manage and view all sentinel users.
          </p>
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
