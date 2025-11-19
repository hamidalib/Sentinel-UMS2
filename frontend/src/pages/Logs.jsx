import React from "react";
import LogsTable from "../components/LogsTable";

export default function Logs() {
  return (
    <div className="text-white">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Actions Logs</h1>
          <p className="text-gray-400 mt-2">
            See all the actions and activities performed.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <LogsTable />
      </div>
    </div>
  );
}
