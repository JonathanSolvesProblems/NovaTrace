from fastapi import FastAPI, UploadFile, File, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import pandas as pd
import numpy as np
import joblib
import tempfile
import shutil
import os
from exoplanet_pipeline import load_raw_dataset, load_features
from pydantic import BaseModel


app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load saved model + encoder
model = joblib.load("exoplanet_model.pkl")
encoder = joblib.load("label_encoder.pkl")


# -------------------------------
# Helper: Make DataFrame JSON-safe
# -------------------------------
def make_json_safe(df: pd.DataFrame):
    """
    Convert DataFrame to fully JSON-safe format:
    - Replace NaN / inf / -inf with None
    - Convert numpy numeric types to native Python float/int
    - Convert bytes → str
    """
    df_safe = df.copy()

    # Replace infinities with NaN
    df_safe = df_safe.mask(df_safe.isin([np.inf, -np.inf]))

    # Convert DataFrame to list of dicts
    records = df_safe.to_dict(orient="records")

    safe_records = []
    for row in records:
        safe_row = {}
        for k, v in row.items():
            if pd.isna(v):  # catches np.nan, None, NaT
                safe_row[k] = None
            elif isinstance(v, (np.integer, np.int64)):
                safe_row[k] = int(v)
            elif isinstance(v, (np.floating, np.float64)):
                safe_row[k] = float(v)
            elif isinstance(v, (bytes, bytearray)):
                safe_row[k] = v.decode("utf-8", errors="ignore")
            else:
                safe_row[k] = v
        safe_records.append(safe_row)

    return safe_records


# -------------------------------
# Upload endpoint
# -------------------------------
@app.post("/upload")
async def upload(
    file: UploadFile = File(...),
    mission: str = Query("kepler"),
    preview: bool = Query(True)
):
    # Save uploaded file temporarily
    suffix = os.path.splitext(file.filename)[1].lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        file.file.seek(0)
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        df = load_raw_dataset(tmp_path)
    except Exception as e:
        os.remove(tmp_path)
        return JSONResponse({"error": f"Failed to read file: {e}"}, status_code=400)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    # -------------------------------
    # Preview branch
    # -------------------------------
    if preview:
        df_preview = df.dropna(how="all").dropna(axis=1, how="all")
        rows_safe = make_json_safe(df_preview)
        return JSONResponse(
            {"columns": df_preview.columns.tolist(), "rows": rows_safe},
            status_code=200
        )

    # -------------------------------
    # ML prediction branch
    # -------------------------------
    X, _ = load_features(df, mission)

    # Fill numeric NaNs with median
    X_numeric = X.select_dtypes(include=[np.number])
    X[X_numeric.columns] = X_numeric.fillna(X_numeric.median())

    # Predictions + probabilities
    preds = model.predict(X)
    probs = model.predict_proba(X)  # shape (n_samples, n_classes)
    preds_decoded = encoder.inverse_transform(preds)

    # Confidence = probability of predicted class
    confidences = []
    for i, pred_class in enumerate(preds):
        conf = float(probs[i, pred_class])  # safe Python float
        confidences.append(conf)

    # Combine results
    results = X.copy()

    # Keep useful identifiers from original dataframe if available
    for id_col in ["kepoi_name", "id", "rowid"]:
        if id_col in df.columns and id_col not in results.columns:
            results[id_col] = df[id_col]

    results["Predicted_Disposition"] = [d.upper() for d in preds_decoded]
    print('results :', results.shape)
    print('results :', results.columns)
    results["Confidence"] = confidences

    # Make results JSON-safe
    rows_safe = make_json_safe(results)

    return JSONResponse(
        {"columns": results.columns.tolist(), "rows": rows_safe},
        status_code=200
    )

# -------------------------------
# Retrain model endpoint
# -------------------------------
class RetrainRequest(BaseModel):
    learning_rate: float = 0.05
    n_estimators: int = 500
    max_depth: int = 6
    threshold: float = 0.6
    
@app.post("/retrain")
async def retrain(params: RetrainRequest):
    try:
        # unpack
        learning_rate = params.learning_rate
        n_estimators = params.n_estimators
        max_depth = params.max_depth
        threshold = params.threshold

        # Load training datasets
        datasets = [
            ("../data/KeplerObjectsInterest.csv", "kepler"),
            ("../data/TessObjectsOfInterest.csv", "tess"),
            ("../data/K2PlanetsAndCandidates.csv", "k2"),
        ]

        # 🔧 Patch hyperparams dynamically
        def build_model_custom():
            model = xgb.XGBClassifier(
                objective="multi:softprob",
                eval_metric="mlogloss",
                n_estimators=n_estimators,
                max_depth=max_depth,
                learning_rate=learning_rate,
                subsample=0.8,
                colsample_bytree=0.8,
                tree_method="hist"
            )
            return Pipeline([("scaler", StandardScaler()), ("model", model)])

        global build_model
        old_build_model = build_model
        build_model = build_model_custom

        pipeline, le = train_unified(datasets)

        build_model = old_build_model  # restore

        return JSONResponse({
            "message": "Model retrained successfully",
            "params": params.dict(),
            "classes": list(le.classes_)
        })

    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
