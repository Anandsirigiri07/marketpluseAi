@echo off
echo Starting MarketPulse AI (Server on :5000, Frontend on :5173)...
start cmd /k "cd server && node index.js"
start cmd /k "cd client && npm run dev"
timeout /t 3 >nul
start http://localhost:5173/
