// Create a record, delete it, then fetch logs to verify delete audit entry
(async function () {
  try {
    const token =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJkZXYiLCJyb2xlIjoiYWRtaW4iLCJpYXQiOjE3NjM1NTQ2NDcsImV4cCI6MTc2MzU1ODI0N30.PnNF2zJLhB1UL6H4vJ7irJcCOJ2Fvs-k0OMLmjz8eBc";

    // Create a new record
    let res = await fetch("http://localhost:5000/api/records/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: "delete_test_user",
        password: "secret",
        dept: "Ops",
        fullname: "Delete Test",
      }),
    });
    const created = await res.json();
    console.log("create status", res.status, created);
    const id = created.id || (created && created.id) || null;

    if (!id) {
      console.log("No id returned, aborting delete test");
      return;
    }

    // Delete the record
    res = await fetch(`http://localhost:5000/api/records/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("delete status", res.status, await res.json());

    // Fetch logs
    res = await fetch("http://localhost:5000/api/logs?page=1&pageSize=20", {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("logs status", res.status);
    const logs = await res.json();
    console.log("logs:", JSON.stringify(logs, null, 2));
  } catch (e) {
    console.error("TEST ERROR", e);
  }
})();
