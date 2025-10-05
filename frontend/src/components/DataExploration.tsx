import React, { useMemo, useState } from "react";
import { BarChart, Link as Line, TrendingUp, PieChart } from "lucide-react";

interface DataExplorationProps {
  data: {
    columns: string[];
    rows: Record<string, any>[];
  };
}

const DataExploration: React.FC<DataExplorationProps> = ({ data }) => {
  const [selectedChart, setSelectedChart] = useState<
    "scatter" | "histogram" | "distribution"
  >("scatter");

  const stats = useMemo(() => {
    if (!data || !Array.isArray(data.rows)) {
      return { dispositions: {}, columnStats: {} };
    }

    const dispositions = data.rows.reduce(
      (acc: Record<string, number>, row) => {
        const disp = row.Predicted_Disposition || "Unknown";
        acc[disp] = (acc[disp] || 0) + 1;
        return acc;
      },
      {}
    );

    const numericColumns = ["koi_period", "koi_prad", "koi_slogg"];
    const columnStats = numericColumns.reduce(
      (acc: Record<string, any>, col) => {
        const values = data.rows
          .map((row) => parseFloat(row[col]))
          .filter((val) => !isNaN(val));

        if (values.length > 0) {
          values.sort((a, b) => a - b);
          acc[col] = {
            min: values[0],
            max: values[values.length - 1],
            mean: values.reduce((sum, val) => sum + val, 0) / values.length,
            median: values[Math.floor(values.length / 2)],
            count: values.length,
          };
        }
        return acc;
      },
      {}
    );

    return { dispositions, columnStats };
  }, [data]);

  const ScatterPlot: React.FC = () => {
    // const scatterData = useMemo(() => {
    //   if (!data?.rows) return [];
    //   return data.rows
    //     .filter((row) => row.koi_period && row.koi_prad)
    //     .map((row) => ({
    //       x: parseFloat(row.koi_period),
    //       y: parseFloat(row.koi_prad),
    //       disposition: row.Predicted_Disposition,
    //     }))
    //     .filter((point) => !isNaN(point.x) && !isNaN(point.y))
    //     .slice(0, 200); // Limit for performance
    // }, [data]);

    const scatterData = useMemo(() => {
      if (!data?.rows) return [];
      return data.rows
        .map((row) => {
          const period = parseFloat(row.koi_period || row["Period (days)"]);
          const radius = parseFloat(row.koi_prad || row["Radius (R⊕)"]);
          return {
            x: period,
            y: radius,
            disposition: row.Predicted_Disposition || row.Classification,
          };
        })
        .filter((point) => !isNaN(point.x) && !isNaN(point.y));
    }, [data]);

    const maxX =
      scatterData.length > 0 ? Math.max(...scatterData.map((d) => d.x)) : 0;
    const maxY =
      scatterData.length > 0 ? Math.max(...scatterData.map((d) => d.y)) : 0;

    return (
      <div className="bg-slate-800/50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-white mb-4">
          Period vs Radius Scatter Plot
        </h4>
        <div className="relative h-64 bg-slate-900/50 rounded border border-slate-600">
          <svg className="w-full h-full" viewBox="0 0 400 250">
            {/* Axes */}
            <line
              x1="40"
              y1="210"
              x2="360"
              y2="210"
              stroke="#64748b"
              strokeWidth="1"
            />
            <line
              x1="40"
              y1="210"
              x2="40"
              y2="30"
              stroke="#64748b"
              strokeWidth="1"
            />

            {/* Data points */}
            {scatterData.map((point, index) => {
              const x = 40 + (point.x / maxX) * 320;
              const y = 210 - (point.y / maxY) * 180;
              const color =
                point.disposition === "CONFIRMED"
                  ? "#10b981"
                  : point.disposition === "CANDIDATE"
                  ? "#f59e0b"
                  : "#ef4444";

              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="2"
                  fill={color}
                  opacity="0.7"
                />
              );
            })}

            {/* Labels */}
            <text
              x="200"
              y="235"
              fill="#94a3b8"
              fontSize="12"
              textAnchor="middle"
            >
              Orbital Period (days)
            </text>
            <text
              x="20"
              y="120"
              fill="#94a3b8"
              fontSize="12"
              textAnchor="middle"
              transform="rotate(-90 20 120)"
            >
              Planet Radius (R⊕)
            </text>
          </svg>
        </div>
        <div className="mt-4 flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-slate-400">Confirmed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-slate-400">Candidate</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-slate-400">False Positive</span>
          </div>
        </div>
      </div>
    );
  };

  const HistogramChart: React.FC = () => {
    const histogramData = useMemo(() => {
      // Safe fallback: empty array if data.rows is undefined
      const periods =
        data?.rows?.map((row) => parseFloat(row.koi_period)) ?? [];

      const validPeriods = periods
        .filter((val) => !isNaN(val) && val > 0)
        .sort((a, b) => a - b);

      if (validPeriods.length === 0) return [];

      const bins = 20;
      const min = validPeriods[0];
      const max = validPeriods[validPeriods.length - 1];
      const binWidth = (max - min) / bins;

      const histogram = Array(bins).fill(0);
      validPeriods.forEach((period) => {
        const binIndex = Math.min(
          bins - 1,
          Math.floor((period - min) / binWidth)
        );
        histogram[binIndex]++;
      });

      return histogram.map((count, index) => ({
        binStart: min + index * binWidth,
        binEnd: min + (index + 1) * binWidth,
        count,
      }));
    }, [data]);

    const maxCount = Math.max(...histogramData.map((d) => d.count));

    return (
      <div className="bg-slate-800/50 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-white mb-4">
          Orbital Period Distribution
        </h4>
        <div className="relative h-64 bg-slate-900/50 rounded border border-slate-600">
          <svg className="w-full h-full" viewBox="0 0 400 250">
            {/* Axes */}
            <line
              x1="40"
              y1="210"
              x2="360"
              y2="210"
              stroke="#64748b"
              strokeWidth="1"
            />
            <line
              x1="40"
              y1="210"
              x2="40"
              y2="30"
              stroke="#64748b"
              strokeWidth="1"
            />

            {/* Bars */}
            {histogramData.map((bin, index) => {
              const x = 40 + index * (320 / histogramData.length);
              const height = (bin.count / maxCount) * 180;
              const y = 210 - height;
              const barWidth = 320 / histogramData.length - 2;

              return (
                <rect
                  key={index}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  fill="#8b5cf6"
                  opacity="0.7"
                />
              );
            })}

            {/* Labels */}
            <text
              x="200"
              y="235"
              fill="#94a3b8"
              fontSize="12"
              textAnchor="middle"
            >
              Orbital Period (days)
            </text>
            <text
              x="20"
              y="120"
              fill="#94a3b8"
              fontSize="12"
              textAnchor="middle"
              transform="rotate(-90 20 120)"
            >
              Count
            </text>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">
            Data Exploration
          </h2>
          <p className="text-slate-400">
            Statistical analysis and visualizations
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedChart("scatter")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              selectedChart === "scatter"
                ? "bg-purple-500 text-white"
                : "bg-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Scatter</span>
          </button>

          <button
            onClick={() => setSelectedChart("histogram")}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              selectedChart === "histogram"
                ? "bg-purple-500 text-white"
                : "bg-slate-700 text-slate-400 hover:text-white"
            }`}
          >
            <BarChart className="w-4 h-4" />
            <span>Histogram</span>
          </button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(stats.dispositions).map(([disposition, count]) => (
          <div key={disposition} className="bg-slate-700/30 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400 mb-1">
              {count}
            </div>
            <div className="text-sm text-slate-400">{disposition}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedChart === "scatter" && <ScatterPlot />}
        {selectedChart === "histogram" && <HistogramChart />}

        <div className="bg-slate-800/50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">
            Statistical Summary
          </h4>
          <div className="space-y-4">
            {Object.entries(stats.columnStats).map(
              ([column, stat]: [string, any]) => (
                <div key={column} className="border-b border-slate-700/50 pb-3">
                  <div className="font-medium text-white mb-2">
                    {column.replace("koi_", "").replace("_", " ").toUpperCase()}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-400">
                    <div>
                      Min:{" "}
                      <span className="text-white">{stat.min?.toFixed(2)}</span>
                    </div>
                    <div>
                      Max:{" "}
                      <span className="text-white">{stat.max?.toFixed(2)}</span>
                    </div>
                    <div>
                      Mean:{" "}
                      <span className="text-white">
                        {stat.mean?.toFixed(2)}
                      </span>
                    </div>
                    <div>
                      Count: <span className="text-white">{stat.count}</span>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Insights Panel */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20 p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <PieChart className="w-5 h-5 text-purple-400" />
          <span>Key Insights</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-purple-400 font-medium mb-1">
              Classification Distribution
            </div>
            <div className="text-slate-300">
              {Object.entries(stats.dispositions).map(
                ([disp, count], index) => (
                  <span key={disp}>
                    {disp}:{" "}
                    {((count / (data?.rows?.length || 1)) * 100).toFixed(1)}%
                    {index < Object.keys(stats.dispositions).length - 1 &&
                      " • "}
                  </span>
                )
              )}
            </div>
          </div>
          <div>
            <div className="text-blue-400 font-medium mb-1">Data Quality</div>
            <div className="text-slate-300">
              {data?.rows?.length ?? 0} total objects analyzed with{" "}
              {data?.columns?.length ?? 0} features
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExploration;
