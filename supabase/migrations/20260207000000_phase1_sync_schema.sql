-- ============================================
-- PHASE 1: Sync schema with ТЗ + business rules
-- Date: 2026-02-07
-- ============================================
-- Что делаем:
-- 1. extraction_method в cultures (способ первичного выделения)
-- 2. Связь culture_types ↔ tissue_types (тип клеток зависит от типа ткани)
-- 3. Расширение culture_types (growth_rate, optimal_confluent и т.д.)
-- 4. Расширение container_types (surface_area_cm2, is_cryo)
-- 5. Таблица notifications (если нет)
-- 6. Поле code в equipment
-- 7. Комментарии к бизнес-правилам

-- ============================================
-- 1. EXTRACTION METHOD в cultures
-- ============================================
-- Способ первичного выделения клеток из ткани донации
-- (ферментативный, эксплантный, механический и т.д.)

ALTER TABLE cultures ADD COLUMN IF NOT EXISTS extraction_method TEXT;
-- Допустимые значения: ENZYMATIC, EXPLANT, MECHANICAL, OTHER
-- NULL допустимо для старых записей

COMMENT ON COLUMN cultures.extraction_method IS 'Способ первичного выделения клеток: ENZYMATIC (ферментативный), EXPLANT (эксплантный), MECHANICAL (механический), OTHER';

-- ============================================
-- 2. СВЯЗЬ culture_types ↔ tissue_types
-- ============================================
-- Тип клеток зависит от типа ткани из донации
-- Например: из жировой ткани можно получить MSC, из хряща — хондроциты

CREATE TABLE IF NOT EXISTS culture_type_tissue_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    culture_type_id UUID NOT NULL REFERENCES culture_types(id) ON DELETE CASCADE,
    tissue_type_id UUID NOT NULL REFERENCES tissue_types(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false, -- основной тип клеток для этой ткани
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(culture_type_id, tissue_type_id)
);

COMMENT ON TABLE culture_type_tissue_types IS 'Связь типов клеток с типами тканей. Определяет какие типы клеток можно выделить из какой ткани.';

CREATE INDEX IF NOT EXISTS idx_cttt_culture_type ON culture_type_tissue_types(culture_type_id);
CREATE INDEX IF NOT EXISTS idx_cttt_tissue_type ON culture_type_tissue_types(tissue_type_id);

-- ============================================
-- 3. РАСШИРЕНИЕ culture_types
-- ============================================
-- Добавляем поля из ТЗ если их ещё нет

ALTER TABLE culture_types ADD COLUMN IF NOT EXISTS growth_rate NUMERIC;
ALTER TABLE culture_types ADD COLUMN IF NOT EXISTS optimal_confluent INTEGER;
ALTER TABLE culture_types ADD COLUMN IF NOT EXISTS passage_interval_days INTEGER;
ALTER TABLE culture_types ADD COLUMN IF NOT EXISTS freezing_protocol TEXT;
ALTER TABLE culture_types ADD COLUMN IF NOT EXISTS thaw_protocol TEXT;

COMMENT ON COLUMN culture_types.growth_rate IS 'Коэффициент роста (для прогноза конфлюэнтности)';
COMMENT ON COLUMN culture_types.optimal_confluent IS 'Оптимальная конфлюэнтность для пассажа (%)';
COMMENT ON COLUMN culture_types.passage_interval_days IS 'Типичный интервал между пассажами (дней)';

-- ============================================
-- 4. РАСШИРЕНИЕ container_types
-- ============================================

ALTER TABLE container_types ADD COLUMN IF NOT EXISTS surface_area_cm2 NUMERIC;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS is_cryo BOOLEAN DEFAULT false;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS volume_ml NUMERIC;
ALTER TABLE container_types ADD COLUMN IF NOT EXISTS optimal_confluent INTEGER;

COMMENT ON COLUMN container_types.surface_area_cm2 IS 'Площадь поверхности роста (см²)';
COMMENT ON COLUMN container_types.is_cryo IS 'Является ли контейнер криовиалой';

-- ============================================
-- 5. EQUIPMENT — поле code
-- ============================================

ALTER TABLE equipment ADD COLUMN IF NOT EXISTS code TEXT;

-- Создаём уникальный индекс, но только если code не NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_equipment_code ON equipment(code) WHERE code IS NOT NULL;

COMMENT ON COLUMN equipment.code IS 'Уникальный код оборудования (INC-01, FRIDGE-02 и т.д.)';

-- Добавляем поля валидации/обслуживания из замечаний оператора
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS validation_date DATE;
ALTER TABLE equipment ADD COLUMN IF NOT EXISTS next_validation DATE;

COMMENT ON COLUMN equipment.validation_date IS 'Дата последней валидации';
COMMENT ON COLUMN equipment.next_validation IS 'Дата следующей валидации';

-- ============================================
-- 6. NOTIFICATIONS таблица
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL, -- QC_READY, ORDER_DEADLINE, CRITICAL_FEFO, EQUIPMENT_ALERT, CONTAMINATION
    title TEXT NOT NULL,
    message TEXT,
    link_type TEXT,     -- CULTURE, LOT, CONTAINER, ORDER, QC, EQUIPMENT, BANK, DONATION
    link_id UUID,
    user_id UUID REFERENCES users(id), -- для кого уведомление (NULL = для всех)
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================
-- 7. TASKS — расширение полей по ТЗ
-- ============================================
-- Добавляем поля target_type/target_id для универсальной привязки

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_type TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS target_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS interval_days INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_done_date DATE;

COMMENT ON COLUMN tasks.target_type IS 'Тип целевого объекта: CULTURE, LOT, CONTAINER, BANK, EQUIPMENT, BATCH';
COMMENT ON COLUMN tasks.target_id IS 'ID целевого объекта';
COMMENT ON COLUMN tasks.interval_days IS 'Интервал повтора задачи (дней)';

-- ============================================
-- 8. DONATIONS — поле updated_at
-- ============================================

ALTER TABLE donations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Триггер updated_at для donations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_donations_updated_at') THEN
        CREATE TRIGGER update_donations_updated_at BEFORE UPDATE ON donations
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- 9. BANKS — поле position_id и expiration_date
-- ============================================

ALTER TABLE banks ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES positions(id);
ALTER TABLE banks ADD COLUMN IF NOT EXISTS expiration_date DATE;

-- ============================================
-- 10. CRYO_VIALS — поле code и position_id
-- ============================================

ALTER TABLE cryo_vials ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE cryo_vials ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES positions(id);

-- Уникальный индекс на code, если code не NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_cryo_vials_code ON cryo_vials(code) WHERE code IS NOT NULL;

-- ============================================
-- 11. CONTAINERS — parent_container_id
-- ============================================

ALTER TABLE containers ADD COLUMN IF NOT EXISTS parent_container_id UUID REFERENCES containers(id);

-- ============================================
-- 12. SEED: Типы тканей (если нет данных)
-- ============================================

INSERT INTO tissue_types (code, name, tissue_form) VALUES
    ('SKIN', 'Кожа (дерма)', 'SOLID'),
    ('FAT', 'Жировая ткань', 'SOLID'),
    ('CARTILAGE', 'Хрящевая ткань', 'SOLID'),
    ('BONE_MARROW', 'Костный мозг', 'LIQUID'),
    ('BLOOD', 'Кровь', 'LIQUID'),
    ('MUSCLE', 'Мышечная ткань', 'SOLID'),
    ('PLACENTA', 'Плацента', 'SOLID'),
    ('CORD_BLOOD', 'Пуповинная кровь', 'LIQUID')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 13. SEED: Типы культур (если нет данных)
-- ============================================

INSERT INTO culture_types (code, name, description, growth_rate, optimal_confluent, passage_interval_days) VALUES
    ('MSC', 'Мезенхимальные стволовые клетки', 'Мультипотентные стромальные клетки', 1.5, 85, 3),
    ('MSC-M', 'МСК из костного мозга', 'МСК выделенные из костного мозга', 1.3, 85, 4),
    ('FIBRO', 'Фибробласты', 'Дермальные фибробласты', 2.0, 90, 2),
    ('CHONDRO', 'Хондроциты', 'Клетки хрящевой ткани', 1.0, 80, 5),
    ('KERATINO', 'Кератиноциты', 'Эпидермальные кератиноциты', 1.8, 85, 3),
    ('ADIPO', 'Адипоциты', 'Жировые клетки', 1.2, 80, 4),
    ('HEK293', 'HEK293', 'Human Embryonic Kidney 293', 2.5, 90, 2)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 14. SEED: Связи типов клеток с типами тканей
-- ============================================

INSERT INTO culture_type_tissue_types (culture_type_id, tissue_type_id, is_primary)
SELECT ct.id, tt.id, true
FROM culture_types ct, tissue_types tt
WHERE (ct.code = 'MSC' AND tt.code = 'FAT')
   OR (ct.code = 'FIBRO' AND tt.code = 'SKIN')
   OR (ct.code = 'CHONDRO' AND tt.code = 'CARTILAGE')
   OR (ct.code = 'KERATINO' AND tt.code = 'SKIN')
   OR (ct.code = 'ADIPO' AND tt.code = 'FAT')
   OR (ct.code = 'MSC-M' AND tt.code = 'BONE_MARROW')
ON CONFLICT (culture_type_id, tissue_type_id) DO NOTHING;

-- Дополнительные (вторичные) связи
INSERT INTO culture_type_tissue_types (culture_type_id, tissue_type_id, is_primary)
SELECT ct.id, tt.id, false
FROM culture_types ct, tissue_types tt
WHERE (ct.code = 'MSC' AND tt.code IN ('BONE_MARROW', 'PLACENTA', 'CORD_BLOOD'))
   OR (ct.code = 'MSC' AND tt.code = 'MUSCLE')
ON CONFLICT (culture_type_id, tissue_type_id) DO NOTHING;

-- ============================================
-- 15. SEED: Типы контейнеров (если нет данных)
-- ============================================

INSERT INTO container_types (code, name, surface_area_cm2, volume_ml, is_cryo) VALUES
    ('FL25', 'Флакон T-25', 25, 5, false),
    ('FL75', 'Флакон T-75', 75, 15, false),
    ('FL175', 'Флакон T-175', 175, 35, false),
    ('PL6', 'Планшет 6-лунок', 9.6, 3, false),
    ('PL12', 'Планшет 12-лунок', 3.8, 1.5, false),
    ('PL24', 'Планшет 24-лунок', 1.9, 1, false),
    ('PL96', 'Планшет 96-лунок', 0.32, 0.2, false),
    ('CRYO', 'Криовиала', NULL, 2, true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 16. SEED: Типы морфологии (если нет данных)
-- ============================================

INSERT INTO morphology_types (code, name, description) VALUES
    ('SPINDLE', 'Веретеновидная', 'Типичная морфология MSC'),
    ('COBBLESTONE', 'Булыжниковая', 'Характерна для эпителиальных клеток'),
    ('ROUND', 'Округлая', 'Неприкрепившиеся или откреплённые клетки'),
    ('FIBROBLAST', 'Фибробластоподобная', 'Вытянутые клетки с отростками'),
    ('POLYGONAL', 'Полигональная', 'Многоугольная форма'),
    ('MIXED', 'Смешанная', 'Смесь морфологий')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 17. SEED: Причины утилизации (если нет данных)
-- ============================================

INSERT INTO dispose_reasons (code, name, description) VALUES
    ('CONTAMINATION', 'Контаминация', 'Бактериальная, грибковая или микоплазменная контаминация'),
    ('EXPIRED', 'Истёк срок', 'Срок годности истёк'),
    ('QC_FAILED', 'QC не пройден', 'Не пройден контроль качества'),
    ('LOW_VIABILITY', 'Низкая жизнеспособность', 'Жизнеспособность ниже допустимого уровня'),
    ('MORPHOLOGY_CHANGE', 'Изменение морфологии', 'Нетипичная морфология клеток'),
    ('EXCESS', 'Избыток', 'Утилизация избыточного материала'),
    ('OTHER', 'Другое', 'Иная причина (указать в примечании)')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 18. БИЗНЕС-ПРАВИЛА — комментарии
-- ============================================

COMMENT ON TABLE cultures IS 'Клеточные культуры. При создании из донации первый лот ВСЕГДА создаётся с passage_number=0 (P0 — первичная культура до первого пересева).';
COMMENT ON TABLE lots IS 'Лоты (пассажи) культуры. passage_number=0 для первичной культуры. Нумерация: P0→P1→P2...';
COMMENT ON TABLE donations IS 'Донации. Статус QUARANTINE НЕ блокирует культивирование (осмотр, подкормку, пассаж). Блокирует ТОЛЬКО заморозку для выдачи и выдачу клеток.';

-- ============================================
-- DONE
-- ============================================
