-- LabPro Reference Data Seed
-- Generated: 30.01.2026

-- ============================================
-- REFERENCE DATA (Справочники)
-- ============================================

-- Culture Types
INSERT INTO culture_types (code, name, description, growth_rate, optimal_confluent, passage_interval_days, freezing_protocol, thaw_protocol) VALUES
('MSC', 'Мезенхимальные стволовые клетки', 'Мезенхимальные стволовые клетки жировой ткани', 1.0, 80, 3, 
 'Стандартный протокол заморозки: 1°C/мин до -80°C, затем в жидкий азот',
 'Разморозка на водяной бане 37°C, немедленное разведение средой'),
('CHONDRO', 'Хондроциты', 'Хондроциты суставного хряща', 0.8, 70, 4,
 'Заморозка в DMSO с контролируемой скоростью',
 'Постепенное размораживание с добавлением среды'),
(' fibroblast', 'Фибробласты', 'Кожные фибробласты', 1.2, 85, 2,
 'Стандартный протокол заморозки',
 'Стандартный протокол разморозки'),
('HEK293', 'HEK293', 'Эмбриональные почечные клетки человека', 1.5, 90, 2,
 'Протокол для быстрорастущих линий',
 'Быстрая разморозка'),
('CHO', 'CHO', 'Клетки яичников китайского хомячка', 1.3, 88, 2,
 'Специализированный протокол для CHO',
 'Специализированный протокол разморозки');

-- Container Types
INSERT INTO container_types (code, name, surface_area_cm2, volume_ml, is_cryo) VALUES
('FL', 'Флакон T-25', 25, 5, false),
('FL75', 'Флакон T-75', 75, 15, false),
('FL175', 'Флакон T-175', 175, 30, false),
('PL6', 'Планшет 6-луночный', 9.6, 2, false),
('PL12', 'Планшет 12-луночный', 3.8, 1, false),
('PL24', 'Планшет 24-луночный', 1.9, 0.5, false),
('CRYO', 'Криовиал', 0, 1, true),
('PETRI60', 'Чашка Петри 60мм', 28, 5, false),
('PETRI100', 'Чашка Петри 100мм', 55, 10, false);

-- Medium Types
INSERT INTO medium_types (code, name, category, default_volume_ml, storage_temp, shelf_life_days) VALUES
('DMEM', 'DMEM (Dulbecco''s Modified Eagle Medium)', 'BASE', 500, 4, 30),
('DMEMF12', 'DMEM/F12 (1:1)', 'BASE', 500, 4, 30),
('RPM1640', 'RPMI 1640', 'BASE', 500, 4, 30),
('MEM', 'Minimum Essential Medium (MEM)', 'BASE', 500, 4, 30),
('FBS', 'Fetal Bovine Serum', 'SERUM', 50, -20, 365),
('FBS_GI', 'FBS (Growth inactivated)', 'SERUM', 50, -20, 365),
('PENSTREP', 'Penicillin-Streptomycin', 'ANTIBIOTIC', 100, -20, 180),
('LGLN', 'L-Glutamine', 'ADDITIVE', 100, -20, 180),
('NONESS', 'Non-Essential Amino Acids', 'ADDITIVE', 100, 4, 90),
('HEPES', 'HEPES Buffer', 'ADDITIVE', 100, 4, 180),
('TRYPSIN', 'Trypsin-EDTA (0.05%)', 'REAGENT', 100, -20, 90),
('DPBS', 'Dulbecco''s PBS', 'REAGENT', 500, 4, 365);

-- Operation Types
INSERT INTO operation_types (code, name, description, requires_containers, requires_mediums, requires_metrics, requires_position, is_disposable) VALUES
('OBSERVE', 'Осмотр', 'Фиксация состояния контейнеров (конфлюэнтность, морфология, контаминация)', true, false, false, false, false),
('FEED', 'Подкормка', 'Добавление свежей среды в контейнеры', true, true, false, false, false),
('PASSAGE', 'Пассаж', 'Пересев клеток в новые контейнеры', true, true, true, true, true),
('FREEZE', 'Заморозка', 'Создание криобанка', true, true, true, true, false),
('THAW', 'Разморозка', 'Размораживание криовиалов', false, true, false, true, false),
('DISPOSE', 'Утилизация', 'Утилизация контейнера, партии или среды', false, false, false, false, false),
('QCREG', 'QC Регистрация', 'Регистрация QC-теста', false, false, false, false, false);

-- Morphology Types
INSERT INTO morphology_types (code, name, description) VALUES
('SPINDLE', 'Веретенообразная', 'Веретенообразная морфология (характерно для MSC)',
('FIBROBLAST', 'Фибробластоподобная', 'Фибробластоподобная морфология',
('COBblestone', 'Булыжниковая', 'Булыжниковая морфология (эпителиальные)',
('POLYGONAL', 'Полигональная', 'Полигональная форма клеток',
('ROUND', 'Округлая', 'Округлая форма клеток',
('STAR', 'Звёздчатая', 'Звёздчатая форма клеток',
('CLUSTER', 'Кластеры', 'Рост кластерами',
('MONOLAYER', 'Монослой', 'Рост монослоем');

-- QC Test Types
INSERT INTO qc_test_types (code, name, duration_days, target_types) VALUES
('MYCOPLASMA', 'Микоплазма', 3, '["CULTURE", "LOT", "CONTAINER", "BANK"]'::jsonb),
('STERILITY', 'Стерильность', 7, '["BANK", "READY_MEDIUM"]'::jsonb),
('LAL', 'LAL-тест (эндотоксин)', 1, '["BANK", "READY_MEDIUM"]'::jsonb),
('VIA', 'Viability Assay (жизнеспособность)', 1, '["CULTURE", "LOT", "BANK"]'::jsonb);

-- Dispose Reasons
INSERT INTO dispose_reasons (code, name, description) VALUES
('EXPIRED', 'Истёк срок годности', 'Материал или партия с истёкшим сроком годности',
('CONTAMINATED', 'Контаминация', 'Выявлена бактериальная/грибковая контаминация',
('MYCOPLASMA_POS', 'Микоплазма положительно', 'Положительный тест на микоплазму',
('LOW_VIABILITY', 'Низкая жизнеспособность', 'Жизнеспособность ниже порогового значения',
('PASSAGE_LIMIT', 'Достигнут лимит пассажей', 'Культура достигла максимального числа пассажей',
('EXPERIMENT_END', 'Завершение эксперимента', 'Окончание экспериментальной программы',
('QUALITY_ISSUE', 'Проблема качества', 'Несоответствие стандартам качества',
('OTHER', 'Другое', 'Другая причина');

-- ============================================
-- EQUIPMENT (Оборудование)
-- ============================================

INSERT INTO equipment (code, name, type, location, temperature, status) VALUES
('INC-01', 'Инкубатор 1', 'INCUBATOR', 'Лаборатория 1', 37, 'ACTIVE'),
('INC-02', 'Инкубатор 2', 'INCUBATOR', 'Лаборатория 1', 37, 'ACTIVE'),
('INC-03', 'Инкубатор 3', 'INCUBATOR', 'Лаборатория 1', 37, 'ACTIVE'),
('FRIDGE-01', 'Холодильник 1', 'FRIDGE', 'Лаборатория 1', 4, 'ACTIVE'),
('FRIDGE-02', 'Холодильник 2', 'FRIDGE', 'Лаборатория 2', 4, 'ACTIVE'),
('FREEZER-80-01', 'Морозильник -80°C', 'FREEZER', 'Лаборатория 1', -80, 'ACTIVE'),
('FREEZER-80-02', 'Морозильник -80°C', 'FREEZER', 'Лаборатория 2', -80, 'ACTIVE'),
('CRYO-01', 'Криохранилище LN2', 'FREEZER', 'Лаборатория 1', -196, 'ACTIVE');

-- ============================================
-- USERS (Пользователи)
-- ============================================

-- Примечание: пароли хешируются через Supabase Auth, здесь только профили
INSERT INTO users (username, email, full_name, role) VALUES
('admin', 'admin@labpro.local', 'Администратор', 'ADMIN'),
('operator1', 'operator1@labpro.local', 'Иванов Иван', 'OPERATOR'),
('operator2', 'operator2@labpro.local', 'Петров Петр', 'OPERATOR'),
('laborant1', 'laborant1@labpro.local', 'Сидорова Анна', 'LABORANT'),
('manager1', 'manager1@labpro.local', 'Козлов Алексей', 'MANAGER'),
('qc1', 'qc1@labpro.local', 'Новикова Мария', 'QC_ADMIN');

-- ============================================
-- NOMENCLATURE (Номенклатура)
-- ============================================

INSERT INTO nomenclatures (name, category, unit, storage_temp) VALUES
('DMEM (высокоглюкозный)', 'MEDIUM', 'мл', 4),
('DMEM/F12 (1:1)', 'MEDIUM', 'мл', 4),
('RPMI 1640', 'MEDIUM', 'мл', 4),
('FBS (эмбриональная бычья сыворотка)', 'SERUM', 'мл', -20),
('FBS (инактивированная ростом)', 'SERUM', 'мл', -20),
('Пенициллин-Стрептомицин', 'REAGENT', 'мл', -20),
('L-Glutamine (200mM)', 'REAGENT', 'мл', -20),
('HEPES (1M)', 'REAGENT', 'мл', 4),
('Trypsin-EDTA (0.05%)', 'REAGENT', 'мл', -20),
('D-PBS (без Ca/Mg)', 'CONSUMABLE', 'мл', 4),
('Флакон T-75', 'CONSUMABLE', 'шт', 4),
('Флакон T-175', 'CONSUMABLE', 'шт', 4),
('Планшет 6-луночный', 'CONSUMABLE', 'шт', 4),
('Криовиалы 2мл', 'CONSUMABLE', 'шт', 4);
