// frontend/src/components/ui/ImportSentinelUsersModal.jsx
import React, { useState } from "react";

export default function ImportSentinelUsersModal({ open, onClose }) {
  if (!open) return null;

  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const upload = async () => {
    if (!file) {
      setStatus("Please select a CSV file.");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    setLoading(true);
    setStatus(null);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/records/import", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || "Import failed");
        setSummary(data);
      } else {
        setStatus(`Imported: ${data.success}, Failed: ${data.failed}`);
        setSummary(data);
        // Notify other parts of app to re-fetch records
        window.dispatchEvent(
          new CustomEvent("recordsImported", { detail: data })
        );
        // optional close after short delay:
        setTimeout(() => onClose(), 900);
      }
    } catch (err) {
      console.error("Upload error:", err);
      setStatus("Upload failed (network/server).");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Import Sentinel Users (CSV)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            Close
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-3">
          CSV columns expected (header row): <br />
          <code>
            username,password,dept,fullname,setup,setupcode,apptcode,remarks,ip_address
          </code>
        </p>

        <div className="mb-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-700 text-gray-200"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={upload}
            className="px-4 py-2 rounded bg-blue-600 text-white"
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload & Import"}
          </button>
        </div>

        {status && <p className="mt-3 text-sm text-gray-300">{status}</p>}

        {summary && summary.failedRows && summary.failedRows.length > 0 && (
          <div className="mt-3 text-sm text-yellow-200">
            <strong>Failed rows:</strong>
            <ul className="list-disc ml-5">
              {summary.failedRows.slice(0, 6).map((f, i) => (
                <li key={i}>
                  Row {f.rowNumber}: {f.reason}
                </li>
              ))}
              {summary.failedRows.length > 6 && <li>...and more</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
