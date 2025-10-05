import React, { useMemo } from "react";
import { CheckCircle, AlertTriangle, XCircle, Filter } from "lucide-react";

interface ClassificationResultsProps {
  data: {
    columns: string[];
    rows: Record<string, any>[];
  };
  selectedDisposition: string;
  setSelectedDisposition: (disposition: string) => void;
}

const ClassificationResults: React.FC<ClassificationResultsProps> = ({
  data,
  selectedDisposition,
  setSelectedDisposition,
}) => {
  if (!data || !Array.isArray(data.rows) || !Array.isArray(data.columns)) {
    return (
      <div className="text-slate-400 p-6">
        No classification results available yet.
      </div>
    );
  }

  const dispositionCounts = useMemo(() => {
    const counts = { CONFIRMED: 0, CANDIDATE: 0, "FALSE POSITIVE": 0 };
    data.rows.forEach((row) => {
      const d = String(row.Predicted_Disposition || "").toUpperCase();
      if (d in counts) counts[d as keyof typeof counts]++;
    });
    return counts;
  }, [data.rows]);

  const filteredRows = useMemo(
    () =>
      data.rows.filter(
        (r) =>
          String(r.Predicted_Disposition || "").toUpperCase() ===
          selectedDisposition
      ),
    [data.rows, selectedDisposition]
  );

  const dispositionConfig = {
    CONFIRMED: {
      icon: CheckCircle,
      color: "text-green-400",
      bg: "bg-green-500/20",
      border: "border-green-500/30",
      description: "High confidence exoplanet detections",
    },
    CANDIDATE: {
      icon: AlertTriangle,
      color: "text-yellow-400",
      bg: "bg-yellow-500/20",
      border: "border-yellow-500/30",
      description: "Potential exoplanets requiring further verification",
    },
    "FALSE POSITIVE": {
      icon: XCircle,
      color: "text-red-400",
      bg: "bg-red-500/20",
      border: "border-red-500/30",
      description: "Non-planetary signals (eclipsing binaries, noise, etc.)",
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">
          Classification Results
        </h2>
        <p className="text-slate-400">
          Machine learning predictions for {data.rows.length} objects
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(dispositionCounts).map(([disp, count]) => {
          const config =
            dispositionConfig[disp as keyof typeof dispositionConfig];
          const Icon = config.icon;
          const percentage = ((count / data.rows.length) * 100).toFixed(1);

          return (
            <button
              key={disp}
              onClick={() => setSelectedDisposition(disp)}
              className={`text-left p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                selectedDisposition === disp
                  ? `${config.bg} ${config.border}`
                  : "bg-slate-700/30 border-slate-600/50 hover:border-slate-500/50"
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-8 h-8 ${config.color}`} />
                <span className="text-2xl font-bold text-white">{count}</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {disp.replace("_", " ")}
              </h3>
              <p className="text-sm text-slate-400 mb-2">
                {config.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  {percentage}% of total
                </span>
                <div className="w-16 h-2 rounded-full bg-slate-600 overflow-hidden">
                  <div
                    className={`h-full ${config.color.replace("text-", "bg-")}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed results */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-6 border-b border-slate-700/30 flex items-center space-x-3">
          <Filter className="w-5 h-5 text-slate-400" />
          <h3 className="text-xl font-semibold text-white">
            {selectedDisposition} Objects
          </h3>
          <span className="px-3 py-1 bg-slate-700 rounded-full text-sm text-slate-300">
            {filteredRows.length} results
          </span>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Object ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Period (days)
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Radius (R⊕)
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Stellar Temp (K)
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Classification
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Confidence
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filteredRows.slice(0, 20).map((row, i) => {
                const config =
                  dispositionConfig[
                    row.Predicted_Disposition as keyof typeof dispositionConfig
                  ];
                const Icon = config.icon;

                return (
                  <tr
                    key={i}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-white">
                      {row.kepoi_name ?? row.id ?? `Object-${i + 1}`}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {row.koi_period ? row.koi_period.toFixed(2) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {row.koi_prad ? row.koi_prad.toFixed(2) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {row.koi_teff ? row.koi_teff.toFixed(0) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        <span className={`text-sm font-medium ${config.color}`}>
                          {row.Predicted_Disposition}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {/* 🔧 Replace with real probability if server adds predict_proba */}
                      <div className="flex items-center space-x-2">
                        <div className="w-16 h-2 bg-slate-600 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${config.color.replace(
                              "text-",
                              "bg-"
                            )}`}
                            style={{ width: `${(row.Confidence ?? 0) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-slate-400">
                          {((row.Confidence ?? 0) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRows.length > 20 && (
          <div className="p-4 text-center text-sm text-slate-400 border-t border-slate-700/30">
            Showing first 20 of {filteredRows.length} results
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassificationResults;
