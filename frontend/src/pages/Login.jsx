import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Prefer configured Vite env var `VITE_API_URL`, otherwise fall back
      // to the office server IP used during development. Ensure protocol exists.
      let API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
      if (!API_BASE.startsWith("http://") && !API_BASE.startsWith("https://")) {
        API_BASE = `http://${API_BASE}`;
      }

      const url = `${API_BASE.replace(/\/$/, "")}/api/auth/login`;

      let res;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
      } catch (networkErr) {
        console.error("Network error when calling login:", networkErr, url);
        setError(
          `Network error: failed to reach ${url}. Check server and CORS.`
        );
        setLoading(false);
        return;
      }

      // Read response safely: some errors may return plain text or empty body
      const contentType = res.headers.get("content-type") || "";
      let bodyText = null;
      try {
        if (contentType.includes("application/json")) {
          bodyText = await res.json();
        } else {
          bodyText = await res.text();
        }
      } catch (e) {
        bodyText = null;
      }

      if (!res.ok) {
        const message =
          (bodyText && bodyText.error) ||
          (typeof bodyText === "string" && bodyText) ||
          `Login failed (${res.status})`;
        setError(message);
        setLoading(false);
        return;
      }

      const data = typeof bodyText === "object" ? bodyText : null;
      if (!data || !data.token) {
        setError("Login succeeded but server returned no token");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      onLoginSuccess(data.token);
    } catch (err) {
      console.error("Login error:", err);
      setError(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-[#0f0f0f]">
      <Card className="w-[380px] bg-[#18181b] text-white border-[#27272a]">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold">
            Admin Panel Login
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input
                type="text"
                placeholder="Enter your username"
                className="bg-[#27272a] border-[#3f3f46] text-white"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                placeholder="Enter your password"
                className="bg-[#27272a] border-[#3f3f46] text-white"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-md"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="text-center text-gray-400 text-sm">
          © {new Date().getFullYear()} Admin Panel
        </CardFooter>
      </Card>
    </div>
  );
}

export default Login;
