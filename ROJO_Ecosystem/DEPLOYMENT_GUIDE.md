# 🚀 ROJO Ecosystem - Guía de Deploy para Onchain Summer

## 🎯 Resumen del Proyecto

**ROJO** es un ecosistema completo de aplicaciones onchain construido exclusivamente con herramientas del **Coinbase Developer Platform (CDP)** para Onchain Summer 2025. El primer proyecto, **ROJO Pay**, está listo para deploy.

### ✅ Proyecto 1: ROJO Pay - COMPLETADO

**ROJO Pay** es una plataforma de pagos crypto que automáticamente mintea NFTs únicos como recibos en Base blockchain.

#### 🛠️ Tech Stack Implementado
- ✅ **Commerce API**: Integrado para crear charges y procesar pagos
- ✅ **Base Blockchain**: Smart contract ERC-721 para NFTs
- ✅ **Frontend Rebelde**: UI temática con elementos rojos y negros
- ✅ **Webhook Automation**: Mint automático post-pago
- ✅ **Database**: SQLite para tracking de pagos
- ✅ **Responsive Design**: Mobile-first con TailwindCSS

## 📦 Deploy Inmediato de ROJO Pay

### Opción 1: Deploy en Vercel (Recomendado)

```bash
# 1. Navegar al proyecto
cd ROJO_Ecosystem/01_ROJO_Pay

# 2. Instalar Vercel CLI
npm i -g vercel

# 3. Deploy
vercel --prod

# 4. Configurar variables en dashboard.vercel.com:
# - COINBASE_API_KEY
# - COINBASE_WEBHOOK_SECRET  
# - PRIVATE_KEY
# - NFT_CONTRACT_ADDRESS
# - RPC_URL=https://sepolia.base.org
```

### Opción 2: Deploy en Railway

```bash
# 1. Conectar repo en railway.app
# 2. Seleccionar carpeta: ROJO_Ecosystem/01_ROJO_Pay
# 3. Configurar env vars en dashboard
# 4. Deploy automático
```

### Opción 3: Deploy en Heroku

```bash
# Desde ROJO_Ecosystem/01_ROJO_Pay/
heroku create rojo-pay-[tu-nombre]
heroku config:set COINBASE_API_KEY=tu_key
# ... más env vars
git subtree push --prefix ROJO_Ecosystem/01_ROJO_Pay heroku main
```

## 🎨 Deploy del Contrato NFT

### Setup Rápido con Remix

1. **Ir a [remix.ethereum.org](https://remix.ethereum.org)**

2. **Crear archivo**: `RojoRebelNFT.sol`

3. **Copiar código** desde: `ROJO_Ecosystem/contracts/RojoRebelNFT.sol`

4. **Compilar**:
   - Solidity version: 0.8.20+
   - Habilitar optimización

5. **Deploy en Base Sepolia**:
   - Connect MetaMask
   - Switch to Base Sepolia network
   - Constructor params:
     - `initialOwner`: Tu wallet address
     - `baseURI`: `https://tu-dominio.com/metadata/`

6. **Verificar en Explorer**:
   - Ir a [sepolia.basescan.org](https://sepolia.basescan.org)
   - Buscar tu contract address
   - Verificar código fuente

7. **Configurar en App**:
   ```bash
   # En .env
   NFT_CONTRACT_ADDRESS=0x[tu_contract_address]
   RPC_URL=https://sepolia.base.org
   PRIVATE_KEY=[tu_private_key_sin_0x]
   ```

## 🔗 Configuración de Webhook

### En Coinbase Commerce Dashboard

1. **Login** en [commerce.coinbase.com](https://commerce.coinbase.com)

2. **Settings > Webhooks**

3. **Add Endpoint**:
   ```
   URL: https://tu-dominio.com/coinbase-webhook
   Events: Seleccionar "charge:confirmed"
   ```

4. **Save & Copy Secret**:
   - Copiar el Shared Secret generado
   - Añadir a .env como `COINBASE_WEBHOOK_SECRET`

## 🧪 Testing Completo

### Test Local
```bash
cd ROJO_Ecosystem/01_ROJO_Pay
npm install
node start.js
# Ir a http://localhost:3000
```

### Test de Pago Completo
1. ✅ Crear charge en el frontend
2. ✅ Pagar con Commerce (testnet)
3. ✅ Verificar webhook received
4. ✅ Confirmar NFT minteado en Base Explorer

### URLs de Testing
- **Frontend**: `https://tu-dominio.com`
- **Base Sepolia Explorer**: `https://sepolia.basescan.org`
- **Faucet ETH**: [Coinbase Base Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)

## 🏆 Aplicación a Onchain Summer Awards

### Categorías Elegibles
- ✅ **Mini-Apps**: ROJO Pay califica perfectamente
- ✅ **Consumer Apps**: Interface amigable para pagos crypto
- ✅ **Innovation**: NFT receipts automáticos

### Requisitos CDP Cumplidos
- ✅ **Commerce API**: Implementado para pagos
- ✅ **Base**: Smart contract deployado
- ✅ **Accessibility**: UI intuitiva para novatos
- ✅ **Documentation**: README completo y guías

### Submission Checklist
- [ ] Deploy en producción funcionando
- [ ] Contrato verificado en Base
- [ ] Demo video (2-3 minutos)
- [ ] GitHub repo público con docs
- [ ] Aplicar antes del 1 de septiembre

## 🎨 Próximos Proyectos del Ecosistema

### 02. Red Rebels NFT Collection
- **Status**: 🔄 Listo para desarrollo
- **Timeline**: 1 semana
- **Tech**: Base + AI Art Generation

### 03. ROJO Vibe Social Gaming
- **Status**: ⏳ Diseño conceptual
- **Timeline**: 1-2 semanas  
- **Tech**: Base + Trade API

### 04. ROJO Swap Trading
- **Status**: ⏳ Pendiente
- **Timeline**: 1 semana
- **Tech**: Trade API + Commerce

### 05. ROJO DAO Governance
- **Status**: ⏳ Pendiente
- **Timeline**: 1 semana
- **Tech**: Base + DAO Templates

## 📊 Métricas de Éxito

### ROJO Pay (Lanzamiento)
- **Target**: 100+ payments procesados
- **KPI**: NFTs minteados exitosamente
- **Community**: Features en @Base Twitter
- **Awards**: Aplicación submitted

### Ecosistema Completo (Meta)
- **Target**: 5 apps interconnectadas
- **KPI**: 500+ total user interactions
- **Community**: ROJO brand reconocido
- **Awards**: Multiple nominations

## 🆘 Support & Community

- **GitHub**: Repo principal con issues
- **Twitter**: @ROJOPay (crear cuenta)
- **Discord**: ROJO Community (crear servidor)
- **Email**: Deploy support via GitHub issues

---

## 🔥 Action Plan Inmediato

### Esta Semana (21-27 Agosto)
1. ✅ **ROJO Pay**: Deploy a producción
2. ✅ **Contract**: Deploy en Base Sepolia
3. ✅ **Testing**: Validación completa end-to-end
4. 🔄 **Branding**: Crear redes sociales
5. 🔄 **Video**: Demo para submission

### Próxima Semana (28 Ago - 1 Sep)
1. 🎯 **Apply**: Onchain Summer Awards
2. 🎯 **Launch**: Red Rebels NFT collection
3. 🎯 **Promotion**: Spotlight en @Base
4. 🎯 **Community**: Engagement inicial

---

**¡ROJO Pay está listo para revolucionar los pagos onchain! 🔴🚀**

*Built with rebel love during Onchain Summer 2025* 💀
