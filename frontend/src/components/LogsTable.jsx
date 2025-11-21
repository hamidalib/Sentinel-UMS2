import React, { useEffect, useState } from "react";
import { fetchLogs } from "../lib/api/logs";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Calendar } from "./ui/calendar";

export default function LogsTable() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // filters
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

  const formatISODate = (d) => {
    if (!d) return "";
    try {
      const dt = d instanceof Date ? d : new Date(d);
      if (isNaN(dt.getTime())) return "";
      return dt.toISOString().slice(0, 10);
    } catch (e) {
      return "";
    }
  };

  const load = async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetchLogs({
        page: opts.page || page,
        pageSize,
        action: opts.action ?? actionFilter,
        actor: opts.actor ?? actorFilter,
        from: opts.from ?? fromDate,
        to: opts.to ?? toDate,
        search: opts.search ?? search,
      });

      // backend returns { total, page, pageSize, logs }
      setLogs(resp.logs || resp.items || []);
      setTotal(resp.total || 0);
      setPage(resp.page || page);
    } catch (err) {
      console.error("Failed to load logs", err);
      // normalize error shape from fetch/our client
      const msg =
        err && (err.message || (err.body && String(err.body)))
          ? err.message || String(err.body)
          : "Failed to fetch logs";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => load({ page: 1 });

  const pageCount = Math.ceil(total / pageSize) || 1;

  return (
    <div>
      <div className="bg-[#0C0E12] border border-gray-800 rounded-xl overflow-x-auto">
        {loading ? (
          <div className="p-6 text-gray-400">Loading logs...</div>
        ) : error ? (
          <div className="p-6 text-red-400">Error: {error}</div>
        ) : logs.length === 0 ? (
          <div className="p-6 text-gray-400">No logs found.</div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#171b20] text-left text-gray-300">
                <th className="p-3">SN</th>
                <th className="p-3">Time</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target</th>
                <th className="p-3">Summary</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, idx) => {
                const serial = (page - 1) * pageSize + idx + 1;
                return (
                  <tr
                    key={l.id || idx}
                    className="border-b border-gray-800 hover:bg-gray-800/30 text-gray-300"
                  >
                    <td className="p-2 text-sm">{serial}</td>
                    <td className="p-2 text-sm">
                      {(() => {
                        try {
                          if (!l || !l.created_at) return "-";
                          const d = new Date(l.created_at);
                          if (isNaN(d.getTime()))
                            return String(l.created_at || "-");

                          return d.toLocaleString(undefined, {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          });
                        } catch (e) {
                          return "-";
                        }
                      })()}
                    </td>
                    <td className="p-2 text-sm">
                      {l.actor_username || l.actor || l.actor_id || "-"}
                    </td>
                    <td className="p-2 text-sm text-[#FFD60A]">
                      {l.action_type}
                    </td>
                    <td className="p-2 text-sm ">
                      {l.target_type
                        ? `${l.target_type}${
                            l.target_id ? ` (${l.target_id})` : ""
                          }`
                        : "-"}
                    </td>
                    <td className="p-2 text-sm">{l.summary || "-"}</td>
                    <td className="p-2 text-sm">
                      <details className="text-xs text-gray-400">
                        <summary className="cursor-pointer">View</summary>
                        <pre className="whitespace-pre-wrap p-2 text-xs">
                          {(() => {
                            try {
                              if (typeof l.details === "string") {
                                // try to pretty-print JSON stored as string
                                try {
                                  const parsed = JSON.parse(l.details);
                                  return JSON.stringify(parsed, null, 2);
                                } catch (e) {
                                  return l.details;
                                }
                              }
                              if (!l.details) return "-";
                              return JSON.stringify(l.details, null, 2);
                            } catch (e) {
                              return String(l.details || "-");
                            }
                          })()}
                        </pre>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-between items-center mt-3">
        <div className="text-sm text-gray-400">Total: {total}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const np = Math.max(1, page - 1);
              setPage(np);
              load({ page: np });
            }}
            disabled={page === 1}
            className="px-3 py-1 rounded bg-[#18181b] border border-gray-800 text-gray-300 disabled:opacity-40"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: pageCount }, (_, i) => i + 1)
              .filter((p) => {
                if (p === 1 || p === pageCount) return true;
                if (Math.abs(p - page) <= 1) return true;
                return false;
              })
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push("ellipsis");
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) =>
                item === "ellipsis" ? (
                  <span key={"e-" + idx} className="text-gray-500">
                    ...
                  </span>
                ) : (
                  <button
                    key={"p-" + item}
                    onClick={() => {
                      setPage(item);
                      load({ page: item });
                    }}
                    className={`px-3 py-1 rounded-lg border ${
                      page === item
                        ? "bg-blue-600 border-blue-700 text-white"
                        : "bg-[#18181b] border-gray-800 text-gray-300"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
          </div>

          <button
            onClick={() => {
              const np = Math.min(pageCount, page + 1);
              setPage(np);
              load({ page: np });
            }}
            disabled={page === pageCount || pageCount === 0}
            className="px-3 py-1 rounded bg-[#18181b] border border-gray-800 text-gray-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
