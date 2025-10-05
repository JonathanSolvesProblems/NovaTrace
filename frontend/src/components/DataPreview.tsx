import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";

interface DataPreviewProps {
  data: {
    columns: string[];
    rows: Record<string, any>[];
  };
}

const DataPreview: React.FC<DataPreviewProps> = ({ data }) => {
  // 🚧 check first
  if (!data || !data.rows || !data.columns) {
    return (
      <div className="text-slate-400 p-6">No data available to preview.</div>
    );
  }

  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const rowsPerPage = 10;

  // ✅ Now safe, because data.rows is guaranteed
  const filteredAndSortedRows = useMemo(() => {
    let filtered = data.rows.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    if (sortColumn) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data.rows, searchTerm, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedRows.length / rowsPerPage);
  const startIndex = currentPage * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentRows = filteredAndSortedRows.slice(startIndex, endIndex);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Data Preview</h2>
          <p className="text-slate-400">
            Showing {currentRows.length} of {filteredAndSortedRows.length}{" "}
            records
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
              className="pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
            />
          </div>
          <Filter className="w-5 h-5 text-slate-400" />
        </div>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto max-w-full border border-slate-700/40 rounded-lg scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          <table className="min-w-max w-full border-collapse">
            <thead className="bg-slate-700/60 sticky top-0 z-10">
              <tr>
                {data.columns.map((column) => (
                  <th
                    key={column}
                    className="px-6 py-4 text-left text-sm font-semibold text-slate-300 cursor-pointer hover:text-white transition-colors whitespace-nowrap"
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center space-x-2">
                      <span>{column}</span>
                      {sortColumn === column && (
                        <span className="text-purple-400">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {currentRows.map((row, index) => (
                <tr
                  key={index}
                  className="hover:bg-slate-700/30 transition-colors"
                >
                  {data.columns.map((column) => (
                    <td
                      key={column}
                      className="px-6 py-4 text-sm text-slate-300 whitespace-nowrap"
                    >
                      <div className="max-w-40 truncate">
                        {typeof row[column] === "number"
                          ? (row[column] as number).toFixed(4)
                          : String(row[column] ?? "—")}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-slate-700/30 px-6 py-4 flex items-center justify-between border-t border-slate-700/30">
          <div className="text-sm text-slate-400">
            Page {currentPage + 1} of {totalPages}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="flex items-center space-x-1 px-3 py-2 bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
              }
              disabled={currentPage >= totalPages - 1}
              className="flex items-center space-x-1 px-3 py-2 bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-500 transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-700/30 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-2">
            Total Records
          </h4>
          <p className="text-3xl font-bold text-purple-400">
            {data.rows.length}
          </p>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-2">Columns</h4>
          <p className="text-3xl font-bold text-blue-400">
            {data.columns.length}
          </p>
        </div>

        <div className="bg-slate-700/30 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-2">
            Filtered Results
          </h4>
          <p className="text-3xl font-bold text-green-400">
            {filteredAndSortedRows.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataPreview;
