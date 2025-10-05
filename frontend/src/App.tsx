import React, { useState } from "react";
import { Upload, Database, BarChart3, Orbit, Eye } from "lucide-react";
import FileUpload from "./components/FileUpload";
import DataPreview from "./components/DataPreview";
import ClassificationResults from "./components/ClassificationResults";
import PlanetSystem3D from "./components/PlanetSystem3D";
import DataExploration from "./components/DataExploration";
// import DownloadButton from "./components/DownloadButton";
import LoadingSpinner from "./components/LoadingSpinner";

interface ExoplanetData {
  columns: string[];
  rows: Record<string, any>[];
}

type TabType =
  | "upload"
  | "preview"
  | "classification"
  | "visualization"
  | "exploration";

function App() {
  const [activeTab, setActiveTab] = useState<TabType>("upload");

  // 🔹 separate states
  const [previewData, setPreviewData] = useState<ExoplanetData | null>(null);
  const [classificationData, setClassificationData] =
    useState<ExoplanetData | null>(null);

  const [loading, setLoading] = useState(false);
  const [selectedDisposition, setSelectedDisposition] =
    useState<string>("CONFIRMED");

  const tabs = [
    { id: "upload" as TabType, label: "Upload", icon: Upload },
    { id: "preview" as TabType, label: "Preview", icon: Eye },
    {
      id: "classification" as TabType,
      label: "Classification",
      icon: Database,
    },
    { id: "visualization" as TabType, label: "3D System", icon: Orbit },
    { id: "exploration" as TabType, label: "Exploration", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                <Orbit className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">NovaTrace</h1>
                <p className="text-slate-400 text-sm">
                  Exoplanet Classification & Visualization
                </p>
              </div>
            </div>
            {/* {(previewData || classificationData) && <DownloadButton />} */}
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const disabled =
                tab.id !== "upload" && !previewData && !classificationData;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={disabled}
                  className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-slate-700/70 text-white border-b-2 border-purple-500"
                      : "text-slate-400 hover:text-white hover:bg-slate-700/30"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Loading Indicator */}
      {loading && <LoadingSpinner />}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8">
          {activeTab === "upload" && (
            <FileUpload
              onUpload={(data) => {
                setPreviewData(data);
                setActiveTab("preview");
              }}
              onClassify={(data) => {
                setClassificationData(data);
                setActiveTab("classification"); // auto-switch after classify
              }}
              setLoading={setLoading}
            />
          )}

          {activeTab === "preview" && previewData && (
            <DataPreview data={previewData} />
          )}

          {activeTab === "classification" && classificationData && (
            <ClassificationResults
              data={classificationData}
              selectedDisposition={selectedDisposition}
              setSelectedDisposition={setSelectedDisposition}
            />
          )}

          {activeTab === "visualization" && classificationData && (
            <PlanetSystem3D
              disposition={selectedDisposition}
              data={classificationData}
            />
          )}

          {activeTab === "exploration" && classificationData && (
            <DataExploration data={classificationData} />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900/50 border-t border-slate-700/30 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="text-center text-slate-400 text-sm">
            <p>
              Powered by machine learning • Visualized with Three.js • Built
              with React
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
