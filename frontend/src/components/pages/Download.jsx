import { useParams } from "react-router-dom";
import { API_BASE_URL } from "../../../config";

const Download = () => {
  const { token } = useParams();

  const downloadUrl = (arch) =>
    `${API_BASE_URL}/api/agent/download-mac/${token}?arch=${arch}`;

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

        {token ? (
          <>
            <p style={{ color: "#374151", fontSize: 18 }}>
              Choose the package that matches your Mac:
            </p>
            <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
              <a
                href={downloadUrl("arm64")}
                style={{
                  color: "white", background: "#4f46e5", padding: 14,
                  borderRadius: 8, textDecoration: "none", fontWeight: "bold",
                }}
              >
                Apple Silicon (M1–M4)
              </a>
              <a
                href={downloadUrl("x64")}
                style={{
                  color: "#4f46e5", border: "1px solid #4f46e5", padding: 14,
                  borderRadius: 8, textDecoration: "none", fontWeight: "bold",
                }}
              >
                Intel Mac
              </a>
            </div>
            <p style={{ color: "#6b7280", marginTop: 24 }}>
              Extract the ZIP, then run <strong>IWF-Agent</strong>. Your
              activation code and server address are included automatically.
            </p>
          </>
        ) : (
          <p style={{ color: "#dc2626" }}>
            Invalid download link. Please contact your administrator.
          </p>
        )}
      </div>
    </div>
  );
};

export default Download;
