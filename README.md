# ROJO Ecosystem

<p align="center">
  <img src="ROJO_Ecosystem/assets/ROJO.png" alt="ROJO" width="96" />
</p>

<p align="center">
  <a href="https://rojo-ecosystem-production.up.railway.app/frontend/dashboard.html"><img alt="Live" src="https://img.shields.io/badge/Live-Dashboard-red" /></a>
  <img alt="Node" src="https://img.shields.io/badge/Node-%E2%89%A518-brightgreen" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-informational" />
</p>

Premium, security‑first Web3 wallet experience with a bold "RED desire" aesthetic. Built for trust and speed: Coinbase Onramp, biometric payments, policy engine, EIP‑712 inspector, consent management, theme toggle, and AI welcome.

## About
- Production demo: `https://rojo-ecosystem-production.up.railway.app/frontend/dashboard.html`
- Focus: enterprise‑grade UX, trust, and security; low‑cost AI welcome; Railway config‑as‑code.
- License: MIT (see `LICENSE`). Security guidelines in `SECURITY.md`.

## ✨ Highlights
- Premium Dashboard (light/dark) with animated crypto background
- Coinbase Onramp (fiat → crypto), purchase history stubs
- Magic Pay Link (one‑click payment link + QR, deep link: `#pay?amount=&asset=&to=`)
- Biometric flows (Passkeys/WebAuthn) for payment confirmation
- Policy Engine + EIP‑712 Typed Data Inspector (anti‑phishing)
- Consent Manager (GDPR/CCPA) + analytics gating (Amplitude/Bugsnag)
- Docs Search (Algolia, optional) and Support/Portal shortcut
- AI Welcome (OpenRouter/Groq/OpenAI compatible) with rate limit + cache
- MCP Server (demo) scaffold for future CDP tools
- Config‑as‑Code for Railway (`railway.json`), healthcheck and startCommand

## 🧭 Project Structure
```
backend/                 Express server, security APIs, AI welcome, MCP demo
frontend/                Dashboard (HTML/CSS/JS) and widgets
contracts/               Sample Solidity contracts (smart wallets)
ROJO_Ecosystem/          Docs/assets/contracts bundle
railway.json             Build/run/healthcheck (Config-as-code)
```

## 🚀 Quick Start (Local)
1) Install
```
npm install
```
2) Run
```
node backend/integration-server.js
```
3) Open
```
http://localhost:3002/frontend/dashboard.html
```

## ⚙️ Environment (safe defaults)
Create `.env` (never commit) using `env.example` as reference.

Core
```
PORT=3002
NODE_ENV=development
CORS_ORIGIN=http://localhost:3002
```
AI (ROJO Assist)
```
AI_PROVIDER=GROQ
AI_MODEL=llama-3.1-8b-instant
# Set exactly one key in your deployment platform (Railway):
# GROQ_API_KEY / OPENAI_API_KEY / OPENROUTER_API_KEY
AI_WELCOME_TTL_SECONDS=300
AI_DAILY_MAX_CALLS=500
AI_DAILY_WARN_AT=250
```
Notes
- If no API key is present, `/api/ai/welcome` replies a local, cost‑free message.
- MCP Server runs in demo unless real CDP keys are configured (not required).

## 🧩 Optional Integrations
Public (client‑side; guard with consent):
- Amplitude (page load event)
- Bugsnag (client errors)
- Algolia Docs Search (index: `cdp_docs`)
Configure via `window.ROJO_INTEGRATIONS` in `frontend/dashboard.html`.

## 🔗 Useful Endpoints
- Health: `GET /health`
- Ecosystem stats (mock): `GET /api/ecosystem/stats`
- Payments recent (mock): `GET /api/payments/recent`
- AI welcome: `POST /api/ai/welcome` `{ name?: string }`
- Policy/EIP‑712: `/api/policies*`, `/api/eip712*` (local demo)

## 🧠 AI Welcome – Providers
- GROQ (recommended low cost): `llama-3.1-8b-instant`
- OPENAI / OPENROUTER: `gpt-4o-mini` (default) or any compatible model

Cost controls
- Short responses (max_tokens ≈ 120)
- Cache per IP (TTL, default 5 min)
- Daily cap (`AI_DAILY_MAX_CALLS`) with server‑side warnings

## 🛡️ Security & Secrets
- `.env*` is git‑ignored; never commit secrets
- Configure secrets only in your platform (Railway → Variables)
- Push protection friendly: `env.example` contains placeholders only

## ☁️ Deploy to Railway
- Config‑as‑Code: `railway.json`
  - builder: Nixpacks
  - start: `node backend/integration-server.js`
  - healthcheck: `/health`
- Add Variables (minimum): `PORT`, `AI_PROVIDER`, `AI_MODEL`, chosen `*_API_KEY`
- Redeploy

## 🖥️ UI Tips
- Light/Dark toggle (navbar “Claro/Oscuro”)
- Magic Pay Link → creates QR/URL and deep‑links the payment modal
- Docs button → opens Algolia quick search modal

## 🧪 Testing Pointers
- AI: `curl -X POST http://localhost:3002/api/ai/welcome -H 'Content-Type: application/json' -d '{"name":"GM"}'`
- Deep link: `/frontend/dashboard.html#pay?amount=25&asset=ETH&to=0x...`

## 📜 License
This repository is provided as‑is for demo/contest purposes. Verify compliance for any external integration you enable.
