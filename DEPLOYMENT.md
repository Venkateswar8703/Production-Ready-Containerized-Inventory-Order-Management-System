# Deployment Guide - StockFlow Inventory & Order Management System

This guide outlines the process to deploy the full-stack containerized system online using free hosting platforms.

---

## 1. Prerequisites
- A GitHub account.
- A [Docker Hub](https://hub.docker.com/) account.
- A [Render](https://render.com/) or [Railway](https://railway.app/) account (for backend & PostgreSQL).
- A [Vercel](https://vercel.com/) or [Netlify](https://netlify.com/) account (for frontend).

---

## 2. Step 1: Version Control (Git Setup)
Initialize a Git repository and commit your files:
```bash
git init
git add .
git commit -m "feat: initial commit of StockFlow containerized system"
```
Create a new repository on GitHub and push your code:
```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/inventory-order-system.git
git branch -M main
git push -u origin main
```

---

## 3. Step 2: Upload Backend Image to Docker Hub
Build and push the backend image to Docker Hub so it is publicly accessible:

1. **Log in to Docker CLI**:
   ```bash
   docker login
   ```
2. **Build the Backend Image**:
   Navigate to the `backend/` directory and run:
   ```bash
   docker build -t YOUR_DOCKERHUB_USERNAME/stockflow-backend:latest .
   ```
3. **Push to Docker Hub**:
   ```bash
   docker push YOUR_DOCKERHUB_USERNAME/stockflow-backend:latest
   ```

---

## 4. Step 3: Deploy PostgreSQL & Backend API (Render)

Render is excellent for hosting both the PostgreSQL database and Web Services.

### A. Deploy PostgreSQL Database
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New > PostgreSQL**.
2. Set the following:
   - **Name**: `stockflow-db`
   - **Database**: `inventory_db`
   - **User**: `postgres`
3. Click **Create Database**.
4. Once active, copy the **Internal Database URL** (for Render services) and **External Database URL** (for external access).

### B. Deploy Backend Web Service
1. Click **New > Web Service**.
2. Select **Build and deploy from a Git repository** and link your GitHub repo.
3. Configure the following:
   - **Name**: `stockflow-backend`
   - **Root Directory**: `backend` (Important: points to backend code)
   - **Runtime**: `Python`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add the following **Environment Variables**:
   - `DATABASE_URL`: *[Paste your PostgreSQL Internal Connection String here]*
5. Click **Deploy Web Service**.
6. Copy the generated Web Service URL (e.g., `https://stockflow-backend.onrender.com`).

---

## 5. Step 4: Deploy Frontend (Vercel)

Vercel provides blazing-fast CDN hosting for React (Vite) applications.

1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New > Project**.
2. Import your GitHub repository.
3. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend` (Important: points to frontend folder)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - Key: `VITE_API_URL`
   - Value: `https://stockflow-backend.onrender.com` (Your deployed Render backend URL)
5. Click **Deploy**.
6. Once deployed, you will get a live public link (e.g., `https://stockflow-frontend.vercel.app`).

---

## 6. How to Run Locally using Docker Compose
For local execution, the system is fully configured to start with a single command:
```bash
docker compose up --build
```
- **Frontend SPA**: `http://localhost`
- **Backend Swagger Docs**: `http://localhost:8000/docs`
- **PostgreSQL Database**: `localhost:5432`
