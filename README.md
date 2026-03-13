# Customer Churn System (FastAPI + React)

## Username: admin || Password: admin123
This repo contains a minimal end-to-end churn prediction system derived from the logic in `FinalProject_Group6.ipynb`.

## Backend

1. Train and save model artifacts:
   - Place `WA_Fn-UseC_-Telco-Customer-Churn.csv` under `backend/data/`
   - Run:
     - `python backend/train/train_model.py --csv backend/data/WA_Fn-UseC_-Telco-Customer-Churn.csv`
2. Start the API:
   - `uvicorn backend.app.main:app --reload`
3. Health check:
   - `GET http://localhost:8000/health`
4. Predict:
   - `POST http://localhost:8000/api/v1/predict`

## Frontend

1. Install dependencies:
   - `npm install`
2. Start UI:
   - `npm run dev`
3. Configure API base:
   - `VITE_API_BASE_URL=http://localhost:8000` (default)
