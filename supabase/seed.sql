-- LabPro Reference Data Seed
-- Updated: 01.02.2026
-- Compatible with current schema

-- ============================================
-- REFERENCE DATA (Справочники)
-- ============================================

-- Culture Types
INSERT INTO culture_types (code, name, description, is_active) VALUES
('MSC', 'Мезенхимальные стволовые клетки', 'Мезенхимальные стволовые клетки жировой ткани', true),
('CHONDRO', 'Хондроциты', 'Хондроциты суставного хряща', true),
('fibroblast', 'Фибробласты', 'Кожные фибробласты', true),
('HEK293', 'HEK293', 'Эмбриональные почечные клетки человека', true),
('CHO', 'CHO', 'Клетки яичников китайского хомячка', true)
ON CONFLICT (code) DO NOTHING;

-- Container Types
INSERT INTO container_types (code, name, capacity_ml, is_active) VALUES
('FL', 'Флакон T-25', 5, true),
('FL75', 'Флакон T-75', 15, true),
('FL175', 'Флакон T-175', 30, true),
('PL6', 'Планшет 6-луночный', 2, true),
('PL12', 'Планшет 12-луночный', 1, true),
('PL24', 'Планшет 24-луночный', 0.5, true),
('CRYO', 'Криовиал', 1, true),
('PETRI60', 'Чашка Петри 60мм', 5, true),
('PETRI100', 'Чашка Петри 100мм', 10, true)
ON CONFLICT (code) DO NOTHING;

-- Morphology Types
INSERT INTO morphology_types (code, name, description) VALUES
('SPINDLE', 'Веретенообразная', 'Веретенообразная морфология (характерно для MSC)'),
('FIBROBLAST', 'Фибробластоподобная', 'Фибробластоподобная морфология'),
('COBblestone', 'Булыжниковая', 'Булыжниковая морфология (эпителиальные)'),
('POLYGONAL', 'Полигональная', 'Полигональная форма клеток'),
('ROUND', 'Округлая', 'Округлая форма клеток'),
('STAR', 'Звёздчатая', 'Звёздчатая форма клеток'),
('CLUSTER', 'Кластеры', 'Рост кластерами'),
('MONOLAYER', 'Монослой', 'Рост монослоем')
ON CONFLICT (code) DO NOTHING;

-- Dispose Reasons
INSERT INTO dispose_reasons (code, name, description) VALUES
('EXPIRED', 'Истёк срок годности', 'Материал или партия с истёкшим сроком годности'),
('CONTAMINATED', 'Контаминация', 'Выявлена бактериальная/грибковая контаминация'),
('MYCOPLASMA_POS', 'Микоплазма положительно', 'Положительный тест на микоплазму'),
('LOW_VIABILITY', 'Низкая жизнеспособность', 'Жизнеспособность ниже порогового значения'),
('PASSAGE_LIMIT', 'Достигнут лимит пассажей', 'Культура достигла максимального числа пассажей'),
('EXPERIMENT_END', 'Завершение эксперимента', 'Окончание экспериментальной программы'),
('QUALITY_ISSUE', 'Проблема качества', 'Несоответствие стандартам качества'),
('OTHER', 'Другое', 'Другая причина')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- EQUIPMENT (Оборудование)
-- ============================================

INSERT INTO equipment (name, type, location, current_temperature, status) VALUES
('Инкубатор 1', 'INCUBATOR', 'Лаборатория 1', 37, 'ACTIVE'),
('Инкубатор 2', 'INCUBATOR', 'Лаборатория 1', 37, 'ACTIVE'),
('Инкубатор 3', 'INCUBATOR', 'Лаборатория 1', 37, 'ACTIVE'),
('Холодильник 1', 'FRIDGE', 'Лаборатория 1', 4, 'ACTIVE'),
('Холодильник 2', 'FRIDGE', 'Лаборатория 2', 4, 'ACTIVE'),
('Морозильник -80°C 1', 'FREEZER', 'Лаборатория 1', -80, 'ACTIVE'),
('Морозильник -80°C 2', 'FREEZER', 'Лаборатория 2', -80, 'ACTIVE'),
('Криохранилище LN2', 'FREEZER', 'Лаборатория 1', -196, 'ACTIVE');

-- ============================================
-- USERS (Пользователи)
-- ============================================

INSERT INTO users (email, full_name, role, department) VALUES
('admin@labpro.local', 'Администратор', 'ADMIN', 'IT'),
('operator1@labpro.local', 'Иванов Иван', 'OPERATOR', 'Лаборатория'),
('operator2@labpro.local', 'Петров Петр', 'OPERATOR', 'Лаборатория'),
('laborant1@labpro.local', 'Сидорова Анна', 'LABORANT', 'Лаборатория'),
('manager1@labpro.local', 'Козлов Алексей', 'MANAGER', 'Управление'),
('qc1@labpro.local', 'Новикова Мария', 'QC_ADMIN', 'QC')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- NOMENCLATURE (Номенклатура)
-- ============================================

INSERT INTO nomenclatures (code, name, category, unit, storage_requirements, is_active) VALUES
('DMEM-HG', 'DMEM (высокоглюкозный)', 'MEDIUM', 'мл', '4°C', true),
('DMEM-F12', 'DMEM/F12 (1:1)', 'MEDIUM', 'мл', '4°C', true),
('RPMI-1640', 'RPMI 1640', 'MEDIUM', 'мл', '4°C', true),
('FBS', 'FBS (эмбриональная бычья сыворотка)', 'SERUM', 'мл', '-20°C', true),
('FBS-GI', 'FBS (инактивированная ростом)', 'SERUM', 'мл', '-20°C', true),
('PEN-STREP', 'Пенициллин-Стрептомицин', 'REAGENT', 'мл', '-20°C', true),
('L-GLUT', 'L-Glutamine (200mM)', 'REAGENT', 'мл', '-20°C', true),
('HEPES', 'HEPES Buffer (1M)', 'REAGENT', 'мл', '4°C', true),
('TRYPSIN', 'Trypsin-EDTA (0.05%)', 'REAGENT', 'мл', '-20°C', true),
('DPBS', 'D-PBS (без Ca/Mg)', 'CONSUMABLE', 'мл', '4°C', true),
('FL75', 'Флакон T-75', 'CONSUMABLE', 'шт', '4°C', true),
('FL175', 'Флакон T-175', 'CONSUMABLE', 'шт', '4°C', true),
('PL6', 'Планшет 6-луночный', 'CONSUMABLE', 'шт', '4°C', true),
('CRYO-2ML', 'Криовиалы 2мл', 'CONSUMABLE', 'шт', '4°C', true)
ON CONFLICT (code) DO NOTHING;
