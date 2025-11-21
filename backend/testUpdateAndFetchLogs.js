// Create a record, update it, then fetch logs to verify audit entry
(async function () {
  try {
    await (await import("dotenv")).config();
    const { default: jwt } = await import("jsonwebtoken");
    const token = jwt.sign(
      { id: 1, username: "dev", role: "admin" },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "1h" }
    );

    // 1) Create a new record
    let res = await fetch("http://localhost:5000/api/records/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        username: "test_user_123",
        password: "secret",
        dept: "IT",
        fullname: "Test User",
      }),
    });
    const created = await res.json();
    console.log("create status", res.status, created);
    const id = created.id || (created && created.id) || null;

    if (!id) {
      console.log("No id returned, aborting update test");
      return;
    }

    // 2) Update the username
    res = await fetch(`http://localhost:5000/api/records/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username: "test_user_123_edited" }),
    });
    const upd = await res.json();
    console.log("update status", res.status, upd);

    // 3) Fetch logs
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
