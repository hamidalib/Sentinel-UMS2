// Simple logs API client
export async function fetchLogs({
  page = 1,
  pageSize = 20,
  action,
  actor,
  from,
  to,
  search,
} = {}) {
  const params = new URLSearchParams();
  if (page) params.set("page", page);
  if (pageSize) params.set("pageSize", pageSize);
  if (action) params.set("action", action);
  if (actor) params.set("actor", actor);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (search) params.set("search", search);

  const token = localStorage.getItem("token");
  const res = await fetch(
    `http://localhost:5000/api/logs?${params.toString()}`,
    {
      headers: {
        Authorization: token ? `Bearer ${token}` : undefined,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`Logs fetch failed: ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  return res.json();
}

export default { fetchLogs };
