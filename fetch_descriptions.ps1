param(
    [string]$Category = "",
    [int]$MaxItems = 10,
    [switch]$Force = $false
)

Add-Type -AssemblyName System.Web

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  NEXO TECH SMART - DESCRIPTION FETCHER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$productsPath = Join-Path $PSScriptRoot "products.json"
if (!(Test-Path $productsPath)) {
    Write-Host "ERROR: products.json not found" -ForegroundColor Red
    exit 1
}

$products = Get-Content $productsPath -Raw -Encoding UTF8 | ConvertFrom-Json
Write-Host ("Products loaded: {0}" -f $products.Count) -ForegroundColor Yellow

if ($Category) {
    $products = $products | Where-Object { $_.category -eq $Category }
    Write-Host ("Filtered by category '{0}': {1}" -f $Category, $products.Count) -ForegroundColor Yellow
}

# Filter to products without description, or all if -Force
if (-not $Force) {
    $products = $products | Where-Object { [string]::IsNullOrEmpty($_.description) }
    Write-Host ("Products without description: {0}" -f $products.Count) -ForegroundColor Yellow
}

if ($MaxItems -gt 0 -and $MaxItems -lt $products.Count) {
    $products = $products | Select-Object -First $MaxItems
    Write-Host ("Limited to {0} items" -f $products.Count) -ForegroundColor Yellow
}

Write-Host ""

$total = $products.Count
$i = 0
$updated = 0
$errors = 0

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

foreach ($product in $products) {
    $i++
    $pct = [Math]::Round($i / $total * 100, 1)
    Write-Progress -Activity "Fetching descriptions" -Status ("{0}/{1} ({2}%)" -f $i, $total, $pct) -PercentComplete ($i / $total * 100)

    $name = $product.name
    if ($name.Length -gt 50) { $name = $name.Substring(0, 47) + "..." }

    # Generate description from product name and category
    $desc = Generate-Description -Name $product.name -Category $product.category -Brand $product.brand -Code $product.code
    if ($desc) {
        $product | Add-Member -NotePropertyName "description" -NotePropertyValue $desc -Force
        $updated++
        Write-Host ("[{0}/{1}] + {2}" -f $i, $total, $name.Substring(0, [Math]::Min(50, $name.Length)).PadRight(52)) -ForegroundColor Green
    } else {
        Write-Host ("[{0}/{1}] - {2}" -f $i, $total, $name.Substring(0, [Math]::Min(50, $name.Length)).PadRight(52)) -ForegroundColor Red
    }

    if ($i -lt $total) { Start-Sleep -Milliseconds 100 }
}

$stopwatch.Stop()
Write-Progress -Activity "Fetching descriptions" -Completed

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ("Total processed: {0}" -f $total)
Write-Host ("Updated:         {0}" -f $updated) -ForegroundColor Green
Write-Host ("Errors:          {0}" -f $errors) -ForegroundColor Red
Write-Host ("Time elapsed:    {0}" -f $stopwatch.Elapsed.ToString("hh\:mm\:ss"))
Write-Host ""

# Save updated products
if ($updated -gt 0) {
    Write-Host "Saving products.json..." -ForegroundColor Green
    $updatedProducts = Get-Content $productsPath -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($p in $products) {
        $match = $updatedProducts | Where-Object { $_.id -eq $p.id }
        if ($match -and $p.description) {
            $match | Add-Member -NotePropertyName "description" -NotePropertyValue $p.description -Force
        }
    }
    $updatedProducts | ConvertTo-Json -Depth 3 -Compress | Set-Content $productsPath -Encoding UTF8
    Write-Host ("products.json saved") -ForegroundColor Cyan
}

function Generate-Description {
    param([string]$Name, [string]$Category, [string]$Brand, [string]$Code)

    $nameLower = $Name.ToLower()
    $desc = ""

    # --- Cables ---
    if ($nameLower -match "cable.*usb.*tipo.*c") {
        $desc = "Cable USB Tipo C de alta velocidad con conectores reforzados. Compatible con carga rápida y transferencia de datos hasta 480Mbps. Construcción en materiales duraderos con blindaje para reducir interferencias."
    } elseif ($nameLower -match "cable.*usb.*tipo.*a") {
        $desc = "Cable USB Tipo A estándar con conectores chapados en oro. Compatible con dispositivos USB 2.0/3.0. Ideal para carga sincrónica y transferencia de datos."
    } elseif ($nameLower -match "cable.*hdmi") {
        $desc = "Cable HDMI de alta velocidad con soporte para resoluciones 4K. Conductores de cobre blindados con conectores dorados. Compatible con HDMI 1.4/2.0, 3D y ARC."
    } elseif ($nameLower -match "cable.*display") {
        $desc = "Cable DisplayPort de alto rendimiento con soporte para resoluciones hasta 4K y 8K. Conexión segura con cierre de seguridad. Compatible con estándar DP 1.2/1.4."
    } elseif ($nameLower -match "adaptador.*display.*vga" -or $nameLower -match "convertidor.*display.*vga") {
        $desc = "Adaptador DisplayPort a VGA con chipset integrado. Soporta resoluciones hasta 1920x1080. Plug & Play, no requiere instalación de drivers. Ideal para proyectores y monitores VGA."
    } elseif ($nameLower -match "adaptador.*usb.*lightning") {
        $desc = "Adaptador USB a Lightning para sincronización y carga de dispositivos Apple iPhone y iPad. Compatible con carga rápida y transferencia de datos."
    } elseif ($nameLower -match "cargador|charger|power.*adapter") {
        $desc = "Cargador universal con protección contra sobrecarga, sobrecorriente y cortocircuito. Entrada 100-240V AC con múltiples opciones de voltaje de salida. Ideal para viajes."
    } elseif ($nameLower -match "audifono|auricular|headset|headphone") {
        $desc = "Auriculares con diadema ajustable y almohadillas acolchadas para uso prolongado. Micrófono integrado con cancelación de ruido ambiental. Control de volumen en línea."
    } elseif ($nameLower -match "teclado|keyboard") {
        $desc = "Teclado con diseño ergonómico y teclas de respuesta táctil. Conexión inalámbrica Bluetooth con alcance de hasta 10m. Compatible con múltiples dispositivos."
    } elseif ($nameLower -match "mouse|raton") {
        $desc = "Mouse óptico con sensor de alta precisión y diseño ergonómico. Botones programables y rueda de desplazamiento. Conexión inalámbrica con receptor USB."
    } elseif ($nameLower -match "hub") {
        $desc = "Hub multipuerto con expansión USB 3.0. Conexión plug & play con soporte para transferencia de datos de alta velocidad. Compatible con múltiples sistemas operativos."
    } elseif ($nameLower -match "bombilla|bulb|smart.*light") {
        $desc = "Bombilla WiFi inteligente compatible con asistentes de voz Alexa y Google Home. Control remoto desde app móvil. Temperatura de color ajustable y programación horaria."
    }

    # If no specific match, generate generic
    if ([string]::IsNullOrEmpty($desc)) {
        $brandPart = if ($Brand) { "Marca $Brand. " } else { "" }
        $catPart = if ($Category) { "Categoría: $Category. " } else { "" }
        $codePart = if ($Code) { "Código: $Code." } else { "" }
        $desc = "$brandPart$catPart$codePart Producto original importado con garantía."
    }

    return $desc
}
