import React, { useEffect, useState } from "react";
import { API_BASE_URL } from "../../../../config";
import { Eye, Search } from "lucide-react";

const today = new Date().toISOString().slice(0, 10);

const ScreenshotReports = () => {
  const token = localStorage.getItem("token");
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [screenshots, setScreenshots] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    loadEmployees();
  }, []);

  useEffect(() => {
    return () => {
      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }
    };
  }, [preview]);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const loadEmployees = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/screenshots/employees`, {
        headers: authHeaders,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Unable to load employees");
      }

      setEmployees(data.data || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadScreenshots = async (page = 1) => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
      });

      if (employeeId) params.set("employee_id", employeeId);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`${API_BASE_URL}/api/screenshots?${params}`, {
        headers: authHeaders,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Unable to load screenshots");
      }

      setScreenshots(data.data || []);
      setPagination(data.pagination || { page, limit: 20, total: 0 });
    } catch (err) {
      setError(err.message);
      setScreenshots([]);
    } finally {
      setLoading(false);
    }
  };

  const openPreview = async (screenshot) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/screenshots/${screenshot.id}/image`,
        { headers: authHeaders }
      );

      if (!res.ok) {
        throw new Error("Unable to open screenshot");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      if (preview?.url) {
        URL.revokeObjectURL(preview.url);
      }

      setPreview({ ...screenshot, url });
    } catch (err) {
      setError(err.message);
    }
  };

  const closePreview = () => {
    if (preview?.url) {
      URL.revokeObjectURL(preview.url);
    }

    setPreview(null);
  };

  const totalPages = Math.max(
    1,
    Math.ceil((pagination.total || 0) / (pagination.limit || 20))
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            className="border rounded-xl p-3"
          >
            <option value="">All Employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border rounded-xl p-3"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border rounded-xl p-3"
          />

          <button
            onClick={() => loadScreenshots(1)}
            className="md:col-span-2 flex items-center justify-center gap-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
          >
            <Search size={18} />
            Search Screenshots
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-800">Screenshots</h2>
          <span className="text-sm text-slate-500">
            {pagination.total || 0} results
          </span>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading screenshots...</div>
        ) : screenshots.length === 0 ? (
          <div className="p-10 text-center text-slate-500">
            No screenshots found for the selected filters.
          </div>
        ) : (
          <div className="divide-y">
            {screenshots.map((screenshot) => (
              <div
                key={screenshot.id}
                className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <p className="font-semibold text-slate-800">
                    {screenshot.employee_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {new Date(screenshot.captured_at).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-400">
                    {screenshot.mime_type} / {Math.round((screenshot.byte_size || 0) / 1024)} KB
                  </p>
                </div>

                <button
                  onClick={() => openPreview(screenshot)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                >
                  <Eye size={18} />
                  View
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-4 border-t flex items-center justify-between">
          <button
            disabled={pagination.page <= 1}
            onClick={() => loadScreenshots(pagination.page - 1)}
            className="px-4 py-2 rounded-lg border disabled:opacity-40"
          >
            Previous
          </button>

          <span className="text-sm text-slate-500">
            Page {pagination.page} of {totalPages}
          </span>

          <button
            disabled={pagination.page >= totalPages}
            onClick={() => loadScreenshots(pagination.page + 1)}
            className="px-4 py-2 rounded-lg border disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/70 p-6 flex items-center justify-center">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-800">
                  {preview.employee_name}
                </p>
                <p className="text-sm text-slate-500">
                  {new Date(preview.captured_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={closePreview}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
            <div className="bg-slate-950 p-4 max-h-[75vh] overflow-auto">
              <img
                src={preview.url}
                alt={`${preview.employee_name} screenshot`}
                className="mx-auto max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenshotReports;
