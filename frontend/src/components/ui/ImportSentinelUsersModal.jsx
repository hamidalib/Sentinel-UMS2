// frontend/src/components/ui/ImportSentinelUsersModal.jsx
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { X } from "lucide-react";

export default function ImportSentinelUsersModal({ open, onClose }) {
  if (!open) return null;

  const [file, setFile] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [headerRow, setHeaderRow] = useState([]);
  const [fileError, setFileError] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setFileError(null);
    setSummary(null);
    setStatus(null);
    setPreviewRows([]);
    setHeaderRow([]);

    if (rejectedFiles && rejectedFiles.length > 0) {
      setFileError("Only CSV files are accepted.");
      return;
    }

    const f = acceptedFiles && acceptedFiles[0];
    if (!f) {
      setFileError("No file selected.");
      return;
    }

    // Keep the file reference for upload
    setFile(f);

    // Parse a small preview with PapaParse
    Papa.parse(f, {
      preview: 10, // only parse up to 10 rows for preview
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        // results.data is array of row objects, results.meta.fields is header list
        setPreviewRows(results.data.slice(0, 5));
        setHeaderRow(
          results.meta && results.meta.fields ? results.meta.fields : []
        );
      },
      error: (err) => {
        console.error("CSV parse error (preview):", err);
        setFileError("Failed to parse CSV preview.");
      },
    });
  }, []);

  // Configure react-dropzone to accept CSV only
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".csv"],
    },
  });

  const upload = async () => {
    if (!file) {
      setStatus("Please select a CSV file.");
      return;
    }

    setLoading(true);
    setStatus(null);
    setSummary(null);
    setFileError(null);

    try {
      // First call preview endpoint to detect duplicates / missing usernames
      setPreviewResult(null);
      setConfirming(false);
      const form = new FormData();
      form.append("file", file);

      const token = localStorage.getItem("token");
      const previewRes = await fetch(
        "http://localhost:5000/api/records/import/preview",
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        }
      );

      const previewData = await previewRes.json();
      if (!previewRes.ok) {
        setStatus(previewData.error || "Preview failed");
        setLoading(false);
        return;
      }

      // If there are duplicates or missing username rows, ask user to confirm
      if (
        (previewData.duplicates && previewData.duplicates.length > 0) ||
        (previewData.missingUsername && previewData.missingUsername.length > 0)
      ) {
        setPreviewResult(previewData);
        setConfirming(true);
        setStatus(
          `Preview found ${previewData.duplicates.length} duplicate(s), ${previewData.missingUsername.length} invalid row(s).`
        );
        setLoading(false);
        return;
      }

      // No duplicates/missing, proceed to actual import
      const importRes = await fetch(
        "http://localhost:5000/api/records/import",
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        }
      );
      const data = await importRes.json();

      if (!importRes.ok) {
        setStatus(data.error || "Import failed");
        setSummary(data);
      } else {
        setStatus(`Imported: ${data.success}, Failed: ${data.failed}`);
        setSummary(data);
        window.dispatchEvent(
          new CustomEvent("recordsImported", { detail: data })
        );
        setTimeout(() => onClose(), 900);
      }
    } catch (err) {
      console.error("Upload/preview error:", err);
      setStatus("Upload failed (network/server).");
    } finally {
      setLoading(false);
    }
  };

  const continueImport = async () => {
    if (!file) return;
    setLoading(true);
    setStatus(null);
    try {
      const form = new FormData();
      form.append("file", file);
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
        window.dispatchEvent(
          new CustomEvent("recordsImported", { detail: data })
        );
        setTimeout(() => onClose(), 900);
      }
    } catch (err) {
      console.error("Continue import error:", err);
      setStatus("Import failed (network/server).");
    } finally {
      setLoading(false);
      setConfirming(false);
      setPreviewResult(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewRows([]);
    setHeaderRow([]);
    setFileError(null);
    setSummary(null);
    setStatus(null);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] border border-gray-800 rounded-xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Import Sentinel Users (CSV)</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="cursor-pointer" />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-3">
          CSV columns expected (header row): <br />
          <code>
            username,password,dept,fullname,setup,setupcode,apptcode,remarks,ip_address
          </code>
        </p>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-dashed border-2 hover:border-white/40 transition-all duration-300 rounded p-12 text-center mb-3 cursor-pointer ${
            isDragActive
              ? "border-blue-500 bg-[#0b1220]"
              : "border-gray-700 bg-transparent"
          }`}
        >
          <input {...getInputProps()} />
          {!file ? (
            <>
              <p className="text-gray-300">
                Drag & drop a CSV file here, or click to select
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Only .csv files are allowed
              </p>
            </>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-gray-200">{file.name}</div>
                <div className="text-xs text-gray-400">
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={clearFile}
                  className="px-3 py-1 rounded bg-gray-700 text-sm text-gray-200"
                >
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {fileError && (
          <div className="text-sm text-red-400 mb-2">{fileError}</div>
        )}

        {/* Preview */}
        {headerRow && headerRow.length > 0 && (
          <div className="mb-3 text-sm text-gray-300">
            <div className="font-medium mb-1">
              Preview (first {previewRows.length} rows)
            </div>
            <div className="overflow-auto bg-[#0b0b0b] border border-gray-800 rounded p-2 text-xs">
              <table className="w-full table-auto text-left text-gray-200">
                <thead>
                  <tr>
                    {headerRow.map((h, idx) => (
                      <th key={idx} className="pr-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i}>
                      {headerRow.map((h, j) => (
                        <td key={j} className="pr-4 align-top">
                          {String(r[h] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action buttons: either confirm duplicates or start preview/import */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-700 text-gray-200"
            disabled={loading}
          >
            Cancel
          </button>

          {confirming && previewResult ? (
            <>
              <button
                onClick={() => {
                  // cancel confirming and allow user to modify file
                  setConfirming(false);
                  setPreviewResult(null);
                  setStatus(null);
                }}
                className="px-4 py-2 rounded bg-yellow-600 text-white"
                disabled={loading}
              >
                Don't Import Duplicates
              </button>
              <button
                onClick={continueImport}
                className="px-4 py-2 rounded bg-blue-600 text-white"
                disabled={loading}
              >
                {loading
                  ? "Importing..."
                  : `Continue Import (${previewResult.insertable} rows)`}
              </button>
            </>
          ) : (
            <button
              onClick={upload}
              className="px-4 py-2 rounded bg-blue-600 text-white"
              disabled={loading || !file}
            >
              {loading ? "Uploading..." : "Upload & Import"}
            </button>
          )}
        </div>

        {/* If preview found duplicates or missing rows, show details */}
        {confirming && previewResult && (
          <div className="mt-3 text-sm text-yellow-200 bg-[#0b0b0b] border border-gray-800 rounded p-3">
            <div className="font-medium mb-2">Preview results</div>
            <div>Total rows: {previewResult.totalRows}</div>
            <div>Insertable rows: {previewResult.insertable}</div>
            {previewResult.duplicates &&
              previewResult.duplicates.length > 0 && (
                <div className="mt-2">
                  <div className="font-semibold">Existing usernames in DB:</div>
                  <ul className="list-disc ml-5">
                    {previewResult.duplicates.slice(0, 10).map((d, i) => (
                      <li key={i}>
                        Row {d.rowNumber}: {d.username}
                        {d.reason ? ` — ${d.reason}` : ""}
                      </li>
                    ))}
                    {previewResult.duplicates.length > 10 && (
                      <li>...and more</li>
                    )}
                  </ul>
                </div>
              )}
            {previewResult.missingUsername &&
              previewResult.missingUsername.length > 0 && (
                <div className="mt-2">
                  <div className="font-semibold">
                    Rows with missing username:
                  </div>
                  <ul className="list-disc ml-5">
                    {previewResult.missingUsername.slice(0, 10).map((d, i) => (
                      <li key={i}>
                        Row {d.rowNumber}: {d.reason}
                      </li>
                    ))}
                    {previewResult.missingUsername.length > 10 && (
                      <li>...and more</li>
                    )}
                  </ul>
                </div>
              )}
            <div className="mt-3 text-xs text-gray-300">
              You can continue to import only the non-duplicate rows, or cancel
              to modify the CSV.
            </div>
          </div>
        )}

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
