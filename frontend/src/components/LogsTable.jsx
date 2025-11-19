import React, { useEffect, useState } from "react";
import { fetchLogs } from "../lib/api/logs";

export default function LogsTable() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // filters
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");

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
      setError(err.message || "Failed to fetch logs");
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
      <div className="flex flex-col md:flex-row md:items-end md:gap-3 mb-4">
        <div className="flex gap-2 items-center">
          <input
            placeholder="Action (e.g. sentinel.create)"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
          />
          <input
            placeholder="Actor username or id"
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
          />
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200"
          />
        </div>

        <div className="flex gap-2 mt-2 md:mt-0 ml-auto">
          <input
            placeholder="Search summary or details"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#18181b] border border-gray-800 p-2 rounded text-sm text-gray-200 w-56"
          />
          <button
            onClick={() => handleSearch()}
            className="px-3 py-2 bg-blue-600 rounded text-white text-sm"
          >
            Search
          </button>
          <button
            onClick={() =>
              load({
                page: 1,
                action: "",
                actor: "",
                from: "",
                to: "",
                search: "",
              })
            }
            className="px-3 py-2 bg-gray-700 rounded text-gray-200 text-sm"
          >
            Clear
          </button>
          <button
            onClick={() => load({ page })}
            className="px-3 py-2 bg-[#0b5345] rounded text-white text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

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
                <th className="p-3">Time</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Target</th>
                <th className="p-3">Summary</th>
                <th className="p-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l, idx) => (
                <tr
                  key={l.id || idx}
                  className="border-b border-gray-800 hover:bg-gray-800/30 text-gray-300"
                >
                  <td className="p-2 text-sm">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                  <td className="p-2 text-sm">
                    {l.actor_username || l.actor || l.actor_id || "-"}
                  </td>
                  <td className="p-2 text-sm">{l.action_type}</td>
                  <td className="p-2 text-sm">
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
                        {typeof l.details === "string"
                          ? l.details
                          : JSON.stringify(l.details, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex justify-between items-center mt-3">
        <div className="text-sm text-gray-400">Total: {total}</div>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => {
              const np = Math.max(1, page - 1);
              setPage(np);
              load({ page: np });
            }}
            className="px-3 py-1 rounded bg-[#18181b] text-gray-300 disabled:opacity-40"
          >
            Prev
          </button>
          <div className="px-3 py-1 rounded bg-[#18181b] text-gray-300">
            {page} / {pageCount}
          </div>
          <button
            disabled={page >= pageCount}
            onClick={() => {
              const np = Math.min(pageCount, page + 1);
              setPage(np);
              load({ page: np });
            }}
            className="px-3 py-1 rounded bg-[#18181b] text-gray-300 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
