import React, { useState } from "react";
import { Download, CheckCircle, AlertCircle } from "lucide-react";

const DownloadButton: React.FC = () => {
  const [downloading, setDownloading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

  const handleDownload = async () => {
    setDownloading(true);
    setStatus("idle");

    try {
      const response = await fetch("http://localhost:8000/download", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "exoplanet_predictions.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (error) {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    } finally {
      setDownloading(false);
    }
  };

  const getButtonContent = () => {
    if (downloading) {
      return (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Downloading...</span>
        </>
      );
    }

    if (status === "success") {
      return (
        <>
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span>Downloaded!</span>
        </>
      );
    }

    if (status === "error") {
      return (
        <>
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>Failed</span>
        </>
      );
    }

    return (
      <>
        <Download className="w-4 h-4" />
        <span>Download CSV</span>
      </>
    );
  };

  return (
    <button
      onClick={handleDownload}
      disabled={downloading}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
        status === "success"
          ? "bg-green-500/20 text-green-400 border border-green-500/30"
          : status === "error"
          ? "bg-red-500/20 text-red-400 border border-red-500/30"
          : "bg-gradient-to-r from-purple-500 to-blue-500 text-white hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      }`}
    >
      {getButtonContent()}
    </button>
  );
};

export default DownloadButton;
