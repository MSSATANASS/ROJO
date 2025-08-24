# ROJO Ecosystem

<p align="center">
  <img src="ROJO_Ecosystem/assets/ROJO.png" alt="ROJO" width="96" />
</p>

<p align="center">
  <a href="https://rojo-ecosystem-production.up.railway.app/frontend/dashboard.html"><img alt="Live" src="https://img.shields.io/badge/Live-Dashboard-red" /></a>
  <img alt="Node" src="https://img.shields.io/badge/Node-%E2%89%A518-brightgreen" />
  <img alt="License" src="https://img.shields.io/badge/License-MIT-informational" />
</p>

**ROJO Ecosystem** is an enterprise-grade Web3 finance platform that revolutionizes how users interact with cryptocurrency through advanced security, biometric authentication, and AI-powered assistance. Built for trust, speed, and the bold "RED desire" aesthetic that inspires ambition and innovation.

## 🎯 **Why ROJO Ecosystem Was Created**

### 🔴 **Solving Critical Web3 Crises:**

1. **🛡️ Security Crisis**: 
   - Millions lost to phishing attacks and vulnerable smart contracts
   - Lack of enterprise-grade security tools for individual users
   - No "insurance" for blockchain transactions

2. **🔴 Usability Crisis**: 
   - Web3 is too complex for average users
   - Confusing interfaces and 10+ step processes
   - No intelligent guidance to navigate the ecosystem

3. **🔴 Trust Crisis**: 
   - Users can't verify if transactions are safe
   - Lack of transparency in blockchain operations
   - No safety net for Web3 operations

## 🌍 **How ROJO Helps the World**

### 🛡️ **Democratizing Enterprise Security:**
- **EIP-712 Inspector**: Anti-phishing protection (like antivirus for transactions)
- **Policy Engine**: Validates smart contracts before execution
- **Biometric Authentication**: Eliminates passwords, makes Web3 more secure than traditional banking

### 🧠 **AI Intelligence for Everyone:**
- **ROJO Assist**: AI that guides users like a personal expert
- **Rate Limiting**: Makes AI accessible and cost-effective
- **Caching**: Instant responses without additional costs

### 💎 **Premium Experience Accessible:**
- **Coinbase Onramp**: Buy crypto as easily as using a credit card
- **Magic Pay Links**: One-click payments (like PayPal but for Web3)
- **Smart Wallets**: Automatic recovery if you lose access

## 🚀 **Global Impact**

### 🌍 **For Individual Users:**
- **Security**: Enterprise protection at no additional cost
- **Simplicity**: Web3 as easy as using Instagram
- **Confidence**: Know exactly what you're signing

### 🏢 **For Businesses:**
- **Compliance**: Automatic GDPR/CCPA compliance
- **Audit Trail**: Complete transaction traceability
- **Scalability**: Infrastructure ready for millions of users

### 🌱 **For Web3 Ecosystem:**
- **Adoption**: More people can use Web3 safely
- **Innovation**: Open-source tools for developers
- **Standards**: New benchmarks for security and UX

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

## 👥 **How the Developer Community Can Help**

### 🔧 **Technical Contributions:**

1. **🛡️ Security:**
   - Smart contract audits
   - Vulnerability testing
   - Policy Engine improvements

2. **🤖 AI & Machine Learning:**
   - Better prompts for ROJO Assist
   - New fraud detection models
   - Rate limiting optimization

3. **🎨 Frontend/UX:**
   - New themes and designs
   - Accessibility improvements
   - Mobile optimization

4. **🔗 Integrations:**
   - New blockchains (Solana, Polygon)
   - More AI providers
   - Third-party APIs (exchanges, analytics)

### 📚 **Documentation & Education:**

1. **📖 Tutorials:**
   - Step-by-step user guides
   - Video explanations
   - Technical documentation

2. **🌍 Localization:**
   - Translations to other languages
   - Cultural adaptation
   - Regional support

### 🧪 **Testing & QA:**

1. **🔍 Testing:**
   - Usability testing
   - Security testing
   - Performance testing

2. **🐛 Bug Reports:**
   - Report found issues
   - Suggest improvements
   - User feedback

### 💡 **Ideas & Roadmap:**

1. **🚀 New Features:**
   - Feature proposals
   - Market analysis
   - Use case studies

2. **📊 Analytics:**
   - Usage metrics
   - Behavior analysis
   - Conversion optimization

## 🎯 **Community Roadmap:**

### 📋 **Immediate (This Week):**
1. **Railway deployment** ✅
2. **Production testing**
3. **Initial user feedback**

### 🚀 **Short Term (1-2 months):**
1. **Developer documentation**
2. **Public API for integrations**
3. **Bug bounty program**

### 🌟 **Medium Term (3-6 months):**
1. **SDK for developers**
2. **Plugin marketplace**
3. **Ambassador program**

## 📜 License
This repository is provided as‑is for demo/contest purposes. Verify compliance for any external integration you enable.

---

## 🔴 **ROJO Ecosystem is more than code:**

**It's a revolution in how people interact with Web3.** 

**We don't just build tools - we create trust, simplify complexity, and democratize enterprise security so that anyone, anywhere in the world, can use Web3 safely and easily.**

---

## 💝 **Support ROJO Ecosystem**

If you find ROJO Ecosystem valuable and want to support its development, consider making a donation:

**Ethereum Wallet:**
```
0x9FF67A89daDc097d810E2DC19a7a873D5D9A1AFa
```

**Your support helps us:**
- 🚀 Continue developing enterprise-grade security features
- 🤖 Improve AI assistant capabilities
- 🌍 Reach more users worldwide
- 🔒 Maintain and audit security infrastructure
- 📚 Create better documentation and tutorials

**Every contribution, no matter how small, helps democratize Web3 security for everyone.**
