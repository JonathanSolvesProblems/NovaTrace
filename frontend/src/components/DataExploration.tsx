import React, { useMemo, useState } from "react";
import {
  BarChart,
  ScatterChart,
  PieChart,
  TrendingUp,
  Activity,
} from "lucide-react";

interface DataExplorationProps {
  data: {
    columns: string[];
    rows: Record<string, any>[];
  };
}

type TooltipState = {
  visible: boolean;
  x: number;
  y: number;
  content: string;
};

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

  // color mapping reused by charts & legend
  const color = (disp: string) => {
    switch ((disp || "").toUpperCase()) {
      case "CP":
      case "CONFIRMED":
        return "#10b981"; // green
      case "PC":
      case "CANDIDATE":
        return "#facc15"; // yellow
      case "FP":
      case "FALSE POSITIVE":
        return "#ef4444"; // red
      default:
        return "#94a3b8"; // slate (unknown)
    }
  };

  // -----------------------------
  // Scatter Plot (improved)
  // -----------------------------
  const ScatterPlot: React.FC = () => {
    const scatter = useMemo(() => {
      if (!data?.rows) return [];
      return data.rows
        .map((r) => {
          // your dataset has 'period' and 'radius' keys (per earlier logs)
          const x = parseFloat(r.period ?? "");
          const y = parseFloat(r.radius ?? r.depth ?? "");
          const disp = String(
            r.Predicted_Disposition ?? r.koi_disposition ?? "UNKNOWN"
          ).toUpperCase();
          const meta = { raw: r };
          return { x, y, disp, meta };
        })
        .filter((p) => !isNaN(p.x) && !isNaN(p.y));
    }, [data]);

    const maxX = Math.max(...scatter.map((d) => d.x), 1);
    const maxY = Math.max(...scatter.map((d) => d.y), 1);

    // tooltip state
    const [tooltip, setTooltip] = useState<TooltipState>({
      visible: false,
      x: 0,
      y: 0,
      content: "",
    });

    // Plot dimensions (viewBox coords)
    const plot = { left: 40, top: 30, width: 320, height: 180, bottom: 210 };

    return (
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
        <div className="flex items-start justify-between">
          <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
            <ScatterChart className="w-5 h-5 text-purple-400" />
            <span>Orbital Period vs Planet Radius</span>
          </h4>

          {/* HTML legend (outside svg so it never overlaps) */}
          <div className="flex items-center space-x-3 mt-1">
            {["CONFIRMED", "CANDIDATE", "FALSE POSITIVE", "UNKNOWN"].map(
              (d) => (
                <div key={d} className="flex items-center space-x-2">
                  <span
                    className="w-3 h-3 rounded-sm inline-block"
                    style={{ backgroundColor: color(d) }}
                  />
                  <span className="text-xs text-slate-300">{d}</span>
                </div>
              )
            )}
          </div>
        </div>

        <div className="relative h-64 bg-slate-900/40 rounded-lg overflow-hidden">
          <svg
            className="w-full h-full"
            viewBox="0 0 400 250"
            role="img"
            aria-label="Scatter plot of orbital period vs planet radius"
          >
            {/* background overlay */}
            <rect x="0" y="0" width="400" height="250" fill="transparent" />

            {/* Grid lines - horizontal */}
            {[...Array(5)].map((_, i) => {
              const y = plot.bottom - (i * plot.height) / 4;
              return (
                <line
                  key={`hgrid-${i}`}
                  x1={plot.left}
                  x2={plot.left + plot.width}
                  y1={y}
                  y2={y}
                  stroke="#64748b"
                  strokeDasharray="2,2"
                />
              );
            })}

            {/* Grid lines - vertical */}
            {[...Array(5)].map((_, i) => {
              const x = plot.left + (i * plot.width) / 4;
              return (
                <line
                  key={`vgrid-${i}`}
                  x1={x}
                  x2={x}
                  y1={plot.top}
                  y2={plot.bottom}
                  stroke="#64748b"
                  strokeDasharray="2,2"
                />
              );
            })}

            {/* axes */}
            <line
              x1={plot.left}
              y1={plot.bottom}
              x2={plot.left + plot.width}
              y2={plot.bottom}
              stroke="#475569"
              strokeWidth={1.2}
            />
            <line
              x1={plot.left}
              y1={plot.bottom}
              x2={plot.left}
              y2={plot.top}
              stroke="#475569"
              strokeWidth={1.2}
            />

            {/* tick labels (x) */}
            {[0, 1, 2, 3, 4].map((i) => {
              const val = Math.round(((maxX * i) / 4) * 10) / 10;
              const x = plot.left + (i * plot.width) / 4;
              return (
                <text
                  key={`xt-${i}`}
                  x={x}
                  y={plot.bottom + 14}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {val}
                </text>
              );
            })}

            {/* tick labels (y) */}
            {[0, 1, 2, 3, 4].map((i) => {
              const val = Math.round(((maxY * i) / 4) * 10) / 10;
              const y = plot.bottom - (i * plot.height) / 4;
              return (
                <text
                  key={`yt-${i}`}
                  x={plot.left - 10}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="end"
                >
                  {val}
                </text>
              );
            })}

            {/* Points (with invisible larger hit area for hover) */}
            {scatter.map((p, i) => {
              const cx = plot.left + (p.x / maxX) * plot.width;
              const cy = plot.bottom - (p.y / maxY) * plot.height;
              return (
                <g key={i}>
                  {/* visible dot */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={color(p.disp)}
                    stroke="#000"
                    strokeWidth={0.3}
                    opacity={0.95}
                  />
                  {/* larger transparent hit area */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={8}
                    fill="transparent"
                    onMouseEnter={(e) => {
                      setTooltip({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        content: `Period: ${p.x}\nRadius: ${p.y}\nClass: ${p.disp}`,
                      });
                    }}
                    onMouseMove={(e) => {
                      setTooltip((t) => ({ ...t, x: e.clientX, y: e.clientY }));
                    }}
                    onMouseLeave={() =>
                      setTooltip({ visible: false, x: 0, y: 0, content: "" })
                    }
                    style={{ cursor: "pointer" }}
                    aria-label={`Point ${i} period ${p.x} radius ${p.y} ${p.disp}`}
                  />
                </g>
              );
            })}

            {/* axis labels */}
            <text
              x={plot.left + plot.width / 2}
              y={plot.bottom + 30}
              fill="#94a3b8"
              fontSize="12"
              textAnchor="middle"
            >
              Orbital Period (days)
            </text>
            <text
              x={plot.left - 30}
              y={plot.top + plot.height / 2}
              fill="#94a3b8"
              fontSize="12"
              textAnchor="middle"
              transform={`rotate(-90 ${plot.left - 30} ${
                plot.top + plot.height / 2
              })`}
            >
              Radius (R⊕)
            </text>
          </svg>

          {/* Tooltip (HTML) */}
          {tooltip.visible && (
            <div
              className="pointer-events-none z-50 absolute bg-black/80 text-white text-xs rounded px-2 py-1 whitespace-pre-line"
              style={{
                left: tooltip.x + 12,
                top: tooltip.y + 12,
                transform: "translate(-50%, 0)",
                minWidth: 120,
              }}
            >
              {tooltip.content}
            </div>
          )}
        </div>
      </div>
    );
  };

  // -----------------------------
  // Histogram Chart (improved)
  // -----------------------------
  const HistogramChart: React.FC = () => {
    const periods = useMemo(() => {
      const vals =
        data?.rows
          ?.map((r) => parseFloat(r.period ?? ""))
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

    // dynamic bin count (sqrt rule gives reasonable bins for small datasets)
    const bins = Math.max(5, Math.round(Math.sqrt(periods.length)));
    const min = periods[0];
    const max = periods[periods.length - 1];
    const width = (max - min) / bins || 1;
    const histogram = Array(bins).fill(0);
    periods.forEach((v) => {
      const i = Math.min(bins - 1, Math.floor((v - min) / width));
      histogram[i]++;
    });
    const maxCount = Math.max(...histogram, 1);

    // tooltip state for bars
    const [tooltip, setTooltip] = useState<TooltipState>({
      visible: false,
      x: 0,
      y: 0,
      content: "",
    });

    // plot dims
    const plot = { left: 40, top: 30, width: 320, height: 180, bottom: 210 };

    return (
      <div className="bg-slate-800/50 rounded-lg p-6 border border-slate-700/50">
        <div className="flex items-start justify-between">
          <h4 className="text-lg font-semibold text-white mb-3 flex items-center space-x-2">
            <BarChart className="w-5 h-5 text-purple-400" />
            <span>Orbital Period Distribution</span>
          </h4>

          {/* Legend showing scale */}
          <div className="text-sm text-slate-300 mt-1">
            <div>Bins: {bins}</div>
            <div>
              Range: {min}–{max}
            </div>
            <div>Max count: {maxCount}</div>
          </div>
        </div>

        <div className="relative h-64 bg-slate-900/40 rounded-lg overflow-hidden">
          <svg
            className="w-full h-full"
            viewBox="0 0 400 250"
            role="img"
            aria-label="Histogram of orbital periods"
          >
            {/* grid */}
            {[...Array(5)].map((_, i) => {
              const y = plot.bottom - (i * plot.height) / 4;
              return (
                <line
                  key={`hgrid-${i}`}
                  x1={plot.left}
                  x2={plot.left + plot.width}
                  y1={y}
                  y2={y}
                  stroke="#64748b"
                  strokeDasharray="2,2"
                />
              );
            })}
            {[...Array(5)].map((_, i) => {
              const x = plot.left + (i * plot.width) / 4;
              return (
                <line
                  key={`vgrid-${i}`}
                  x1={x}
                  x2={x}
                  y1={plot.top}
                  y2={plot.bottom}
                  stroke="#64748b"
                  strokeDasharray="2,2"
                />
              );
            })}

            {/* axes */}
            <line
              x1={plot.left}
              y1={plot.bottom}
              x2={plot.left + plot.width}
              y2={plot.bottom}
              stroke="#475569"
              strokeWidth={1.2}
            />
            <line
              x1={plot.left}
              y1={plot.bottom}
              x2={plot.left}
              y2={plot.top}
              stroke="#475569"
              strokeWidth={1.2}
            />

            {/* x ticks */}
            {[0, 1, 2, 3, 4].map((i) => {
              const val = Math.round((min + (i * (max - min)) / 4) * 10) / 10;
              const x = plot.left + (i * plot.width) / 4;
              return (
                <text
                  key={`xt-${i}`}
                  x={x}
                  y={plot.bottom + 14}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {val}
                </text>
              );
            })}

            {/* bars */}
            {histogram.map((count, i) => {
              const x = plot.left + i * (plot.width / bins);
              const barW = plot.width / bins - 2;
              const height = (count / maxCount) * plot.height;
              const y = plot.bottom - height;
              const binMin = +(min + i * width).toFixed(3);
              const binMax = +(min + (i + 1) * width).toFixed(3);
              // color gradient based on count
              const alpha = 0.4 + 0.6 * (count / maxCount);
              return (
                <g key={i}>
                  <rect
                    x={x}
                    y={y}
                    width={barW}
                    height={height}
                    fill={`rgba(167,139,250,${alpha})`}
                    stroke="#7c3aed"
                    strokeWidth={0.4}
                    opacity={0.95}
                    onMouseEnter={(e) =>
                      setTooltip({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        content: `Range: ${binMin}–${binMax}\nCount: ${count}`,
                      })
                    }
                    onMouseMove={(e) =>
                      setTooltip((t) => ({ ...t, x: e.clientX, y: e.clientY }))
                    }
                    onMouseLeave={() =>
                      setTooltip({ visible: false, x: 0, y: 0, content: "" })
                    }
                    style={{ cursor: "pointer" }}
                  />
                </g>
              );
            })}

            {/* y tick labels */}
            {[0, 1, 2, 3, 4].map((i) => {
              const val = Math.round((maxCount * i) / 4);
              const y = plot.bottom - (i * plot.height) / 4;
              return (
                <text
                  key={`yt-${i}`}
                  x={plot.left - 10}
                  y={y + 4}
                  fill="#94a3b8"
                  fontSize="10"
                  textAnchor="end"
                >
                  {val}
                </text>
              );
            })}

            {/* axis labels */}
            <text
              x={plot.left + plot.width / 2}
              y={plot.bottom + 30}
              fill="#94a3b8"
              fontSize="12"
              textAnchor="middle"
            >
              Orbital Period (days)
            </text>
            <text
              x={plot.left - 30}
              y={plot.top + plot.height / 2}
              fill="#94a3b8"
              fontSize="12"
              textAnchor="middle"
              transform={`rotate(-90 ${plot.left - 30} ${
                plot.top + plot.height / 2
              })`}
            >
              Count
            </text>
          </svg>

          {/* Tooltip (HTML) */}
          {tooltip.visible && (
            <div
              className="pointer-events-none z-50 absolute bg-black/80 text-white text-xs rounded px-2 py-1 whitespace-pre-line"
              style={{
                left: tooltip.x + 12,
                top: tooltip.y + 12,
                transform: "translate(-50%, 0)",
                minWidth: 120,
              }}
            >
              {tooltip.content}
            </div>
          )}
        </div>
      </div>
    );
  };

  // -----------------------------
  // OverviewPanel (unchanged aside from minor spacing)
  // -----------------------------
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
          <svg
            className="w-40 h-40 mx-auto"
            viewBox="0 0 36 36"
            role="img"
            aria-label="Classification distribution"
          >
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
