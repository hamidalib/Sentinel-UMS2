import React, { useEffect, useState } from "react";
import LogsTable from "../components/LogsTable";
import { Avatar, AvatarFallback } from "@/components/lightswind/avatar";

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

export default function Logs() {
  return (
    <div className="text-white">
      <div className="flex justify-between items-center bg-[#0f0f0f] p-2 rounded-xl border border-[#2f2f2f]">
        <div>
          <h1 className="text-2xl font-semibold">Actions Logs</h1>
          <p className="mt-1 text-gray-400">
            See all the actions and activities performed.
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
              {(() => {
                const u = (getUsernameFromStorage() || "").trim();
                return u ? u.slice(0, 2).toUpperCase() : "CN";
              })()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="mt-4">
        <LogsTable />
      </div>
    </div>
  );
}
