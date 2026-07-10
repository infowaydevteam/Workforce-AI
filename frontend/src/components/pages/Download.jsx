import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../../../config";

const Download = () => {
  const { token } = useParams();
  const [status, setStatus] = useState("starting");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    // Trigger download via a hidden anchor — works around Gmail's HTTP link blocking
    const url = `${API_BASE_URL}/api/agent/download-mac/${token}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "IWF-Agent-mac.dmg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setStatus("downloading");
  }, [token]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "Arial, sans-serif",
      background: "#f9fafb",
    }}>
      <div style={{
        background: "white",
        borderRadius: 16,
        padding: 48,
        maxWidth: 480,
        textAlign: "center",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}>
        <div style={{
          width: 64, height: 64, background: "#4f46e5",
          borderRadius: 16, display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 24px",
          fontSize: 32,
        }}>
          🖥
        </div>

        <h1 style={{ color: "#111827", marginBottom: 8 }}>IWF Agent</h1>

        {status === "downloading" && (
          <>
            <p style={{ color: "#4f46e5", fontWeight: "bold", fontSize: 18 }}>
              ✅ Your download has started!
            </p>
            <p style={{ color: "#6b7280", marginTop: 8 }}>
              Open the <strong>.dmg</strong> file once it finishes downloading,
              then run <strong>IWF-Agent</strong> and enter your activation code.
            </p>
            <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 24 }}>
              If the download didn't start,{" "}
              <a
                href={`${API_BASE_URL}/api/agent/download-mac/${token}`}
                style={{ color: "#4f46e5" }}
              >
                click here
              </a>.
            </p>
          </>
        )}

        {status === "error" && (
          <p style={{ color: "#dc2626" }}>
            Invalid download link. Please contact your administrator.
          </p>
        )}
      </div>
    </div>
  );
};

export default Download;
