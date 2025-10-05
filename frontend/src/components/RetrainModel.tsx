import React, { useState } from "react";
import { Dialog } from "@headlessui/react";
import { Settings, Loader2 } from "lucide-react";

interface RetrainModelProps {
  open: boolean;
  onClose: () => void;
}

const RetrainModel: React.FC<RetrainModelProps> = ({ open, onClose }) => {
  const [learningRate, setLearningRate] = useState(0.05);
  const [nEstimators, setNEstimators] = useState(500);
  const [maxDepth, setMaxDepth] = useState(6);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRetrain = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/retrain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          learning_rate: learningRate,
          n_estimators: nEstimators,
          max_depth: maxDepth,
          threshold: 0.6,
        }),
      });

      if (!response.ok) {
        throw new Error(`Retrain failed: ${response.statusText}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Retrain failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

      {/* Panel wrapper */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-slate-800 text-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-6">
          <div className="flex items-center space-x-2">
            <Settings className="w-6 h-6 text-purple-400" />
            <Dialog.Title className="text-xl font-bold">
              Retrain Model
            </Dialog.Title>
          </div>

          {/* Hyperparameter Controls */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1">
                Learning Rate: {learningRate}
              </label>
              <input
                type="range"
                min="0.01"
                max="0.3"
                step="0.01"
                value={learningRate}
                onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">
                n_estimators: {nEstimators}
              </label>
              <input
                type="number"
                min={100}
                max={2000}
                step={50}
                value={nEstimators}
                onChange={(e) => setNEstimators(parseInt(e.target.value))}
                className="w-full bg-slate-700 text-white rounded-md p-2"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">
                max_depth: {maxDepth}
              </label>
              <input
                type="number"
                min={2}
                max={15}
                value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                className="w-full bg-slate-700 text-white rounded-md p-2"
              />
            </div>
          </div>

          {/* Error / Results */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {result && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-sm">
              ✅ {result.message}
              <div className="mt-2 text-slate-300 text-xs">
                <p>
                  <strong>Params:</strong> {JSON.stringify(result.params)}
                </p>
                <p>
                  <strong>Classes:</strong> {result.classes.join(", ")}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleRetrain}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 flex items-center space-x-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? "Retraining..." : "Start Retrain"}</span>
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default RetrainModel;
