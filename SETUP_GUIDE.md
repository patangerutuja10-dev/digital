# Digital Library Workflow System — Setup Guide

This project contains a React/Vite frontend, an Express/Prisma API, PostgreSQL database, and a Python AI similarity service.

## Important: GitHub Pages limitation
GitHub Pages can host only the static frontend. It does **not** run this project's Express API, PostgreSQL database, or Python AI service. If you open the frontend on GitHub Pages without deploying the backend separately, login and database-backed pages will not work. The frontend currently defaults to `http://localhost:4000`, which only works on the computer running the project.

## Run locally on Windows

### 1. Install the prerequisites
- Node.js LTS (includes npm)
- Docker Desktop (start Docker Desktop before continuing)
- Python 3.10+ (for the AI service)

### 2. Start PostgreSQL
Open a terminal in the `project` folder and run:
```bash
docker compose up -d postgres
```

### 3. Configure and start the API
Open a terminal in `project/apps/api`:
```bash
npm install
```
Copy `.env.example` to `.env`. The defaults match the included Docker PostgreSQL service for local development.
Then run:
```bash
npx prisma generate
npx prisma db push
npm run seed
npm run dev
```
Keep this terminal open. The API should run at `http://localhost:4000`.

### 4. Start the AI similarity service
Open another terminal in `project/apps/ai`:
```bash
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
Keep this terminal open. If the `uvicorn` command is not found, install the requirements again and check that Python is on PATH.

### 5. Start the website
Open another terminal in `project/apps/web`:
```bash
npm install
```
Copy `.env.example` to `.env` (the default API URL is correct for local development), then run:
```bash
npm run dev
```
Open the local URL printed by Vite, normally `http://localhost:5173`.

## Demo login
The login screen lists the demo accounts. The seeded demo password is `Demo@123` for all listed demo users. These are demo accounts, not real college accounts.

## Common issues
- **Login fails / Failed to fetch:** confirm the API terminal is running on port 4000, PostgreSQL is running, and the web `.env` contains `VITE_API_URL=http://localhost:4000`.
- **Database connection error:** confirm Docker Desktop is running and `docker compose up -d postgres` completed.
- **No data appears:** run `npm run seed` in `project/apps/api` after the database schema has been created.
- **AI duplicate/similarity check fails:** start the Python AI service on port 8000 and check the API `.env` `AI_SERVICE_URL=http://localhost:8000`.
- **For a public GitHub URL:** deploy the frontend to a static host and deploy the API, database, and AI service separately. Set `VITE_API_URL` to the public API URL and configure the API's `CORS_ORIGIN` to the public frontend URL. Do not publish real passwords or production secrets in GitHub.
