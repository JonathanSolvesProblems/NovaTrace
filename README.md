# NovaTrace

NovaTrace is a web application for detecting and classifying exoplanets using a machine learning model trained on NASA datasets. Users can upload their own data, explore predictions, retrain the model, and visualize planetary systems in 3D.

---

## Table of Contents

- [Project Setup](#project-setup)
- [Backend](#backend)
- [Frontend](#frontend)
- [Frontend Tabs](#frontend-tabs)
  - [Upload](#upload)
  - [Classification](#classification)
  - [Data Preview](#data-preview)
  - [3D System Visualization](#3d-system-visualization)
  - [Data Exploration](#data-exploration)

---

## Project Setup

1. Clone the repository.
2. Navigate to the `backend` folder and set up the backend server.
3. Navigate to the `frontend` folder and set up the frontend application.

## Backend

The backend handles communication with the machine learning model. The model is trained on the following NASA datasets:

- **Kepler Objects of Interest (KOI)**: [Link](https://exoplanetarchive.ipac.caltech.edu/cgi-bin/TblView/nph-tblView?app=ExoTbls&config=cumulative)
- **TESS Objects of Interest (TOI)**: [Link](https://exoplanetarchive.ipac.caltech.edu/cgi-bin/TblView/nph-tblView?app=ExoTbls&config=TOI)
- **K2 Planets and Candidates**: [Link](https://exoplanetarchive.ipac.caltech.edu/cgi-bin/TblView/nph-tblView?app=ExoTbls&config=k2pandc)

### Steps to run backend locally:

```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn server:app --reload --port 8000
```

The backend will start at http://localhost:8000 and handle requests from the frontend.

## Frontend

The frontend provides a user interface for uploading data, viewing classifications, visualizing systems, and exploring the dataset.

Steps to run frontend locally:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at http://localhost:5173 (or the port displayed in the console).

## Frontend Tabs

## Upload

The Upload tab is the home page where users can upload Excel files containing exoplanet candidate data. Uploaded data is processed and sent to the model for classification.

**Optional**: The Retrain Model tab allows users to retrain the machine learning model using their uploaded data. Hyperparameters can be adjusted, though this step is optional. Retraining helps the model adapt to new datasets.

## Classification

The **Classification** tab displays the model's predictions. Example:

**Classification Results**

- **CONFIRMED**: High confidence exoplanet detections (50%)
- **CANDIDATE**: Potential exoplanets requiring verification (50%)
- **FALSE POSITIVE**: Non-planetary signals (0%)

**CONFIRMED Objects**

| Object ID | Period (days) | Radius (R⊕) | Stellar Temp (K) | Classification | Confidence |
| --------- | ------------- | ----------- | ---------------- | -------------- | ---------- |
| Object-1  | —             | —           | —                | CONFIRMED      | 62%        |
| Object-2  | —             | —           | —                | CONFIRMED      | 71%        |

---

## Data Preview

The **Data Preview** tab shows uploaded data in a table with search functionality.

**Example Columns:**

- `koi_period`
- `koi_duration`
- `koi_depth`
- `koi_prad`
- `koi_teq`
- `koi_insol`
- `koi_model_snr`
- `koi_steff`
- `koi_srad`
- `koi_disposition`

Users can search and filter data to inspect individual records.

---

## 3D System Visualization

The **3D System Visualization** tab provides an interactive 3D view of detected exoplanets:

- 🖱️ Drag to rotate
- 🔍 Scroll to zoom
- ⚡ Real-time orbital motion

Displays detected planets, host star type, system architecture, orbital dynamics, discovery method, and habitability status.

---

## Data Exploration

The **Data Exploration** tab provides visual analysis of model predictions and astrophysical features:

- **Overview**
- **Scatter Plots**
- **Histograms**

**Classification Distribution:**

- 2 Candidates
- 2 Confirmed

**Key Insights:**

- 2 classification categories detected
- Typical exoplanet radii cluster around median values
- Stellar temperatures range across the dataset
- Explore scatter plots to see clustering by orbital period and planet radius
