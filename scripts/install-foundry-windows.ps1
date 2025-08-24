# 🔴 ROJO + BASE - Foundry Installation Script para Windows
# @author VERGASEC PRO
# PowerShell script para instalar Foundry en Windows

param(
    [switch]$Force,
    [switch]$Verbose
)

# Colores para la consola
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$Cyan = "Cyan"
$White = "White"

function Write-ColorOutput {
    param(
        [string]$Color,
        [string]$Text
    )
    Write-Host $Text -ForegroundColor $Color
}

function Show-Banner {
    Write-ColorOutput $Red @"
    🔴 ROJO + BASE INTEGRATION 🔴
    ================================
    Instalando Foundry en Windows
    @author VERGASEC PRO
    ================================
"@
}

function Test-AdminRights {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentUser)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Install-Chocolatey {
    Write-ColorOutput $Blue "🍫 Verificando Chocolatey..."
    
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-ColorOutput $Green "✅ Chocolatey ya está instalado"
        return $true
    }
    
    Write-ColorOutput $Yellow "⚠️  Chocolatey no encontrado. Instalando..."
    
    try {
        Set-ExecutionPolicy Bypass -Scope Process -Force
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
        iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
        
        # Refrescar PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-ColorOutput $Green "✅ Chocolatey instalado exitosamente"
        return $true
    }
    catch {
        Write-ColorOutput $Red "❌ Error instalando Chocolatey: $($_.Exception.Message)"
        return $false
    }
}

function Install-Git {
    Write-ColorOutput $Blue "📚 Verificando Git..."
    
    if (Get-Command git -ErrorAction SilentlyContinue) {
        Write-ColorOutput $Green "✅ Git ya está instalado"
        return $true
    }
    
    Write-ColorOutput $Yellow "⚠️  Git no encontrado. Instalando..."
    
    try {
        choco install git -y
        Write-ColorOutput $Green "✅ Git instalado exitosamente"
        return $true
    }
    catch {
        Write-ColorOutput $Red "❌ Error instalando Git: $($_.Exception.Message)"
        return $false
    }
}

function Install-Rust {
    Write-ColorOutput $Blue "🦀 Verificando Rust..."
    
    if (Get-Command rustc -ErrorAction SilentlyContinue) {
        Write-ColorOutput $Green "✅ Rust ya está instalado"
        return $true
    }
    
    Write-ColorOutput $Yellow "⚠️  Rust no encontrado. Instalando..."
    
    try {
        choco install rust -y
        Write-ColorOutput $Green "✅ Rust instalado exitosamente"
        return $true
    }
    catch {
        Write-ColorOutput $Red "❌ Error instalando Rust: $($_.Exception.Message)"
        return $false
    }
}

function Install-Foundry {
    Write-ColorOutput $Blue "🔧 Instalando Foundry..."
    
    try {
        # Crear directorio temporal
        $tempDir = "$env:TEMP\foundry-install"
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $tempDir | Out-Null
        
        # Descargar instalador de Foundry
        $foundryUrl = "https://github.com/foundry-rs/foundry/releases/latest/download/foundry-installer.ps1"
        $foundryInstaller = "$tempDir\foundry-installer.ps1"
        
        Write-ColorOutput $Cyan "📥 Descargando instalador de Foundry..."
        Invoke-WebRequest -Uri $foundryUrl -OutFile $foundryInstaller
        
        # Ejecutar instalador
        Write-ColorOutput $Cyan "🚀 Ejecutando instalador de Foundry..."
        & $foundryInstaller
        
        # Refrescar PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        # Verificar instalación
        if (Get-Command forge -ErrorAction SilentlyContinue) {
            Write-ColorOutput $Green "✅ Foundry instalado exitosamente"
            
            # Mostrar versiones
            Write-ColorOutput $Cyan "📊 Versiones instaladas:"
            Write-ColorOutput $White "   Forge: $(forge --version)"
            Write-ColorOutput $White "   Cast: $(cast --version)"
            Write-ColorOutput $White "   Anvil: $(anvil --version)"
            
            return $true
        } else {
            Write-ColorOutput $Red "❌ Foundry no se instaló correctamente"
            return $false
        }
    }
    catch {
        Write-ColorOutput $Red "❌ Error instalando Foundry: $($_.Exception.Message)"
        return $false
    }
    finally {
        # Limpiar directorio temporal
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force
        }
    }
}

function Test-FoundryInstallation {
    Write-ColorOutput $Blue "🧪 Probando instalación de Foundry..."
    
    try {
        # Test Forge
        $forgeVersion = forge --version
        Write-ColorOutput $Green "✅ Forge: $forgeVersion"
        
        # Test Cast
        $castVersion = cast --version
        Write-ColorOutput $Green "✅ Cast: $castVersion"
        
        # Test Anvil
        $anvilVersion = anvil --version
        Write-ColorOutput $Green "✅ Anvil: $anvilVersion"
        
        return $true
    }
    catch {
        Write-ColorOutput $Red "❌ Error probando Foundry: $($_.Exception.Message)"
        return $false
    }
}

function Test-ProjectSetup {
    Write-ColorOutput $Blue "🔍 Verificando configuración del proyecto..."
    
    try {
        # Verificar foundry.toml
        if (Test-Path "foundry.toml") {
            Write-ColorOutput $Green "✅ foundry.toml encontrado"
        } else {
            Write-ColorOutput $Red "❌ foundry.toml no encontrado"
            return $false
        }
        
        # Verificar script de deploy
        if (Test-Path "script/DeployRojoBase.s.sol") {
            Write-ColorOutput $Green "✅ Script de deploy encontrado"
        } else {
            Write-ColorOutput $Red "❌ Script de deploy no encontrado"
            return $false
        }
        
        # Verificar contratos
        if (Test-Path "contracts/RojoSmartWallet.sol") {
            Write-ColorOutput $Green "✅ Contratos encontrados"
        } else {
            Write-ColorOutput $Red "❌ Contratos no encontrados"
            return $false
        }
        
        return $true
    }
    catch {
        Write-ColorOutput $Red "❌ Error verificando proyecto: $($_.Exception.Message)"
        return $false
    }
}

function Show-NextSteps {
    Write-ColorOutput $Green "🎉 ¡Instalación completada exitosamente!"
    Write-ColorOutput $Cyan "`n📋 Próximos pasos:"
    Write-ColorOutput $White "   1. Ejecutar: foundryup (para actualizar a la última versión)"
    Write-ColorOutput $White "   2. Ejecutar: forge build (para compilar contratos)"
    Write-ColorOutput $White "   3. Ejecutar: forge test (para ejecutar tests)"
    Write-ColorOutput $White "   4. Deploy en Base Sepolia:"
    Write-ColorOutput $White "      forge script script/DeployRojoBase.s.sol --rpc-url $env:BASE_SEPOLIA_RPC_URL --broadcast"
    
    Write-ColorOutput $Cyan "`n🔗 Recursos útiles:"
    Write-ColorOutput $White "   • Base Explorer: https://basescan.org"
    Write-ColorOutput $White "   • Base Sepolia: https://sepolia.basescan.org"
    Write-ColorOutput $White "   • Base Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
    
    Write-ColorOutput $Red "`n🔴 ¡VAMOS A HACER HISTORIA EN BASE! 🔴"
}

# Función principal
function Main {
    Show-Banner
    
    Write-ColorOutput $Blue "🚀 Iniciando instalación de Foundry para ROJO + BASE...`n"
    
    # Verificar permisos de administrador
    if (-not (Test-AdminRights)) {
        Write-ColorOutput $Red "❌ Este script requiere permisos de administrador"
        Write-ColorOutput $Yellow "💡 Ejecuta PowerShell como administrador y vuelve a intentar"
        exit 1
    }
    
    # Instalar dependencias
    if (-not (Install-Chocolatey)) {
        Write-ColorOutput $Red "❌ Falló la instalación de Chocolatey"
        exit 1
    }
    
    if (-not (Install-Git)) {
        Write-ColorOutput $Red "❌ Falló la instalación de Git"
        exit 1
    }
    
    if (-not (Install-Rust)) {
        Write-ColorOutput $Red "❌ Falló la instalación de Rust"
        exit 1
    }
    
    # Instalar Foundry
    if (-not (Install-Foundry)) {
        Write-ColorOutput $Red "❌ Falló la instalación de Foundry"
        exit 1
    }
    
    # Probar instalación
    if (-not (Test-FoundryInstallation)) {
        Write-ColorOutput $Red "❌ Falló la prueba de Foundry"
        exit 1
    }
    
    # Verificar proyecto
    if (-not (Test-ProjectSetup)) {
        Write-ColorOutput $Red "❌ Configuración del proyecto incompleta"
        exit 1
    }
    
    # Mostrar próximos pasos
    Show-NextSteps
}

# Ejecutar script
try {
    Main
}
catch {
    Write-ColorOutput $Red "❌ Error crítico: $($_.Exception.Message)"
    Write-ColorOutput $Yellow "💡 Revisa los logs y vuelve a intentar"
    exit 1
}
