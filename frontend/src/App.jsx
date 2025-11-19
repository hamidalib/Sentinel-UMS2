import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login.jsx";
import DashboardLayout from "./pages/DashboardLayout.jsx";
import SentinelUsers from "./pages/SentinelUsers.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import Logs from "./pages/Logs.jsx";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const refreshTimeoutRef = useRef(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = null;
    }
  }, []);

  const logout = useCallback(() => {
    clearRefreshTimer();
    localStorage.removeItem("token");
    setToken(null);
  }, [clearRefreshTimer]);

  const scheduleTokenRefresh = useCallback(
    (jwtToken) => {
      clearRefreshTimer();
      if (!jwtToken) return;

      try {
        const [, payloadBase64] = jwtToken.split(".");
        const payload = JSON.parse(atob(payloadBase64));
        if (!payload?.exp) return;

        const expiresAtMs = payload.exp * 1000;
        const refreshAtMs = expiresAtMs - 5 * 60 * 1000; // 5 minutes before expiry
        const delay = Math.max(refreshAtMs - Date.now(), 10 * 1000); // at least 10s

        refreshTimeoutRef.current = setTimeout(async () => {
          const currentToken = localStorage.getItem("token");
          if (!currentToken) {
            logout();
            return;
          }

          try {
            const res = await fetch("http://localhost:5000/api/auth/refresh", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${currentToken}`,
                "Content-Type": "application/json",
              },
            });

            if (!res.ok) {
              throw new Error("Failed to refresh token");
            }

            const data = await res.json();
            if (!data?.token) {
              throw new Error("No token in refresh response");
            }

            localStorage.setItem("token", data.token);
            setToken(data.token);
          } catch (err) {
            console.error("Token refresh failed:", err);
            logout();
          }
        }, delay);
      } catch (err) {
        console.error("Failed to schedule token refresh:", err);
        logout();
      }
    },
    [clearRefreshTimer, logout]
  );

  const handleLoginSuccess = useCallback(
    (newToken) => {
      setToken(newToken);
      scheduleTokenRefresh(newToken);
    },
    [scheduleTokenRefresh]
  );

  useEffect(() => {
    if (token) {
      scheduleTokenRefresh(token);
    }

    return () => {
      clearRefreshTimer();
    };
  }, [token, scheduleTokenRefresh, clearRefreshTimer]);

  if (!token) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <Routes>
        {/* Default route = Sentinel Users */}
        <Route
          path="/"
          element={<Navigate to="/dashboard/sentinel-users" replace />}
        />

        <Route path="/dashboard" element={<DashboardLayout />} >
          <Route path="sentinel-users" element={<SentinelUsers />} />
          <Route path="admin-users" element={<AdminUsers />} />
          <Route path="logs" element={<Logs />} />
        </Route>

        {/* Redirect unknown */}
        <Route
          path="*"
          element={<Navigate to="/dashboard/sentinel-users" replace />}
        />
      </Routes>
    </Router>
  );
}

export default App;
