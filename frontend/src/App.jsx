import React, { useCallback, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import DashboardLayout from "./pages/DashboardLayout.jsx";
import SentinelUsers from "./pages/SentinelUsers.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import Settings from "./pages/Settings.jsx";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  const handleLoginSuccess = useCallback((newToken) => {
    setToken(newToken);
  }, []);

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <Routes>
        {/* Default route = Sentinel Users */}
        <Route path="/" element={<Navigate to="/dashboard/sentinel-users" replace />} />

        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route path="sentinel-users" element={<SentinelUsers />} />
          <Route path="admin-users" element={<AdminUsers />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* Redirect unknown */}
        <Route path="*" element={<Navigate to="/dashboard/sentinel-users" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
