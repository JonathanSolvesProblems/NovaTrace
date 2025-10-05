import React, { useMemo, useState } from "react";
import {
  BarChart,
  ScatterChart,
  PieChart,
  TrendingUp,
  Activity,
  CircleDot,
} from "lucide-react";

interface DataExplorationProps {
  data: {
    columns: string[];
    rows: Record<string, any>[];
  };
}

const DataExploration: React.FC<DataExplorationProps> = ({ data }) => {
  const [selectedChart, setSelectedChart] = useState<
    "overview" | "scatter" | "histogram"
  >("overview");

  // -----------------------------
  // Compute summary statistics
  // -----------------------------
  const stats = useMemo(() => {
    if (!data || !Array.isArray(data.rows)) {
      return { dispositions: {}, columns: {}, total: 0 };
    }

    const dispositions = data.rows.reduce(
      (acc: Record<string, number>, row) => {
        const disp = String(
          row.Predicted_Disposition || "Unknown"
        ).toUpperCase();
        acc[disp] = (acc[disp] || 0) + 1;
        return acc;
      },
      {}
    );

    const numericCols = [
      "koi_period",
      "pl_orbper",
      "koi_prad",
      "pl_rade",
      "koi_depth",
      "koi_teff",
      "st_teff",
      "pl_trandep",
    ];
    const columns = numericCols.reduce((acc: Record<string, any>, col) => {
      const vals = data.rows
        .map((r) => parseFloat(r[col]))
        .filter((v) => !isNaN(v))
        .sort((a, b) => a - b);
      if (vals.length === 0) return acc;
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      acc[col] = {
        min: vals[0],
        max: vals[vals.length - 1],
        mean,
        median: vals[Math.floor(vals.length / 2)],
        count: vals.length,
      };
      return acc;
    }, {});
    return { dispositions, columns, total: data.rows.length };
  }, [data]);

  // -----------------------------
  // Chart Components
  // -----------------------------

  const ScatterPlot: React.FC = () => {
    const scatter = useMemo(() => {
      if (!data?.rows) return [];
      return data.rows
        .map((r) => {
          const x = parseFloat(r.period ?? ""); // your x-axis
          const y = parseFloat(r.radius ?? r.depth ?? ""); // your y-axis
          const disp = String(
            r.Predicted_Disposition ?? r.koi_disposition ?? "UNKNOWN"
          ).toUpperCase();
          return { x, y, disp };
        })
        .filter((p) => !isNaN(p.x) && !isNaN(p.y));
    }, [data]);

    const maxX = Math.max(...scatter.map((d) => d.x), 1);
    const maxY = Math.max(...scatter.map((d) => d.y), 1);

    const color = (disp: string) => {
      switch (disp) {
        case "CP":
        case "CONFIRMED":
          return "#10b981";
        case "PC":
        case "CANDIDATE":
          return "#facc15";
        case "FP":
        case "FALSE POSITIVE":
          return "#ef4444";
        default:
          return "#94a3b8";
      }
    };

    return (
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
        <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
          <ScatterChart className="w-5 h-5 text-purple-400" />
          <span>Orbital Period vs Planet Radius</span>
        </h4>

        <div className="relative h-64 bg-slate-900/40 rounded-lg overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 400 250">
            {/* Grid lines - horizontal */}
            {[...Array(5)].map((_, i) => {
              const y = 210 - (i * 180) / 4;
              return (
                <line
                  key={`hgrid-${i}`}
                  x1="40"
                  x2="360"
                  y1={y}
                  y2={y}
                  stroke="#64748b"
                  strokeDasharray="2,2"
                />
              );
            })}

            {/* Grid lines - vertical */}
            {[...Array(5)].map((_, i) => {
              const x = 40 + (i * 320) / 4;
              return (
                <line
                  key={`vgrid-${i}`}
                  y1="210"
                  y2="30"
                  x1={x}
                  x2={x}
                  stroke="#64748b"
                  strokeDasharray="2,2"
                />
              );
            })}

            {/* Scatter points */}
            {scatter.map((p, i) => {
              const x = 40 + (p.x / maxX) * 320;
              const y = 210 - (p.y / maxY) * 180;
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="4"
                  fill={color(p.disp)}
                  stroke="#000"
                  strokeWidth="0.3"
                  opacity="0.8"
                />
              );
            })}

            {/* Axes labels */}
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
              Radius (R⊕)
            </text>

            {/* Legend - moved outside plotting area */}
            <g transform={`translate(370, 40)`}>
              {["CONFIRMED", "CANDIDATE", "FALSE POSITIVE"].map((disp, i) => (
                <g key={`legend-${i}`} transform={`translate(0, ${i * 20})`}>
                  <rect width="10" height="10" fill={color(disp)} />
                  <text x="14" y="10" fill="#fff" fontSize="10">
                    {disp}
                  </text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      </div>
    );
  };

  const HistogramChart: React.FC = () => {
    const periods = useMemo(() => {
      const vals =
        data?.rows
          ?.map((r) => parseFloat(r.period ?? "")) // <- use 'period' here
          .filter((v) => !isNaN(v) && v > 0) || [];
      vals.sort((a, b) => a - b);
      return vals;
    }, [data]);

    if (periods.length === 0)
      return (
        <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700/50">
          <p className="text-slate-400 text-sm">No valid orbital data.</p>
        </div>
      );

    const bins = 25;
    const min = periods[0],
      max = periods[periods.length - 1],
      width = (max - min) / bins;
    const histogram = Array(bins).fill(0);
    periods.forEach((v) => {
      const i = Math.min(bins - 1, Math.floor((v - min) / width));
      histogram[i]++;
    });
    const maxCount = Math.max(...histogram);

    return (
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
        <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
          <BarChart className="w-5 h-5 text-purple-400" />
          <span>Orbital Period Distribution</span>
        </h4>
        <div className="relative h-64 bg-slate-900/40 rounded-lg overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 400 250">
            {/* Grid lines - horizontal */}
            {[...Array(5)].map((_, i) => {
              const y = 210 - (i * 180) / 4;
              return (
                <line
                  key={`hgrid-${i}`}
                  x1="40"
                  x2="360"
                  y1={y}
                  y2={y}
                  stroke="#64748b"
                  strokeDasharray="2,2"
                />
              );
            })}

            {/* Grid lines - vertical */}
            {[...Array(5)].map((_, i) => {
              const x = 40 + (i * 320) / 4;
              return (
                <line
                  key={`vgrid-${i}`}
                  y1="210"
                  y2="30"
                  x1={x}
                  x2={x}
                  stroke="#64748b"
                  strokeDasharray="2,2"
                />
              );
            })}

            {/* Bars */}
            {histogram.map((count, i) => {
              const x = 40 + i * (320 / bins);
              const height = (count / maxCount) * 180;
              const y = 210 - height;
              return (
                <rect
                  key={i}
                  x={x}
                  y={y}
                  width={320 / bins - 2}
                  height={height}
                  fill="#a78bfa"
                  stroke="#7c3aed"
                  strokeWidth="0.5"
                  opacity="0.8"
                />
              );
            })}

            {/* Axes labels */}
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

  const OverviewPanel: React.FC = () => {
    const total = stats.total || 1;
    const colors = ["#10b981", "#facc15", "#ef4444"];
    const entries = Object.entries(stats.dispositions);
    const totalConfirmed = entries.reduce((a, [_, v]) => a + v, 0);
    let cumulative = 0;

    return (
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <PieChart className="w-5 h-5 text-purple-400" />
          <span>Classification Distribution</span>
        </h4>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Donut chart */}
          <svg className="w-40 h-40 mx-auto" viewBox="0 0 36 36">
            {entries.map(([disp, count], i) => {
              const start = (cumulative / totalConfirmed) * 100;
              cumulative += count;
              const end = (cumulative / totalConfirmed) * 100;
              const offset = 100 - end;
              const strokeDasharray = `${end - start} ${100 - (end - start)}`;
              return (
                <circle
                  key={i}
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="transparent"
                  stroke={colors[i % colors.length]}
                  strokeWidth="2.5"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={offset}
                />
              );
            })}
            <text
              x="18"
              y="20.5"
              fill="#fff"
              fontSize="6"
              textAnchor="middle"
              fontWeight="bold"
            >
              {total}
            </text>
          </svg>

          {/* Breakdown */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {entries.map(([disp, count], i) => (
              <div key={i} className="bg-slate-700/30 rounded-lg p-4">
                <div
                  className="text-2xl font-bold mb-1"
                  style={{ color: colors[i % colors.length] }}
                >
                  {count}
                </div>
                <div className="text-sm text-slate-400">
                  {disp.charAt(0) + disp.slice(1).toLowerCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // -----------------------------
  // Main UI
  // -----------------------------
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Data Exploration</h2>
          <p className="text-slate-400">
            Visual analysis of model predictions and astrophysical features
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {[
            ["overview", PieChart],
            ["scatter", TrendingUp],
            ["histogram", BarChart],
          ].map(([type, Icon]) => (
            <button
              key={type}
              onClick={() => setSelectedChart(type as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                selectedChart === type
                  ? "bg-purple-500 text-white"
                  : "bg-slate-700 text-slate-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="capitalize">{type}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic chart view */}
      {selectedChart === "overview" && <OverviewPanel />}
      {selectedChart === "scatter" && <ScatterPlot />}
      {selectedChart === "histogram" && <HistogramChart />}

      {/* Stats summary */}
      <div className="grid md:grid-cols-3 gap-6">
        {Object.entries(stats.columns).map(([col, s], i) => (
          <div
            key={i}
            className="bg-slate-800/50 rounded-lg p-5 border border-slate-700/50"
          >
            <h4 className="text-white font-semibold mb-2 capitalize">
              {col.replace("koi_", "")}
            </h4>
            <div className="grid grid-cols-2 text-sm text-slate-400">
              <div>Min:</div>
              <div className="text-white">{s.min.toFixed(2)}</div>
              <div>Max:</div>
              <div className="text-white">{s.max.toFixed(2)}</div>
              <div>Mean:</div>
              <div className="text-white">{s.mean.toFixed(2)}</div>
              <div>Count:</div>
              <div className="text-white">{s.count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Insights */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl border border-purple-500/20 p-6">
        <h4 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <Activity className="w-5 h-5 text-purple-400" />
          <span>Key Insights</span>
        </h4>
        <ul className="text-sm text-slate-300 space-y-2">
          <li>
            🌍 <b>{Object.keys(stats.dispositions).length}</b> classification
            categories detected in current dataset.
          </li>
          <li>
            📈 Typical exoplanet radii cluster between{" "}
            <b>
              {stats.columns.koi_prad?.min.toFixed(1)}–
              {stats.columns.koi_prad?.max.toFixed(1)} R⊕
            </b>{" "}
            with median {stats.columns.koi_prad?.median?.toFixed(2)}.
          </li>
          <li>
            ☀️ Stellar temperatures range from{" "}
            <b>{stats.columns.koi_teff?.min?.toFixed(0)}K</b> to{" "}
            <b>{stats.columns.koi_teff?.max?.toFixed(0)}K</b>.
          </li>
          <li>
            🔍 Explore scatter plots to see how orbital period and planet radius
            cluster by classification type.
          </li>
        </ul>
      </div>
    </div>
  );
};

export default DataExploration;
