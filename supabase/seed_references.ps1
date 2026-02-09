# LabPro Reference Data Seed Script (PowerShell, UTF-8)
# Использует Supabase Management API для корректной вставки кириллицы

$SBP_TOKEN = "sbp_d03bd67e20f574ed677837f3308abf96d6d51b0d"
$PROJECT = "cyyqzuuozuzlhdlzvohh"
$BASE_URL = "https://api.supabase.com/v1/projects/$PROJECT/database/query"

function Invoke-SupabaseSQL {
    param([string]$SQL)
    $body = @{ query = $SQL } | ConvertTo-Json -Depth 10
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    try {
        $response = Invoke-RestMethod -Uri $BASE_URL -Method POST `
            -Headers @{ "Authorization" = "Bearer $SBP_TOKEN" } `
            -ContentType "application/json; charset=utf-8" `
            -Body $bytes
        return $response
    } catch {
        Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

Write-Host "=== Step 1: Clear all entity data ===" -ForegroundColor Yellow
Invoke-SupabaseSQL "DELETE FROM operation_media; DELETE FROM operation_containers; DELETE FROM operation_metrics; DELETE FROM batch_reservations; DELETE FROM tasks; DELETE FROM notifications; DELETE FROM operations; DELETE FROM containers; DELETE FROM lots; DELETE FROM banks; DELETE FROM cryo_vials; DELETE FROM cultures; DELETE FROM tissues; DELETE FROM donations; DELETE FROM donors; DELETE FROM inventory_movements; DELETE FROM batches; DELETE FROM ready_media; DELETE FROM positions; DELETE FROM audit_logs; DELETE FROM equipment_logs; DELETE FROM qc_tests; DELETE FROM order_items; DELETE FROM orders;"

Write-Host "=== Step 2: Clear reference data ===" -ForegroundColor Yellow
Invoke-SupabaseSQL "DELETE FROM nomenclatures; DELETE FROM culture_type_tissue_types; DELETE FROM container_types; DELETE FROM culture_types; DELETE FROM tissue_types; DELETE FROM morphology_types; DELETE FROM dispose_reasons; DELETE FROM equipment; DELETE FROM users;"

Write-Host "=== Step 3: Insert tissue_types ===" -ForegroundColor Cyan
Invoke-SupabaseSQL @"
INSERT INTO tissue_types (code, name, tissue_form, is_active) VALUES
('SKIN', 'Кожа (дерма)', 'SOLID', true),
('FAT', 'Жировая ткань (липоаспират)', 'SOLID', true),
('CARTILAGE', 'Хрящевая ткань', 'SOLID', true),
('BONE', 'Костная ткань', 'SOLID', true),
('BONE_MARROW', 'Костный мозг', 'LIQUID', true),
('BLOOD', 'Кровь', 'LIQUID', true),
('MUSCLE', 'Мышечная ткань', 'SOLID', true),
('PLACENTA', 'Плацента', 'SOLID', true),
('CORD_BLOOD', 'Пуповинная кровь', 'LIQUID', true),
('UMBILICAL_CORD', 'Пуповина', 'SOLID', true),
('WHARTON_JELLY', 'Вартонов студень', 'SOLID', true),
('AMNION', 'Амниотическая мембрана', 'SOLID', true),
('DENTAL_PULP', 'Пульпа зуба', 'SOLID', true)
ON CONFLICT (code) DO NOTHING;
"@

Write-Host "=== Step 4: Insert culture_types ===" -ForegroundColor Cyan
Invoke-SupabaseSQL @"
INSERT INTO culture_types (code, name, description, growth_rate, optimal_confluent, passage_interval_days, is_active) VALUES
('MSC', 'МСК (общие)', 'Мезенхимальные стволовые клетки', 1.5, 85, 3, true),
('MSC-AT', 'МСК из жировой ткани', 'МСК выделенные из жировой ткани (липоаспират)', 1.5, 85, 3, true),
('MSC-BM', 'МСК из костного мозга', 'МСК выделенные из костного мозга', 1.3, 85, 4, true),
('MSC-UC', 'МСК из пуповины', 'МСК из пуповины / Вартонова студня', 1.4, 85, 3, true),
('MSC-DP', 'МСК из пульпы зуба', 'МСК выделенные из пульпы зуба', 1.2, 80, 4, true),
('FIBRO', 'Фибробласты', 'Дермальные фибробласты', 2.0, 90, 2, true),
('CHONDRO', 'Хондроциты', 'Клетки хрящевой ткани', 1.0, 80, 5, true),
('KERATINO', 'Кератиноциты', 'Эпидермальные кератиноциты', 1.8, 85, 3, true),
('ADIPO', 'Адипоциты', 'Жировые клетки', 1.2, 80, 4, true),
('OSTEO', 'Остеобласты', 'Костные клетки', 1.0, 80, 5, true),
('AMNIO', 'Амниоциты', 'Клетки амниотической мембраны', 1.3, 85, 3, true),
('HSC', 'Гемопоэтические стволовые клетки', 'Кроветворные стволовые клетки', 1.0, null, 7, true),
('NK', 'NK-клетки', 'Натуральные киллеры', 1.5, null, 3, true),
('T-CELL', 'Т-лимфоциты', 'Т-клетки иммунной системы', 1.3, null, 4, true),
('HEK293', 'HEK293', 'Human Embryonic Kidney 293', 2.5, 90, 2, true),
('CHO', 'CHO', 'Chinese Hamster Ovary', 2.0, 90, 2, true)
ON CONFLICT (code) DO NOTHING;
"@

Write-Host "=== Step 5: Insert container_types ===" -ForegroundColor Cyan
Invoke-SupabaseSQL @"
INSERT INTO container_types (code, name, surface_area_cm2, volume_ml, is_cryo, is_active) VALUES
('FL25', 'Флакон T-25', 25, 5, false, true),
('FL75', 'Флакон T-75', 75, 15, false, true),
('FL175', 'Флакон T-175', 175, 35, false, true),
('PL6', 'Планшет 6-лунок', 9.6, 3, false, true),
('PL12', 'Планшет 12-лунок', 3.8, 1.5, false, true),
('PL24', 'Планшет 24-лунок', 1.9, 1, false, true),
('PL96', 'Планшет 96-лунок', 0.32, 0.2, false, true),
('DISH35', 'Чашка Петри 35 мм', 9.6, 2, false, true),
('DISH60', 'Чашка Петри 60 мм', 21, 5, false, true),
('DISH100', 'Чашка Петри 100 мм', 78, 10, false, true),
('CRYO', 'Криовиала 2 мл', null, 2, true, true)
ON CONFLICT (code) DO NOTHING;
"@

Write-Host "=== Step 6: Insert morphology_types ===" -ForegroundColor Cyan
Invoke-SupabaseSQL @"
INSERT INTO morphology_types (code, name, description) VALUES
('SPINDLE', 'Веретеновидная', 'Типичная морфология МСК'),
('COBBLESTONE', 'Булыжниковая', 'Характерна для эпителиальных клеток'),
('ROUND', 'Округлая', 'Неприкрепившиеся или откреплённые клетки'),
('FIBROBLAST', 'Фибробластоподобная', 'Вытянутые клетки с отростками'),
('POLYGONAL', 'Полигональная', 'Многоугольная форма'),
('MIXED', 'Смешанная', 'Смесь морфологий'),
('STAR', 'Звёздчатая', 'Звёздчатая форма клеток'),
('CLUSTER', 'Кластеры', 'Рост кластерами'),
('MONOLAYER', 'Монослой', 'Рост монослоем')
ON CONFLICT (code) DO NOTHING;
"@

Write-Host "=== Step 7: Insert dispose_reasons ===" -ForegroundColor Cyan
Invoke-SupabaseSQL @"
INSERT INTO dispose_reasons (code, name, description) VALUES
('CONTAMINATION', 'Контаминация', 'Бактериальная, грибковая или микоплазменная контаминация'),
('EXPIRED', 'Истёк срок годности', 'Срок годности истёк'),
('QC_FAILED', 'QC не пройден', 'Не пройден контроль качества'),
('LOW_VIABILITY', 'Низкая жизнеспособность', 'Жизнеспособность ниже допустимого уровня'),
('MORPHOLOGY_CHANGE', 'Изменение морфологии', 'Нетипичная морфология клеток'),
('PASSAGE_LIMIT', 'Достигнут лимит пассажей', 'Культура достигла максимального числа пассажей'),
('EXCESS', 'Избыток', 'Утилизация избыточного материала'),
('OTHER', 'Другое', 'Иная причина (указать в примечании)')
ON CONFLICT (code) DO NOTHING;
"@

Write-Host "=== Step 8: Insert culture_type_tissue_types ===" -ForegroundColor Cyan
Invoke-SupabaseSQL @"
INSERT INTO culture_type_tissue_types (culture_type_id, tissue_type_id, is_primary)
SELECT ct.id, tt.id, true FROM culture_types ct, tissue_types tt
WHERE (ct.code = 'MSC-AT' AND tt.code = 'FAT')
   OR (ct.code = 'MSC-BM' AND tt.code = 'BONE_MARROW')
   OR (ct.code = 'MSC-UC' AND tt.code = 'UMBILICAL_CORD')
   OR (ct.code = 'MSC-DP' AND tt.code = 'DENTAL_PULP')
   OR (ct.code = 'FIBRO' AND tt.code = 'SKIN')
   OR (ct.code = 'CHONDRO' AND tt.code = 'CARTILAGE')
   OR (ct.code = 'KERATINO' AND tt.code = 'SKIN')
   OR (ct.code = 'ADIPO' AND tt.code = 'FAT')
   OR (ct.code = 'OSTEO' AND tt.code = 'BONE')
   OR (ct.code = 'AMNIO' AND tt.code = 'AMNION')
   OR (ct.code = 'HSC' AND tt.code = 'BONE_MARROW')
   OR (ct.code = 'NK' AND tt.code = 'BLOOD')
   OR (ct.code = 'T-CELL' AND tt.code = 'BLOOD')
ON CONFLICT (culture_type_id, tissue_type_id) DO NOTHING;
INSERT INTO culture_type_tissue_types (culture_type_id, tissue_type_id, is_primary)
SELECT ct.id, tt.id, false FROM culture_types ct, tissue_types tt
WHERE (ct.code = 'MSC' AND tt.code IN ('FAT', 'BONE_MARROW', 'PLACENTA', 'CORD_BLOOD', 'UMBILICAL_CORD', 'WHARTON_JELLY', 'MUSCLE', 'DENTAL_PULP'))
   OR (ct.code = 'MSC-UC' AND tt.code = 'WHARTON_JELLY')
ON CONFLICT (culture_type_id, tissue_type_id) DO NOTHING;
"@

Write-Host "=== Step 9: Insert equipment ===" -ForegroundColor Cyan
Invoke-SupabaseSQL @"
INSERT INTO equipment (code, name, type, location, current_temperature, status) VALUES
('INC-01', 'CO2-инкубатор №1', 'INCUBATOR', 'Лаборатория 1', 37, 'ACTIVE'),
('INC-02', 'CO2-инкубатор №2', 'INCUBATOR', 'Лаборатория 1', 37, 'ACTIVE'),
('INC-03', 'CO2-инкубатор №3', 'INCUBATOR', 'Лаборатория 2', 37, 'ACTIVE'),
('FRIDGE-01', 'Холодильник +4C №1', 'REFRIGERATOR', 'Лаборатория 1', 4, 'ACTIVE'),
('FRIDGE-02', 'Холодильник +4C №2', 'REFRIGERATOR', 'Лаборатория 2', 4, 'ACTIVE'),
('FREEZER-01', 'Морозильник -20C', 'FREEZER', 'Лаборатория 1', -20, 'ACTIVE'),
('FREEZER-02', 'Морозильник -80C №1', 'FREEZER', 'Лаборатория 1', -80, 'ACTIVE'),
('FREEZER-03', 'Морозильник -80C №2', 'FREEZER', 'Лаборатория 2', -80, 'ACTIVE'),
('LN2-01', 'Сосуд Дьюара LN2 №1', 'LN2_TANK', 'Криохранилище', -196, 'ACTIVE'),
('LN2-02', 'Сосуд Дьюара LN2 №2', 'LN2_TANK', 'Криохранилище', -196, 'ACTIVE'),
('BSC-01', 'Ламинарный бокс №1', 'BSC', 'Лаборатория 1', null, 'ACTIVE'),
('BSC-02', 'Ламинарный бокс №2', 'BSC', 'Лаборатория 2', null, 'ACTIVE'),
('MICRO-01', 'Инвертированный микроскоп', 'MICROSCOPE', 'Лаборатория 1', null, 'ACTIVE'),
('CENT-01', 'Центрифуга', 'CENTRIFUGE', 'Лаборатория 1', null, 'ACTIVE');
"@

Write-Host "=== Step 10: Insert nomenclatures (media + reagents) ===" -ForegroundColor Cyan
Invoke-SupabaseSQL @"
INSERT INTO nomenclatures (code, name, category, unit, storage_requirements, is_active) VALUES
('DMEM-HG', 'DMEM (высокоглюкозный)', 'MEDIUM', 'мл', '+4C', true),
('DMEM-F12', 'DMEM/F12 (1:1)', 'MEDIUM', 'мл', '+4C', true),
('RPMI-1640', 'RPMI 1640', 'MEDIUM', 'мл', '+4C', true),
('MEM-ALPHA', 'MEM Alpha', 'MEDIUM', 'мл', '+4C', true),
('DMEM', 'DMEM', 'MEDIUM', 'мл', '+4C', true),
('FBS', 'FBS (сыворотка)', 'SERUM', 'мл', '-20C', true),
('FBS-HI', 'FBS (инактивированная)', 'SERUM', 'мл', '-20C', true),
('PEN-STREP', 'Пенициллин-Стрептомицин', 'REAGENT', 'мл', '-20C', true),
('L-GLUT', 'L-глутамин (200 мМ)', 'REAGENT', 'мл', '-20C', true),
('HEPES', 'HEPES буфер (1M)', 'REAGENT', 'мл', '+4C', true),
('TRYPSIN-005', 'Трипсин-ЭДТА 0.05%', 'REAGENT', 'мл', '-20C', true),
('TRYPSIN-025', 'Трипсин-ЭДТА 0.25%', 'REAGENT', 'мл', '-20C', true),
('PBS', 'PBS (фосфатный буфер)', 'REAGENT', 'мл', '+4C', true),
('DPBS', 'D-PBS (без Ca/Mg)', 'REAGENT', 'мл', '+4C', true),
('DMSO', 'ДМСО (криопротектор)', 'REAGENT', 'мл', 'RT', true),
('COLL-I', 'Коллагеназа I', 'REAGENT', 'мг', '-20C', true),
('COLL-II', 'Коллагеназа II', 'REAGENT', 'мг', '-20C', true),
('DISPASE', 'Диспаза', 'REAGENT', 'мг', '-20C', true),
('TRYPAN', 'Трипановый синий', 'REAGENT', 'мл', 'RT', true)
ON CONFLICT (code) DO NOTHING;
"@

Write-Host "=== Step 11: Insert nomenclatures (consumables with container_type_id) ===" -ForegroundColor Cyan
Invoke-SupabaseSQL @"
INSERT INTO nomenclatures (code, name, category, unit, storage_requirements, is_active, container_type_id)
SELECT v.code, v.name, 'CONTAINER', 'шт', 'RT', true, ct.id
FROM (VALUES
  ('NOM-FL25', 'Флакон T-25', 'FL25'),
  ('NOM-FL75', 'Флакон T-75', 'FL75'),
  ('NOM-FL175', 'Флакон T-175', 'FL175'),
  ('NOM-PL6', 'Планшет 6-лунок', 'PL6'),
  ('NOM-PL12', 'Планшет 12-лунок', 'PL12'),
  ('NOM-PL24', 'Планшет 24-лунок', 'PL24'),
  ('NOM-PL96', 'Планшет 96-лунок', 'PL96'),
  ('NOM-DISH35', 'Чашка Петри 35 мм', 'DISH35'),
  ('NOM-DISH60', 'Чашка Петри 60 мм', 'DISH60'),
  ('NOM-DISH100', 'Чашка Петри 100 мм', 'DISH100'),
  ('NOM-CRYO', 'Криовиала 2 мл', 'CRYO')
) AS v(code, name, ct_code)
JOIN container_types ct ON ct.code = v.ct_code
ON CONFLICT (code) DO NOTHING;
"@

Write-Host "=== Step 12: Insert nomenclatures (other consumables) ===" -ForegroundColor Cyan
Invoke-SupabaseSQL @"
INSERT INTO nomenclatures (code, name, category, unit, storage_requirements, is_active) VALUES
('PIP-5', 'Серологические пипетки 5 мл', 'CONSUMABLE', 'шт', 'RT', true),
('PIP-10', 'Серологические пипетки 10 мл', 'CONSUMABLE', 'шт', 'RT', true),
('PIP-25', 'Серологические пипетки 25 мл', 'CONSUMABLE', 'шт', 'RT', true),
('TIP-200', 'Наконечники 200 мкл', 'CONSUMABLE', 'шт', 'RT', true),
('TIP-1000', 'Наконечники 1000 мкл', 'CONSUMABLE', 'шт', 'RT', true),
('TUBE-15', 'Центрифужные пробирки 15 мл', 'CONSUMABLE', 'шт', 'RT', true),
('TUBE-50', 'Центрифужные пробирки 50 мл', 'CONSUMABLE', 'шт', 'RT', true)
ON CONFLICT (code) DO NOTHING;
"@

Write-Host "=== Step 13: Insert users ===" -ForegroundColor Cyan
Invoke-SupabaseSQL @"
INSERT INTO users (email, full_name, role, department) VALUES
('admin@labpro.local', 'Администратор', 'ADMIN', 'IT'),
('operator1@labpro.local', 'Иванов Иван Иванович', 'OPERATOR', 'Лаборатория'),
('operator2@labpro.local', 'Петров Пётр Петрович', 'OPERATOR', 'Лаборатория'),
('laborant1@labpro.local', 'Сидорова Анна Сергеевна', 'LABORANT', 'Лаборатория'),
('manager1@labpro.local', 'Козлов Алексей Дмитриевич', 'MANAGER', 'Управление'),
('qc1@labpro.local', 'Новикова Мария Александровна', 'QC_ADMIN', 'QC')
ON CONFLICT (email) DO NOTHING;
"@

Write-Host ""
Write-Host "=== Verification ===" -ForegroundColor Green
$counts = @(
    @{Table="tissue_types"; Expected=13},
    @{Table="culture_types"; Expected=16},
    @{Table="container_types"; Expected=11},
    @{Table="morphology_types"; Expected=9},
    @{Table="dispose_reasons"; Expected=8},
    @{Table="nomenclatures"; Expected=37},
    @{Table="equipment"; Expected=14},
    @{Table="users"; Expected=6},
    @{Table="culture_type_tissue_types"; Expected=22}
)

foreach ($item in $counts) {
    $result = Invoke-SupabaseSQL "SELECT count(*) as cnt FROM $($item.Table)"
    $actual = $result[0].cnt
    $status = if ($actual -ge $item.Expected) { "OK" } else { "WARN" }
    Write-Host "  $($item.Table): $actual rows ($status, expected >= $($item.Expected))" -ForegroundColor $(if ($status -eq "OK") { "Green" } else { "Yellow" })
}

# Verify encoding
Write-Host ""
Write-Host "=== Encoding check ===" -ForegroundColor Green
$sample = Invoke-SupabaseSQL "SELECT code, name FROM tissue_types WHERE code = 'SKIN'"
Write-Host "  SKIN = $($sample[0].name)" -ForegroundColor Cyan
$sample2 = Invoke-SupabaseSQL "SELECT code, name FROM container_types WHERE code = 'FL75'"
Write-Host "  FL75 = $($sample2[0].name)" -ForegroundColor Cyan
$sample3 = Invoke-SupabaseSQL "SELECT code, name FROM equipment WHERE code = 'INC-01'"
Write-Host "  INC-01 = $($sample3[0].name)" -ForegroundColor Cyan

Write-Host ""
Write-Host "=== DONE ===" -ForegroundColor Green
