# Deployment Guide (Railway.com) - Unified Service

This project is now configured as a **single, unified service** where the Node.js backend serves the compiled React frontend.

## 1. Railway.com Deployment
- Create a **single service** from your GitHub repo.
- Set **Root Directory** to `.` (the root of the project).
- **Railway will automatically**:
    1. Run `npm install` (root).
    2. Run `npm run postinstall` (which installs server dependencies).
    3. Run `npm run build` (to build the frontend into `/dist`).
    4. Run `npm start` (to start the server).

## 2. Environment Variables
- `PORT`: (Managed by Railway).
- `VITE_SOCKET_URL`: (Optional) Leave empty to automatically use the current window location in production.

---

## Local Development
- **Dev Mode**:
    - Backend: `cd server && npm run dev` (port 3002)
    - Frontend: `npm run dev` (port 3001)
- **Production Simulation**:
    1. `npm run build` (root)
    2. `npm start` (root)
    3. Access the app on the server's port (3002).
