// Simple script to call /api/logs using a JWT and print status + body
(async function () {
  try {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJkZXYiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjM1NTQ2NDcsImV4cCI6MTc2MzU1ODI0N30.PnNF2zJLhB1UL6H4vJ7irJcCOJ2Fvs-k0OMLmjz8eBc";
    const res = await fetch(
      "http://localhost:5000/api/logs?page=1&pageSize=20",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("STATUS", res.status);
    const txt = await res.text();
    console.log(txt);
  } catch (e) {
    console.error("REQUEST ERROR", e);
  }
})();
