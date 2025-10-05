import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight
import xgboost as xgb
import joblib
import os

# ---------------------------------
# Feature mapping across datasets
# ---------------------------------
FEATURE_MAP = {
    "period": ["koi_period", "pl_orbper"],
    "duration": ["koi_duration", "pl_trandurh"],
    "depth": ["koi_depth", "pl_trandep"],
    "radius": ["koi_prad", "pl_rade"],
    "teq": ["koi_teq", "pl_eqt"],
    "insol": ["koi_insol", "pl_insol"],
    "snr": ["koi_model_snr"],  # KOI only
    "stellar_temp": ["koi_steff", "st_teff"],
    "stellar_radius": ["koi_srad", "st_rad"],
}

# Labels per dataset
DISPOSITION_COLS = {
    "kepler": "koi_disposition",
    "tess": "tfopwg_disp",
    "k2": "disposition"
}

# Unified labels
LABEL_NORMALIZATION = {
    "CONFIRMED": "CONFIRMED",
    "CANDIDATE": "CANDIDATE",
    "FALSE POSITIVE": "FALSE POSITIVE",
    "CP": "CONFIRMED",    # TESS
    "KP": "CONFIRMED",
    "PC": "CANDIDATE",
    "FP": "FALSE POSITIVE"
}

# ---------------------------------
# 1. Raw dataset loading
# ---------------------------------
def load_raw_dataset(path: str) -> pd.DataFrame:
    """Load CSV or Excel as-is, without feature mapping."""
    ext = os.path.splitext(path)[1].lower()
    try:
        if ext in [".xlsx", ".xls"]:   # ✅ handle both
            df = pd.read_excel(path, engine="openpyxl")
        else:
            try:
                df = pd.read_csv(
                    path,
                    comment="#",
                    low_memory=False,
                    on_bad_lines="skip",
                    encoding="utf-8"
                )
            except UnicodeDecodeError:
                df = pd.read_csv(
                    path,
                    comment="#",
                    low_memory=False,
                    on_bad_lines="skip",
                    encoding="latin1"
                )
    except Exception as e:
        raise ValueError(f"Failed to read dataset: {e}")

    # Replace problematic values
    df = df.replace([pd.NA, np.nan, np.inf, -np.inf], None)
    return df

# ---------------------------------
# 2. Feature extraction for ML
# ---------------------------------
def load_features(df: pd.DataFrame, mission="kepler"):
    """Map raw columns to ML features and extract labels if available."""
    feature_dict = {}
    for unified, options in FEATURE_MAP.items():
        for opt in options:
            if opt in df.columns:
                feature_dict[unified] = df[opt]
                break
        if unified not in feature_dict:
            feature_dict[unified] = pd.Series([np.nan] * len(df))

    X = pd.DataFrame(feature_dict)

    disposition_col = DISPOSITION_COLS.get(mission)
    if disposition_col and disposition_col in df.columns:
        y = df[disposition_col].fillna("UNKNOWN")
        y = y.map(LABEL_NORMALIZATION).fillna("UNKNOWN")  # normalize NASA/TESS/K2 labels
        return X, y
    else:
        return X, None

# ---------------------------------
# 3. Build ML pipeline
# ---------------------------------
def build_model():
    model = xgb.XGBClassifier(
        objective="multi:softprob",  # ✅ outputs probabilities
        eval_metric="mlogloss",
        n_estimators=500,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        tree_method="hist"
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", model)
    ])
    return pipeline

# ---------------------------------
# 4. Unified training across missions
# ---------------------------------
def train_unified(datasets):
    X_all, y_all = [], []
    for path, mission in datasets:
        df = load_raw_dataset(path)
        X, y = load_features(df, mission)
        if y is not None:
            # Fill only numeric columns with median
            X_numeric = X.select_dtypes(include=[np.number])
            X[X_numeric.columns] = X_numeric.fillna(X_numeric.median())
            X_all.append(X)
            y_all.append(y)

    X_full = pd.concat(X_all, ignore_index=True)
    y_full = pd.concat(y_all, ignore_index=True)

    # Filter out UNKNOWN before encoding
    mask = y_full != "UNKNOWN"
    X_full = X_full[mask]
    y_full = y_full[mask]

    le = LabelEncoder()
    y_encoded = le.fit_transform(y_full)

    X_train, X_test, y_train, y_test = train_test_split(
        X_full, y_encoded, test_size=0.2, stratify=y_encoded, random_state=42
    )

    classes = np.unique(y_train)
    weights = compute_class_weight("balanced", classes=classes, y=y_train)
    sample_weights = np.array([weights[label] for label in y_train])

    pipeline = build_model()
    pipeline.fit(X_train, y_train, model__sample_weight=sample_weights)

    # Evaluate (only on true scientific labels)
    y_pred = pipeline.predict(X_test)
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # --- Custom prediction function with UNKNOWN threshold ---
    def predict_with_unknown(pipeline, encoder, X, threshold=0.6):
        probs = pipeline.predict_proba(X)
        preds = []
        for p in probs:
            max_idx = np.argmax(p)
            max_prob = p[max_idx]
            if max_prob < threshold:
                preds.append("UNKNOWN")
            else:
                preds.append(encoder.classes_[max_idx])
        return preds, probs

    # Example usage
    sample_pred, sample_probs = predict_with_unknown(pipeline, le, X_test[:5])
    print("Predictions with UNKNOWN threshold:", sample_pred)

    print("=== Confusion Matrix ===")
    print(confusion_matrix(y_test, y_pred))

    # Save model and encoder
    joblib.dump(pipeline, "exoplanet_model.pkl")
    joblib.dump(le, "label_encoder.pkl")

    return pipeline, le

# ---------------------------------
# 5. Helper for predictions with thresholds
# ---------------------------------
def classify_with_confidence(model, encoder, X, threshold=0.6):
    """Return class + confidence, only accept if prob >= threshold else 'UNKNOWN'."""
    probs = model.predict_proba(X)
    best_idx = probs.argmax(axis=1)
    best_conf = probs.max(axis=1)

    preds = []
    for idx, conf in zip(best_idx, best_conf):
        if conf >= threshold:
            preds.append((encoder.inverse_transform([idx])[0], float(conf)))
        else:
            preds.append(("UNKNOWN", float(conf)))
    return preds

# ---------------------------------
# Example Usage
# ---------------------------------
if __name__ == "__main__":
    datasets = [
        ("../data/KeplerObjectsInterest.csv", "kepler"),
        ("../data/TessObjectsOfInterest.csv", "tess"),
        ("../data/K2PlanetsAndCandidates.csv", "k2"),
    ]
    model, encoder = train_unified(datasets)

    # Example: classify new data
    test_df = pd.DataFrame({
        "period": [10.5],
        "duration": [3.2],
        "depth": [250.0],
        "radius": [1.2],
        "teq": [500],
        "insol": [120],
        "snr": [12.5],
        "stellar_temp": [5700],
        "stellar_radius": [1.0],
    })
    results = classify_with_confidence(model, encoder, test_df, threshold=0.7)
    print("Prediction with confidence:", results)
