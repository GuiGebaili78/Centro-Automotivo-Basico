$outputFile = "project_context.txt"
$rootPath = Get-Location

# Lista expandida para ignorar arquivos que não trazem contexto útil de código
$excludePatterns = @(
    "node_modules", ".git", "dist", "build", ".next", "coverage", 
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".DS_Store", ".env",
    "*.log", "*.sql", "*.sqlite", "*.db", "api_logs.txt", # Ignora bancos e logs
    "*.png", "*.jpg", "*.jpeg", "*.gif", "*.ico", "*.svg", "*.webp", "*.pdf", # Imagens e documentos
    "*.map", "*.d.ts", "tsconfig.tsbuildinfo" # Arquivos de compilação/tipagem automática
)

function Is-Excluded($relativePath) {
    foreach ($pattern in $excludePatterns) {
        if ($relativePath -match [Regex]::Escape($pattern)) { return $true }
        if ($pattern -like "*`**" -and $relativePath -like $pattern) { return $true }
    }
    return $false
}

Write-Host "Gerando arquivo de contexto otimizado: $outputFile..."
if (Test-Path $outputFile) { Remove-Item $outputFile }

Add-Content -Path $outputFile -Value "PROJECT DUMP - $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
Add-Content -Path $outputFile -Value "=========================================`n"

$files = Get-ChildItem -Path $rootPath -Recurse -File

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($rootPath.Path.Length + 1)
    
    if (Is-Excluded $relativePath) { continue }
    if ($file.Name -eq $outputFile -or $file.Name -match "gerar_contexto") { continue }

    Write-Host "Lendo: $relativePath"

    try {
        # Lê o arquivo e remove linhas vazias consecutivas (Minificação leve para economizar tokens)
        $content = Get-Content -Path $file.FullName | Where-Object { $_.Trim() -ne "" }
        
        if ($content) {
            Add-Content -Path $outputFile -Value "--- FILE: $relativePath ---"
            Add-Content -Path $outputFile -Value $content
            Add-Content -Path $outputFile -Value "`n"
        }
    } catch {
        Write-Host "Erro ao ler: $relativePath" -ForegroundColor Red
    }
}

Write-Host "Contexto otimizado gerado com sucesso! Arquivo: $outputFile" -ForegroundColor Green