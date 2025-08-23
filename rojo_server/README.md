# ROJO - backend (server.zip)

## What is included
- `server.js` : Express backend with endpoints:
  - `POST /create-charge`  -> create Coinbase Commerce charge
  - `POST /ai-suggest`     -> proxy to generative AI (Gemini/OpenAI)
  - `POST /coinbase-webhook` -> webhook verifier and DB updater
- `package.json`
- `Dockerfile`
- `.env.example`

## Quick start (local)
1. Copy `.env.example` to `.env` and fill your keys.
2. `npm install`
3. `node server.js` or `npm start`
4. Open `http://localhost:3000` for static files (if you place your frontend in `public/`)

## Notes
- Make sure to set `FRONTEND_ORIGIN` to your real frontend domain for CORS.
- Configure the Coinbase webhook URL in your Coinbase Commerce dashboard to point to `https://your-backend.com/coinbase-webhook` and copy the shared secret into `.env`.
- This is a minimal starter for demo and MVP use. Harden for production (rate-limiting, auth, logging, monitoring, backups).