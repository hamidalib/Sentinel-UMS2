import React, { useState } from "react";
import { X } from "lucide-react";

export default function AddAdminUserModal({ open, onClose }) {
  if (!open) return null;

  const [form, setForm] = useState({
    username: "",
    password: "",
    role: "admin",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setMessage("No authentication token found. Please login again.");
        setTimeout(() => {
          localStorage.removeItem("token");
          window.location.href = "/";
        }, 1500);
        setLoading(false);
        return;
      }

      const res = await fetch("http://localhost:5000/api/users/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("Admin user created successfully!");
        // notify other parts of the app
        window.dispatchEvent(new Event("usersUpdated"));
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        if (res.status === 409) {
          setMessage(data.error || "User already exists.");
        } else if (res.status === 403 || res.status === 401) {
          setMessage(data.error || "Authentication error. Logging out.");
          setTimeout(() => {
            localStorage.removeItem("token");
            window.location.href = "/";
          }, 1500);
        } else {
          setMessage(data.error || "Failed to create user.");
        }
      }
    } catch (err) {
      console.error("Create admin user error:", err);
      setMessage("Server error. Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl w-[480px] p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Create Admin User</h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400 hover:text-gray-200" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            className="w-full bg-[#18181b] border border-gray-800 p-2 rounded-md text-gray-200"
            required
          />

          <input
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            className="w-full bg-[#18181b] border border-gray-800 p-2 rounded-md text-gray-200"
            required
          />

          <input
            name="role"
            placeholder="Role (e.g. admin)"
            value={form.role}
            onChange={handleChange}
            className="w-full bg-[#18181b] border border-gray-800 p-2 rounded-md text-gray-200"
          />

          {message && (
            <p
              className={`text-sm ${
                message.includes("success") ? "text-green-400" : "text-red-400"
              }`}
            >
              {message}
            </p>
          )}

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-40"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
