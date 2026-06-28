$outputFile = "project_context.txt"
$rootPath = (Get-Location).Path

# 1. Pastas estritamente ignoradas
$excludeFolders = @("node_modules", ".git", "dist", "build", "coverage", "pgdata", ".docker", "playwright-report", "test-results")

# 2. Extensões estritamente ignoradas (Garante que .sql nunca passará)
$excludeExts = @(".sql", ".sqlite", ".db", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".pdf", ".zip", ".tar", ".gz", ".exe", ".dll", ".log", ".map", ".d.ts", ".pem", ".key", ".crt")

# 3. Nomes de arquivos estritamente ignorados
$excludeFiles = @("package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".DS_Store", $outputFile)

Write-Host "Gerando contexto otimizado (Alta Performance)..."
if (Test-Path $outputFile) { Remove-Item $outputFile }

Add-Content -Path $outputFile -Value "PROJECT DUMP - $(Get-Date -Format 'dd/MM/yyyy HH:mm')`n=========================================`n" -Encoding UTF8

$files = Get-ChildItem -Path $rootPath -Recurse -File

foreach ($file in $files) {
    $ext = $file.Extension.ToLower()
    $name = $file.Name.ToLower()

    # Filtro de Extensão e Nomes Exatos
    if ($excludeExts -contains $ext) { continue }
    if ($excludeFiles -contains $file.Name) { continue }
    
    # Trava de segurança contra arquivos de backup gerados soltos
    if ($name -match "backup" -or $name -match "gerar_contexto") { continue }

    # Filtro de Pastas
    $relativePath = $file.FullName.Substring($rootPath.Length).TrimStart('\', '/')
    $skipFolder = $false
    foreach ($folder in $excludeFolders) {
        if ("\$relativePath" -match "\\$folder\\") {
            $skipFolder = $true
            break
        }
    }
    if ($skipFolder) { continue }

    Write-Host "Lendo código: $relativePath"

    try {
        # Leitura de alta performance (Bloco único, sem travar a RAM)
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        
        if ($null -ne $content) {
            # Minificação de quebras de linha
            $content = $content -replace '(?m)^\s*\r?\n', ''
            
            if (![string]::IsNullOrWhiteSpace($content)) {
                Add-Content -Path $outputFile -Value "--- FILE: $relativePath ---`n$content`n" -Encoding UTF8
            }
        }
    } catch {
        Write-Host "Erro ignorado ao ler: $relativePath" -ForegroundColor Yellow
    }
}

Write-Host "Sucesso! Arquivo limpo gerado: $outputFile" -ForegroundColor Green