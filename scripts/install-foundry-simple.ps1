# ROJO + BASE - Foundry Installation Script Simple para Windows
# @author VERGASEC PRO
# PowerShell script simple para instalar Foundry en Windows

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
    ROJO + BASE INTEGRATION
    ================================
    Instalando Foundry (Metodo Simple)
    @author VERGASEC PRO
    ================================
"@
}

function Test-Requirements {
    Write-ColorOutput $Blue "Verificando requisitos..."
    
    # Verificar PowerShell version
    $psVersion = $PSVersionTable.PSVersion.Major
    if ($psVersion -lt 5) {
        Write-ColorOutput $Red "PowerShell 5.0 o superior requerido (actual: $psVersion)"
        return $false
    }
    Write-ColorOutput $Green "PowerShell $psVersion - OK"
    
    # Verificar si ya esta instalado
    if (Get-Command forge -ErrorAction SilentlyContinue) {
        Write-ColorOutput $Green "Foundry ya esta instalado"
        Write-ColorOutput $Cyan "Versiones:"
        Write-ColorOutput $White "   Forge: $(forge --version)"
        Write-ColorOutput $White "   Cast: $(cast --version)"
        Write-ColorOutput $White "   Anvil: $(anvil --version)"
        return $true
    }
    
    Write-ColorOutput $Yellow "Foundry no encontrado, procediendo con instalacion..."
    return $false
}

function Install-FoundrySimple {
    Write-ColorOutput $Blue "Instalando Foundry (metodo simple)..."
    
    try {
        # Crear directorio temporal
        $tempDir = "$env:TEMP\foundry-simple"
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $tempDir | Out-Null
        
        Write-ColorOutput $Cyan "Descargando instalador de Foundry..."
        
        # Intentar descargar el instalador
        try {
            $foundryUrl = "https://github.com/foundry-rs/foundry/releases/latest/download/foundry-installer.ps1"
            $foundryInstaller = "$tempDir\foundry-installer.ps1"
            
            Invoke-WebRequest -Uri $foundryUrl -OutFile $foundryInstaller -UseBasicParsing
            
            Write-ColorOutput $Cyan "Ejecutando instalador de Foundry..."
            & $foundryInstaller
            
        } catch {
            Write-ColorOutput $Yellow "Metodo directo fallo, intentando metodo alternativo..."
            
            # Metodo alternativo: descargar binarios directamente
            $baseUrl = "https://github.com/foundry-rs/foundry/releases/latest/download"
            $binDir = "$env:USERPROFILE\.foundry\bin"
            
            if (-not (Test-Path $binDir)) {
                New-Item -ItemType Directory -Path $binDir -Force | Out-Null
            }
            
            # Descargar Forge
            Write-ColorOutput $Cyan "Descargando Forge..."
            $forgeUrl = "$baseUrl/forge-windows-x86_64.exe"
            $forgePath = "$binDir\forge.exe"
            Invoke-WebRequest -Uri $forgeUrl -OutFile $forgePath -UseBasicParsing
            
            # Descargar Cast
            Write-ColorOutput $Cyan "Descargando Cast..."
            $castUrl = "$baseUrl/cast-windows-x86_64.exe"
            $castPath = "$binDir\cast.exe"
            Invoke-WebRequest -Uri $castUrl -OutFile $castPath -UseBasicParsing
            
            # Descargar Anvil
            Write-ColorOutput $Cyan "Descargando Anvil..."
            $anvilUrl = "$baseUrl/anvil-windows-x86_64.exe"
            $anvilPath = "$binDir\anvil.exe"
            Invoke-WebRequest -Uri $anvilUrl -OutFile $anvilPath -UseBasicParsing
            
            # Agregar al PATH del usuario
            $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
            if ($userPath -notlike "*$binDir*") {
                [Environment]::SetEnvironmentVariable("Path", "$userPath;$binDir", "User")
                $env:Path += ";$binDir"
            }
            
            Write-ColorOutput $Green "Foundry instalado manualmente en $binDir"
        }
        
        # Verificar instalacion
        if (Get-Command forge -ErrorAction SilentlyContinue) {
            Write-ColorOutput $Green "Foundry instalado exitosamente"
            
            # Mostrar versiones
            Write-ColorOutput $Cyan "Versiones instaladas:"
            Write-ColorOutput $White "   Forge: $(forge --version)"
            Write-ColorOutput $White "   Cast: $(cast --version)"
            Write-ColorOutput $White "   Anvil: $(anvil --version)"
            
            return $true
        } else {
            Write-ColorOutput $Red "Foundry no se instalo correctamente"
            return $false
        }
    }
    catch {
        Write-ColorOutput $Red "Error instalando Foundry: $($_.Exception.Message)"
        return $false
    }
    finally {
        # Limpiar directorio temporal
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force
        }
    }
}

function Test-ProjectSetup {
    Write-ColorOutput $Blue "Verificando configuracion del proyecto..."
    
    try {
        # Verificar foundry.toml
        if (Test-Path "foundry.toml") {
            Write-ColorOutput $Green "foundry.toml encontrado"
        } else {
            Write-ColorOutput $Red "foundry.toml no encontrado"
            return $false
        }
        
        # Verificar script de deploy
        if (Test-Path "script/DeployRojoBase.s.sol") {
            Write-ColorOutput $Green "Script de deploy encontrado"
        } else {
            Write-ColorOutput $Red "Script de deploy no encontrado"
            return $false
        }
        
        # Verificar contratos
        if (Test-Path "contracts/RojoSmartWallet.sol") {
            Write-ColorOutput $Green "Contratos encontrados"
        } else {
            Write-ColorOutput $Red "Contratos no encontrados"
            return $false
        }
        
        return $true
    }
    catch {
        Write-ColorOutput $Red "Error verificando proyecto: $($_.Exception.Message)"
        return $false
    }
}

function Show-NextSteps {
    Write-ColorOutput $Green "Instalacion completada exitosamente!"
    Write-ColorOutput $Cyan "`nProximos pasos:"
    Write-ColorOutput $White "   1. Ejecutar: foundryup (para actualizar a la ultima version)"
    Write-ColorOutput $White "   2. Ejecutar: forge build (para compilar contratos)"
    Write-ColorOutput $White "   3. Ejecutar: forge test (para ejecutar tests)"
    Write-ColorOutput $White "   4. Deploy en Base Sepolia:"
    Write-ColorOutput $White "      forge script script/DeployRojoBase.s.sol --rpc-url $env:BASE_SEPOLIA_RPC_URL --broadcast"
    
    Write-ColorOutput $Cyan "`nRecursos utiles:"
    Write-ColorOutput $White "   • Base Explorer: https://basescan.org"
    Write-ColorOutput $White "   • Base Sepolia: https://sepolia.basescan.org"
    Write-ColorOutput $White "   • Base Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet"
    
    Write-ColorOutput $Red "`nVAMOS A HACER HISTORIA EN BASE!"
}

function Show-InstallationOptions {
    Write-ColorOutput $Yellow "`nSi la instalacion automatica falla, puedes:"
    Write-ColorOutput $White "   1. Instalar manualmente desde: https://getfoundry.sh"
    Write-ColorOutput $White "   2. Usar WSL (Windows Subsystem for Linux)"
    Write-ColorOutput $White "   3. Usar Docker con imagen de Foundry"
    Write-ColorOutput $White "   4. Contactar a VERGASEC PRO para soporte"
}

# Funcion principal
function Main {
    Show-Banner
    
    Write-ColorOutput $Blue "Iniciando instalacion simple de Foundry para ROJO + BASE...`n"
    
    # Verificar si ya esta instalado
    if (Test-Requirements) {
        Write-ColorOutput $Green "Foundry ya esta instalado y funcionando"
        if (Test-ProjectSetup) {
            Show-NextSteps
        }
        return
    }
    
    # Instalar Foundry
    if (Install-FoundrySimple) {
        # Verificar proyecto
        if (Test-ProjectSetup) {
            Show-NextSteps
        } else {
            Write-ColorOutput $Red "Configuracion del proyecto incompleta"
            Show-InstallationOptions
        }
    } else {
        Write-ColorOutput $Red "Fallo la instalacion de Foundry"
        Show-InstallationOptions
    }
}

# Ejecutar script
try {
    Main
}
catch {
    Write-ColorOutput $Red "Error critico: $($_.Exception.Message)"
    Write-ColorOutput $Yellow "Revisa los logs y vuelve a intentar"
    Show-InstallationOptions
}
