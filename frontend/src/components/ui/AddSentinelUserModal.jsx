import React, { useState } from "react";
import { X } from "lucide-react";

export default function AddSentinelUserModal({ open, onClose }) {
  if (!open) return null;

  const [form, setForm] = useState({
    username: "",
    password: "",
    dept: "",
    fullname: "",
    setup: "",
    setupcode: "",
    apptcode: "",
    remarks: "",
    ip_address: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Handle input change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const token = localStorage.getItem("token");

      // Check if token exists
      if (!token) {
        setMessage("No authentication token found. Please login again.");
        setTimeout(() => {
          localStorage.removeItem("token");
          window.location.href = "/";
        }, 2000);
        setLoading(false);
        return;
      }

      const res = await fetch("http://localhost:5000/api/records/create", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("User added successfully!");
        setForm({
          username: "",
          password: "",
          dept: "",
          fullname: "",
          setup: "",
          setupcode: "",
          apptcode: "",
          remarks: "",
          ip_address: "",
        });

        // Close modal after 1 sec and refresh the page to show new data
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1000);
      } else {
        // Handle 403 Forbidden (token expired/invalid)
        if (res.status === 403) {
          const errorMsg =
            data.error || "Your session has expired. Please login again.";
          setMessage(errorMsg);
          setTimeout(() => {
            localStorage.removeItem("token");
            window.location.href = "/";
          }, 2000);
        } else if (res.status === 401) {
          setMessage(
            data.error || "Authentication failed. Please login again."
          );
          setTimeout(() => {
            localStorage.removeItem("token");
            window.location.href = "/";
          }, 2000);
        } else {
          setMessage(data.error || "Something went wrong.");
        }
      }
    } catch (err) {
      setMessage("Server error. Please try again.");
      console.error("Error:", err);
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl w-[550px] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Add Sentinel User</h2>
          <button onClick={onClose}>
            <X className="w-6 h-6 text-gray-400 hover:text-gray-200 cursor-pointer" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              className="bg-[#18181b] border border-gray-800 p-2 rounded-md text-gray-200"
              required
            />

            <input
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              className="bg-[#18181b] border border-gray-800 p-2 rounded-md text-gray-200"
              required
            />

            <input
              name="dept"
              placeholder="Department"
              value={form.dept}
              onChange={handleChange}
              className="bg-[#18181b] border border-gray-800 p-2 rounded-md text-gray-200"
            />

            <input
              name="fullname"
              placeholder="Full Name"
              value={form.fullname}
              onChange={handleChange}
              className="bg-[#18181b] border border-gray-800 p-2 rounded-md text-gray-200"
            />

            <input
              name="setup"
              placeholder="Setup"
              value={form.setup}
              onChange={handleChange}
              className="bg-[#18181b] border border-gray-800 p-2 rounded-md text-gray-200"
            />

            <input
              name="setupcode"
              placeholder="Setup Code"
              value={form.setupcode}
              onChange={handleChange}
              className="bg-[#18181b] border border-gray-800 p-2 rounded-md text-gray-200"
            />

            <input
              name="apptcode"
              placeholder="Appt Code"
              value={form.apptcode}
              onChange={handleChange}
              className="bg-[#18181b] border border-gray-800 p-2 rounded-md text-gray-200"
            />

            <input
              name="ip_address"
              placeholder="IP Address"
              value={form.ip_address}
              onChange={handleChange}
              className="bg-[#18181b] border border-gray-800 p-2 rounded-md text-gray-200"
            />
          </div>

          <textarea
            name="remarks"
            placeholder="Remarks"
            value={form.remarks}
            onChange={handleChange}
            className="w-full bg-[#18181b] border border-gray-800 p-2 rounded-md text-gray-200"
            rows={3}
          />

          {/* Message */}
          {message && (
            <p
              className={`text-sm ${
                message.includes("successfully")
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              {message}
            </p>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-40 cursor-pointer"
            >
              {loading ? "Saving..." : "Add User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
