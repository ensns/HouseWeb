# Завантажує тимчасові фото з picsum.photos у assets/img/placeholders,
# щоб сайт можна було показати без інтернету.
# Запуск:  powershell -ExecutionPolicy Bypass -File scripts\fetch-placeholders.ps1
#
# Після завантаження підставте шляхи у assets/js/photos.js, наприклад:
#   src: 'assets/img/placeholders/hw-g01.jpg'

$root = Split-Path -Parent $PSScriptRoot
$out  = Join-Path $root 'assets\img\placeholders'

if (-not (Test-Path $out)) { New-Item -ItemType Directory -Path $out | Out-Null }

$shots = @(
    @{ seed = 'hw-hero';   w = 2400; h = 1400 },
    @{ seed = 'hw-about1'; w = 1100; h = 1500 },
    @{ seed = 'hw-about2'; w = 1200; h = 900  }
)

1..18 | ForEach-Object {
    $n = '{0:d2}' -f $_
    $shots += @{ seed = "hw-g$n"; w = 1600; h = 1100 }
}

foreach ($s in $shots) {
    $file = Join-Path $out "$($s.seed).jpg"
    if (Test-Path $file) { Write-Host "· пропущено $($s.seed)"; continue }

    $url = "https://picsum.photos/seed/$($s.seed)/$($s.w)/$($s.h)"
    try {
        Invoke-WebRequest -Uri $url -OutFile $file -UseBasicParsing -TimeoutSec 60
        Write-Host "+ $($s.seed).jpg"
    } catch {
        Write-Warning "не вдалося завантажити $($s.seed): $($_.Exception.Message)"
    }
}

Write-Host "`nГотово. Файли у: $out"
