$outputFile = "project_context.txt"
$rootPath = Get-Location

# Lista de padrões e pastas para ignorar
$excludePatterns = @(
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "*.log",
    "*.png",
    "*.jpg",
    "*.jpeg",
    "*.gif",
    "*.ico",
    "*.svg",
    "*.webp",
    "*.pdf",
    ".DS_Store",
    ".env" # Ignora .env por segurança
)

function Is-Excluded($relativePath) {
    foreach ($pattern in $excludePatterns) {
        # Verifica se o padrão está no caminho (para pastas como node_modules)
        if ($relativePath -match [Regex]::Escape($pattern)) { return $true }
        # Verifica extensão ou nome exato (wildcards simples)
        if ($pattern -like "*`**" -and $relativePath -like $pattern) { return $true }
    }
    return $false
}

Write-Host "Gerando arquivo de contexto: $outputFile..."
if (Test-Path $outputFile) { Remove-Item $outputFile }

Add-Content -Path $outputFile -Value "PROJECT DUMP GENERATED ON $(Get-Date)"
Add-Content -Path $outputFile -Value "ROOT: $rootPath"
Add-Content -Path $outputFile -Value "EXCLUDED: $($excludePatterns -join ', ')"
Add-Content -Path $outputFile -Value "`n"

$files = Get-ChildItem -Path $rootPath -Recurse -File

foreach ($file in $files) {
    $relativePath = $file.FullName.Substring($rootPath.Path.Length + 1)
    
    if (Is-Excluded $relativePath) {
        continue
    }

    # Evita ler o próprio arquivo de saída
    if ($file.Name -eq $outputFile -or $file.Name -eq "generate_context.ps1") { continue }

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

Write-Host "Concluído! O arquivo '$outputFile' foi gerado com sucesso na raiz do projeto."
