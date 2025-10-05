import React from "react";
import { Loader2 } from "lucide-react";

const LoadingSpinner: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-y border-purple-500/20">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          <span className="text-slate-300">Processing exoplanet data...</span>
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
            <div
              className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
              style={{ animationDelay: "0.1s" }}
            ></div>
            <div
              className="w-2 h-2 bg-green-400 rounded-full animate-pulse"
              style={{ animationDelay: "0.2s" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
