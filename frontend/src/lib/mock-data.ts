// Mock Data for LabPro Demo
// Используется для тестирования без реальной БД

import { Culture, CultureType, Donor, Tissue, Lot, Container, ContainerType, Bank, CryoVial, Batch, Nomenclature, Order, Task, Notification, DashboardStats, Equipment, Position, ReadyMedium, QCTest, User } from '@/types'

// Culture Types
export const mockCultureTypes: CultureType[] = [
  { id: '1', code: 'MSC', name: 'Мезенхимальные стволовые клетки', description: 'Мезенхимальные стволовые клетки жировой ткани', growth_rate: 1.0, optimal_confluent: 80, passage_interval_days: 3, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: '2', code: 'CHONDRO', name: 'Хондроциты', description: 'Хондроциты суставного хряща', growth_rate: 0.8, optimal_confluent: 70, passage_interval_days: 4, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: '3', code: 'HEK293', name: 'HEK293', description: 'Эмбриональные почечные клетки человека', growth_rate: 1.5, optimal_confluent: 90, passage_interval_days: 2, is_active: true, created_at: '2026-01-01T00:00:00Z' },
]

// Donors
export const mockDonors: Donor[] = [
  { id: '1', code: 'DN-0001', age: 35, gender: 'F', tissue_type: 'Жировая', collection_date: '2026-01-10', notes: 'Донор без патологий', created_at: '2026-01-10T00:00:00Z' },
  { id: '2', code: 'DN-0002', age: 45, gender: 'M', tissue_type: 'Хрящевая', collection_date: '2026-01-15', notes: 'Здоровый донор', created_at: '2026-01-15T00:00:00Z' },
]

// Tissues
export const mockTissues: Tissue[] = [
  { id: '1', donor_id: '1', type: 'Жировая ткань', weight_kg: 0.5, passage_yield: 0.85, created_at: '2026-01-10T00:00:00Z' },
  { id: '2', donor_id: '2', type: 'Хрящевая ткань', weight_kg: 0.3, passage_yield: 0.75, created_at: '2026-01-15T00:00:00Z' },
]

// Container Types
export const mockContainerTypes: ContainerType[] = [
  { id: '1', code: 'FL75', name: 'Флакон T-75', surface_area_cm2: 75, volume_ml: 15, is_cryo: false, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: '2', code: 'FL175', name: 'Флакон T-175', surface_area_cm2: 175, volume_ml: 30, is_cryo: false, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: '3', code: 'CRYO', name: 'Криовиал', surface_area_cm2: 0, volume_ml: 1, is_cryo: true, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: '4', code: 'PL6', name: 'Планшет 6-луночный', surface_area_cm2: 9.6, volume_ml: 2, is_cryo: false, is_active: true, created_at: '2026-01-01T00:00:00Z' },
]

// Equipment
export const mockEquipment: Equipment[] = [
  { id: '1', code: 'INC-01', name: 'Инкубатор 1', type: 'INCUBATOR', location: 'Лаборатория 1', temperature: 37, status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z' },
  { id: '2', code: 'INC-02', name: 'Инкубатор 2', type: 'INCUBATOR', location: 'Лаборатория 1', temperature: 37, status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z' },
  { id: '3', code: 'FRIDGE-01', name: 'Холодильник 1', type: 'FRIDGE', location: 'Лаборатория 1', temperature: 4, status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z' },
  { id: '4', code: 'CRYO-01', name: 'Криохранилище LN2', type: 'FREEZER', location: 'Лаборатория 1', temperature: -196, status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z' },
]

// Positions
export const mockPositions: Position[] = [
  { id: '1', equipment_id: '1', code: 'POS-0001', qr_code: 'POS-0001', path: 'INC-01/Полка-1/A1', capacity: 10, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: '2', equipment_id: '1', code: 'POS-0002', qr_code: 'POS-0002', path: 'INC-01/Полка-1/A2', capacity: 10, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: '3', equipment_id: '4', code: 'POS-0003', qr_code: 'POS-0003', path: 'CRYO-01/Полка-C/01', capacity: 100, is_active: true, created_at: '2026-01-01T00:00:00Z' },
]

// Lots
export const mockLots: Lot[] = [
  { id: '1', culture_id: '1', passage_number: 1, status: 'ACTIVE', start_date: '2026-01-15', notes: '', created_at: '2026-01-15T00:00:00Z' },
  { id: '2', culture_id: '1', passage_number: 2, status: 'ACTIVE', start_date: '2026-01-20', notes: '', created_at: '2026-01-20T00:00:00Z' },
  { id: '3', culture_id: '2', passage_number: 1, status: 'ACTIVE', start_date: '2026-01-18', notes: '', created_at: '2026-01-18T00:00:00Z' },
]

// Containers
export const mockContainers: Container[] = [
  { id: '1', lot_id: '1', code: 'CT-0001-L1-P1-FL75-001', container_type_id: '1', container_status: 'ACTIVE', position_id: '1', confluent_percent: 85, morphology: 'Spindle', contaminated: false, placed_at: '2026-01-15T10:00:00Z', created_at: '2026-01-15T00:00:00Z' },
  { id: '2', lot_id: '1', code: 'CT-0001-L1-P1-FL75-002', container_type_id: '1', container_status: 'ACTIVE', position_id: '2', confluent_percent: 80, morphology: 'Spindle', contaminated: false, placed_at: '2026-01-15T10:00:00Z', created_at: '2026-01-15T00:00:00Z' },
  { id: '3', lot_id: '2', code: 'CT-0001-L1-P2-FL75-001', container_type_id: '1', container_status: 'ACTIVE', position_id: '1', confluent_percent: 75, morphology: 'Spindle', contaminated: false, placed_at: '2026-01-20T10:00:00Z', created_at: '2026-01-20T00:00:00Z' },
  { id: '4', lot_id: '3', code: 'CT-0002-L1-P1-FL75-001', container_type_id: '1', container_status: 'ACTIVE', position_id: '2', confluent_percent: 70, morphology: 'Cobblestone', contaminated: false, placed_at: '2026-01-18T10:00:00Z', created_at: '2026-01-18T00:00:00Z' },
]

// Banks
export const mockBanks: Bank[] = [
  { id: '1', culture_id: '1', lot_id: '1', bank_type: 'MCB', status: 'APPROVED', cryo_vials_count: 20, cells_per_vial: 4_000_000, total_cells: 80_000_000, qc_passed: true, freezing_date: '2026-01-25', expiration_date: '2031-01-25', created_at: '2026-01-25T00:00:00Z' },
  { id: '2', culture_id: '1', lot_id: '2', bank_type: 'WCB', status: 'QC_PENDING', cryo_vials_count: 20, cells_per_vial: 4_000_000, total_cells: 80_000_000, qc_passed: false, freezing_date: '2026-01-28', created_at: '2026-01-28T00:00:00Z' },
]

// CryoVials
export const mockCryoVials: CryoVial[] = [
  { id: '1', bank_id: '1', code: 'CV-0001-L1-MCB-V001', status: 'IN_STOCK', cells_count: 4_000_000, created_at: '2026-01-25T00:00:00Z' },
  { id: '2', bank_id: '1', code: 'CV-0001-L1-MCB-V002', status: 'IN_STOCK', cells_count: 4_000_000, created_at: '2026-01-25T00:00:00Z' },
  { id: '3', bank_id: '1', code: 'CV-0001-L1-MCB-V003', status: 'RESERVED', cells_count: 4_000_000, created_at: '2026-01-25T00:00:00Z' },
]

// Nomenclatures
export const mockNomenclatures: Nomenclature[] = [
  { id: '1', name: 'DMEM/F12 (1:1)', category: 'MEDIUM', unit: 'мл', storage_temp: 4, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: '2', name: 'FBS (эмбриональная бычья сыворотка)', category: 'REAGENT', unit: 'мл', storage_temp: -20, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: '3', name: 'Пенициллин-Стрептомицин', category: 'REAGENT', unit: 'мл', storage_temp: -20, is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: '4', name: 'Флакон T-75', category: 'CONSUMABLE', unit: 'шт', storage_temp: 4, is_active: true, created_at: '2026-01-01T00:00:00Z' },
]

// Batches
export const mockBatches: Batch[] = [
  { id: '1', nomenclature_id: '1', batch_number: 'DMEM-001', expiration_date: '2026-06-30', quantity: 500, unit: 'мл', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z' },
  { id: '2', nomenclature_id: '1', batch_number: 'DMEM-002', expiration_date: '2026-07-15', quantity: 500, unit: 'мл', status: 'ACTIVE', created_at: '2026-01-15T00:00:00Z' },
  { id: '3', nomenclature_id: '2', batch_number: 'FBS-001', expiration_date: '2027-01-30', quantity: 50, unit: 'мл', status: 'ACTIVE', created_at: '2026-01-01T00:00:00Z' },
  { id: '4', nomenclature_id: '1', batch_number: 'DMEM-EXP', expiration_date: '2026-02-05', quantity: 200, unit: 'мл', status: 'EXPIRED', created_at: '2025-12-01T00:00:00Z' },
]

// Ready Media
export const mockReadyMedia: ReadyMedium[] = [
  { id: '1', code: 'RM-0001', name: 'Среда для культивирования 10% FBS', category: 'complete', volume_ml: 500, status: 'ACTIVE', sterilization_method: 'FILTRATION', expiration_date: '2026-02-15', created_at: '2026-01-15T00:00:00Z', activated_at: '2026-01-15T10:00:00Z' },
  { id: '2', code: 'RM-0002', name: 'Среда для заморозки', category: 'freeze', volume_ml: 200, status: 'QUARANTINE', sterilization_method: 'FILTRATION', expiration_date: '2026-02-20', created_at: '2026-01-20T00:00:00Z' },
]

// QC Tests
export const mockQCTests: QCTest[] = [
  { id: '1', target_type: 'BANK', target_id: '2', test_type: 'MYCOPLASMA', status: 'PENDING', created_at: '2026-01-28T00:00:00Z' },
  { id: '2', target_type: 'BANK', target_id: '1', test_type: 'STERILITY', status: 'COMPLETED', result: 'PASSED', started_at: '2026-01-25T00:00:00Z', completed_at: '2026-02-01T00:00:00Z', created_at: '2026-01-25T00:00:00Z' },
  { id: '3', target_type: 'BANK', target_id: '1', test_type: 'LAL', status: 'COMPLETED', result: 'PASSED', started_at: '2026-01-25T00:00:00Z', completed_at: '2026-01-26T00:00:00Z', created_at: '2026-01-25T00:00:00Z' },
]

// Orders
export const mockOrders: Order[] = [
  { id: '1', order_number: 'ORD-0001', customer_name: 'ООО Клетка', customer_email: 'info@cell.ru', customer_phone: '+7-999-123-45-67', order_type: 'ISSUANCE', cells_quantity_mln: 10, deadline: '2026-02-15', status: 'IN_PROGRESS', created_at: '2026-01-20T00:00:00Z' },
  { id: '2', order_number: 'ORD-0002', customer_name: 'НИИ Регенерация', customer_email: 'info@regen.ru', order_type: 'BANK_CREATION', cells_quantity_mln: 50, deadline: '2026-02-28', status: 'NEW', created_at: '2026-01-25T00:00:00Z' },
]

// Tasks
export const mockTasks: Task[] = [
  { id: '1', type: 'INSPECT', target_type: 'CULTURE', target_id: '1', status: 'PENDING', due_date: '2026-02-02', interval_days: 3, created_at: '2026-01-27T00:00:00Z' },
  { id: '2', type: 'FEED', target_type: 'CULTURE', target_id: '1', status: 'PENDING', due_date: '2026-02-02', interval_days: 3, created_at: '2026-01-27T00:00:00Z' },
  { id: '3', type: 'QC_DUE', target_type: 'BANK', target_id: '2', status: 'PENDING', due_date: '2026-02-01', created_at: '2026-01-28T00:00:00Z' },
  { id: '4', type: 'FEFO', target_type: 'BATCH', target_id: '1', status: 'PENDING', due_date: '2026-02-10', created_at: '2026-01-27T00:00:00Z' },
]

// Notifications
export const mockNotifications: Notification[] = [
  { id: '1', type: 'QC_READY', title: 'QC готов', message: 'Банк MCB CT-0001 — тест на стерильность готов', link_type: 'BANK', link_id: '1', is_read: false, created_at: '2026-02-01T10:00:00Z' },
  { id: '2', type: 'ORDER_DEADLINE', title: 'Скоро дедлайн', message: 'Заявка ORD-0001 — срок 15.02', link_type: 'ORDER', link_id: '1', is_read: false, created_at: '2026-02-01T09:00:00Z' },
  { id: '3', type: 'CRITICAL_FEFO', title: 'Критичный FEFO', message: 'Партия DMEM-001 истекает завтра', link_type: 'BATCH', link_id: '1', is_read: true, created_at: '2026-01-31T08:00:00Z' },
]

// Users
export const mockUsers: User[] = [
  { id: '1', username: 'admin', email: 'admin@labpro.local', full_name: 'Администратор', role: 'ADMIN', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: '2', username: 'operator1', email: 'operator1@labpro.local', full_name: 'Иванов Иван', role: 'OPERATOR', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: '3', username: 'laborant1', email: 'laborant1@labpro.local', full_name: 'Сидорова Анна', role: 'LABORANT', is_active: true, created_at: '2026-01-01T00:00:00Z' },
]

// Cultures (основная сущность)
export const mockCultures: Culture[] = [
  {
    id: '1',
    name: 'MSC-001',
    type_id: '1',
    culture_type: mockCultureTypes[0],
    donor_id: '1',
    donor: mockDonors[0],
    tissue_id: '1',
    tissue: mockTissues[0],
    status: 'ACTIVE',
    description: 'Мезенхимальные стволовые клетки жировой ткани донора DN-0001',
    coefficient: 15245,
    created_by: '2',
    created_by_user: mockUsers[1],
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-28T00:00:00Z',
    lots: mockLots.filter(l => l.culture_id === '1'),
    banks: mockBanks.filter(b => b.culture_id === '1'),
  },
  {
    id: '2',
    name: 'CHONDRO-001',
    type_id: '2',
    culture_type: mockCultureTypes[1],
    donor_id: '2',
    donor: mockDonors[1],
    tissue_id: '2',
    tissue: mockTissues[1],
    status: 'ACTIVE',
    description: 'Хондроциты из хрящевой ткани',
    created_by: '2',
    created_by_user: mockUsers[1],
    created_at: '2026-01-18T00:00:00Z',
    updated_at: '2026-01-28T00:00:00Z',
    lots: mockLots.filter(l => l.culture_id === '2'),
    banks: [],
  },
]

// Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  total_cultures: 2,
  active_cultures: 2,
  total_banks: 2,
  pending_orders: 1,
  expiring_batches: 1,
  pending_tasks: 4,
  unread_notifications: 2,
}

// Helper functions for mock data
export function getCultureById(id: string): Culture | undefined {
  return mockCultures.find(c => c.id === id)
}

export function getContainerByCode(code: string): Container | undefined {
  return mockContainers.find(c => c.code === code)
}

export function getBatchByCode(batchNumber: string): Batch | undefined {
  return mockBatches.find(b => b.batch_number === batchNumber)
}

export function getPositionByCode(code: string): Position | undefined {
  return mockPositions.find(p => p.code === code)
}
