$outputFile = "project_context_v3.txt"
$rootPath = Get-Location

# Padrões e pastas para ignorar
$excludePatterns = @(
    "node_modules", ".git", "dist", "build", ".next", "coverage",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    "*.log", "*.png", "*.jpg", "*.jpeg", "*.gif", "*.ico", "*.svg", "*.webp", "*.pdf",
    ".DS_Store", ".env",
    "migrations",
    "*.css", "*.scss", "*.less",
    "*.test.ts", "*.spec.ts", "*.test.tsx", "*.spec.tsx",
    "dados_oficina.sql",
    "project_context*.txt" # <-- CRÍTICO: Bloqueia a leitura de qualquer dump anterior
)

function Is-Excluded($file, $relativePath) {
    # 1. Verifica correspondência exata de nome ou extensão (arquivos)
    foreach ($pattern in $excludePatterns) {
        if ($pattern -like "*`**" -and $file.Name -like $pattern) { return $true }
        if ($file.Name -eq $pattern) { return $true }
    }
    
    # 2. Verifica se pertence a uma pasta bloqueada (Divide o caminho para precisão absoluta)
    $pathParts = $relativePath -split "[\\/]"
    foreach ($pattern in $excludePatterns) {
        if ($pathParts -contains $pattern) { return $true }
    }
    
    return $false
}

Write-Host "Gerando arquivo de contexto V3: $outputFile..."
if (Test-Path $outputFile) { Remove-Item $outputFile }

Add-Content -Path $outputFile -Value "PROJECT DUMP V3 GENERATED ON $(Get-Date)"
Add-Content -Path $outputFile -Value "ROOT: $rootPath"
Add-Content -Path $outputFile -Value "EXCLUDED: $($excludePatterns -join ', ')"
Add-Content -Path $outputFile -Value "`n"

$files = Get-ChildItem -Path $rootPath -Recurse -File

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($rootPath.Path.Length + 1)
    
    if (Is-Excluded $file $relativePath) {
        continue
    }

    if ($file.Name -match "^generate_context") { continue }

    Write-Host "Processando: $relativePath"

    Add-Content -Path $outputFile -Value "================================================================================"
    Add-Content -Path $outputFile -Value "FILE PATH: $relativePath"
    Add-Content -Path $outputFile -Value "================================================================================"
    
    try {
        $content = Get-Content -Path $file.FullName -Raw
        if ($null -eq $content) { $content = "" }
        Add-Content -Path $outputFile -Value $content
        Add-Content -Path $outputFile -Value "`n"
    } catch {
        Add-Content -Path $outputFile -Value "[ERRO AO LER ARQUIVO]"
        Add-Content -Path $outputFile -Value "`n"
    }
}

Write-Host "Concluído! O arquivo '$outputFile' foi gerado com sucesso."