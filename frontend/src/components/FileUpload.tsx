import React, { useRef, useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import RetrainModel from "./RetrainModel";

interface FileUploadProps {
  onUpload: (data: any) => void; // preview data
  onClassify: (data: any) => void; // classification data
  setLoading: (loading: boolean) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  onClassify,
  setLoading,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retrainOpen, setRetrainOpen] = useState(false);

  const handleFiles = async (files: FileList) => {
    const file = files[0];
    if (!file) return;

    const allowed = [".csv", ".xlsx", ".xls"];
    if (!allowed.some((ext) => file.name.toLowerCase().endsWith(ext))) {
      setError("Please upload a CSV or Excel file");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      // 1️⃣ Preview request
      const previewResponse = await fetch(
        "http://localhost:8000/upload?preview=true",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!previewResponse.ok) {
        throw new Error(`Preview upload failed: ${previewResponse.statusText}`);
      }

      const previewData = await previewResponse.json();
      onUpload(previewData); // pass preview data up

      // 2️⃣ Classification request
      const classifyResponse = await fetch(
        "http://localhost:8000/upload?preview=false",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!classifyResponse.ok) {
        throw new Error(
          `Classification failed: ${classifyResponse.statusText}`
        );
      }

      const classifyData = await classifyResponse.json();
      console.log(classifyData);
      onClassify(classifyData); // pass classification data up
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const onButtonClick = () => fileInputRef.current?.click();

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">
          Upload Exoplanet Data
        </h2>
        <p className="text-slate-400">
          Upload your CSV file to start the classification process
        </p>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 cursor-pointer ${
          dragActive
            ? "border-purple-400 bg-purple-500/10"
            : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/20"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={onButtonClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleChange}
          className="hidden"
        />

        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-white" />
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Drop your CSV file here
            </h3>
            <p className="text-slate-400">
              or{" "}
              <span className="text-purple-400 font-medium">
                click to browse
              </span>
            </p>
          </div>

          <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
            <FileText className="w-4 h-4" />
            <span>Supported format: CSV, XLSX, XLS</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center space-x-2 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      <div className="bg-slate-700/30 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-white mb-3">
          Expected Data Format
        </h4>
        <div className="space-y-2 text-sm text-slate-400">
          <p>• CSV or Excel file with exoplanet observation data</p>
          <p>
            • Should include columns for orbital period, radius, stellar
            temperature
          </p>
          <p>
            • The system will automatically classify each object as Confirmed,
            Candidate, or False Positive
          </p>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mt-4 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
            <p className="text-sm text-blue-300">
              <strong>Note:</strong> Uploaded data is{" "}
              <span className="underline">classified only</span> and will{" "}
              <span className="font-semibold">not</span> be used to retrain the
              model to avoid data quality issues.
            </p>
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-6">
        <button
          onClick={() => setRetrainOpen(true)}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white"
        >
          Retrain Model
        </button>
        <RetrainModel
          open={retrainOpen}
          onClose={() => setRetrainOpen(false)}
        />
      </div>
    </div>
  );
};

export default FileUpload;
