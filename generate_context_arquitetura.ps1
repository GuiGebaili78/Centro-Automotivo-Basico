$outputFile = "project_context.txt"
$rootPath = (Get-Location).Path

# Mantemos exclusões de pastas para evitar lentidão processando milhares de arquivos em node_modules
$excludeFolders = @("node_modules", ".git", "dist", "build", ".next", "coverage")

# Função determinística para checar se o arquivo é binário lendo seu cabeçalho
function Is-TextFile($filePath) {
    try {
        $stream = [System.IO.File]::OpenRead($filePath)
        $buffer = New-Object byte[] 512
        $bytesRead = $stream.Read($buffer, 0, 512)
        $stream.Close()
        
        # Se contiver o byte 0 (Null), é garantido que seja um binário
        for ($i = 0; $i -lt $bytesRead; $i++) {
            if ($buffer[$i] -eq 0) { return $false }
        }
        return $true
    } catch {
        return $false # Ignora arquivos bloqueados pelo SO
    }
}

Write-Host "Gerando arquivo de contexto com validação binária..."
if (Test-Path $outputFile) { Remove-Item $outputFile }

Add-Content -Path $outputFile -Value "PROJECT DUMP - $(Get-Date -Format 'dd/MM/yyyy HH:mm')`n=========================================`n"

$files = Get-ChildItem -Path $rootPath -Recurse -File

foreach ($file in $files) {
    $relativePath = $file.FullName.Replace($rootPath, "").TrimStart('\')
    
    $isInExcludedFolder = $excludeFolders | Where-Object { $relativePath -match "(?:^|\\)$_\b" }
    if ($isInExcludedFolder -or $file.Name -eq $outputFile) { continue }

    # Filtro definitivo: Só prossegue se for texto
    if (-not (Is-TextFile $file.FullName)) {
        Write-Host "Ignorando binário detectado: $relativePath" -ForegroundColor DarkGray
        continue
    }

    Write-Host "Lendo texto: $relativePath"

    try {
        $content = (Get-Content -Path $file.FullName -Raw) -replace '(?m)^\s*\r?\n', ''
        
        if (![string]::IsNullOrWhiteSpace($content)) {
            Add-Content -Path $outputFile -Value "--- FILE: $relativePath ---`n$content`n"
        }
    } catch {
        Write-Host "Erro inesperado ao ler: $relativePath" -ForegroundColor Yellow
    }
}

Write-Host "Concluído: $outputFile" -ForegroundColor Green