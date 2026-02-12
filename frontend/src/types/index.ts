// LabPro TypeScript Types
// Generated: 30.01.2026

// User Roles
export type UserRole = 'OPERATOR' | 'LABORANT' | 'MANAGER' | 'QC_ADMIN' | 'ADMIN'

// Culture
export type CultureStatus = 'ACTIVE' | 'ARCHIVED' | 'DISPOSE' | 'QUARANTINE'

// Способ первичного выделения клеток
export type ExtractionMethod = 'ENZYMATIC' | 'EXPLANT' | 'MECHANICAL' | 'OTHER'

export interface Culture {
  id: string
  name: string
  type_id?: string
  culture_type?: CultureType
  donor_id?: string
  donor?: Donor
  donation_id?: string | null
  donation?: Donation
  tissue_id?: string
  tissue?: Tissue
  extraction_method?: ExtractionMethod  // способ первичного выделения
  status: CultureStatus
  description?: string
  coefficient?: number
  coefficient_updated_at?: string
  received_date?: string
  source?: string
  created_by?: string
  created_by_user?: User
  created_at: string
  updated_at: string
  lots?: Lot[]
  banks?: Bank[]
}

export interface CultureType {
  id: string
  code: string
  name: string
  description?: string
  growth_rate?: number
  optimal_confluent?: number
  passage_interval_days?: number
  freezing_protocol?: string
  thaw_protocol?: string
  is_active: boolean
  created_at: string
}

// Связь типов клеток с типами тканей
export interface CultureTypeTissueType {
  id: string
  culture_type_id: string
  tissue_type_id: string
  is_primary: boolean
  created_at: string
  culture_type?: CultureType
  tissue_type?: TissueType
}

// ==================== DONATIONS ====================

export type DonationStatus = 'QUARANTINE' | 'APPROVED' | 'REJECTED'
export type InfectionTestResult = 'PENDING' | 'NEGATIVE' | 'POSITIVE'

export interface TissueType {
  id: string
  code: string
  name: string
  tissue_form: 'SOLID' | 'LIQUID'
  is_active: boolean
  created_at: string
}

export interface Donation {
  id: string
  code: string
  donor_id: string
  collected_at: string
  tissue_type_id: string | null
  tissue_form: 'SOLID' | 'LIQUID' | null
  tissue_volume_ml: number | null
  tissue_weight_g: number | null
  consent_received: boolean
  consent_document: string | null
  contract_number: string | null
  contract_date: string | null
  inf_hiv: InfectionTestResult
  inf_hbv: InfectionTestResult
  inf_hcv: InfectionTestResult
  inf_syphilis: InfectionTestResult
  status: DonationStatus
  notes: string | null
  created_at: string
  updated_at?: string
  created_by: string | null
  // Relations
  donor?: Donor
  tissue_type?: TissueType
  cultures?: Culture[]
}

// Donor (расширенный)
export type DonorStatus = 'ACTIVE' | 'ARCHIVED'

export interface Donor {
  id: string
  code: string
  last_name: string | null
  first_name: string | null
  middle_name: string | null
  birth_date: string | null
  sex: string | null
  phone: string | null
  email: string | null
  blood_type: string | null
  status: DonorStatus
  notes: string | null
  created_at: string
  updated_at?: string
  created_by: string | null
  // Relations
  donations?: Donation[]
}

// Legacy - для обратной совместимости
export interface Tissue {
  id: string
  donor_id: string
  donor?: Donor
  type: string
  weight_kg?: number
  passage_yield?: number
  notes?: string
  created_at: string
}

// Lot
export type LotStatus = 'ACTIVE' | 'DISPOSE' | 'CLOSED'

export interface Lot {
  id: string
  lot_number: string
  culture_id: string
  culture?: Culture
  parent_lot_id?: string
  source_container_id?: string
  passage_number: number
  seeded_at?: string
  harvest_at?: string
  initial_cells?: number
  final_cells?: number
  viability?: number
  status: LotStatus
  notes?: string
  created_at: string
  updated_at?: string
  containers?: Container[]
}

// Container
export type ContainerStatus = 'IN_CULTURE' | 'IN_BANK' | 'ISSUED' | 'USED' | 'DISPOSE' | 'QUARANTINE'

export interface Container {
  id: string
  code: string
  lot_id: string
  lot?: Lot
  bank_id?: string
  bank?: Bank
  container_type_id: string
  container_type?: ContainerType
  position_id?: string
  position?: Position
  parent_container_id?: string
  container_status: ContainerStatus
  seeded_at?: string
  passage_number?: number
  cells_count?: number
  viability?: number
  media_type?: string
  confluent_percent?: number
  morphology?: string
  contaminated: boolean
  notes?: string
  placed_at?: string
  created_by?: string
  created_by_user?: User
  created_at: string
  updated_at?: string
}

export interface ContainerType {
  id: string
  code: string
  name: string
  surface_area_cm2?: number
  volume_ml?: number
  is_cryo: boolean
  is_active: boolean
  optimal_confluent?: number
  created_at: string
}

// Bank
export type BankType = 'MCB' | 'WCB' | 'RWB'
export type BankStatus = 'QUARANTINE' | 'APPROVED' | 'RESERVED' | 'ISSUED' | 'DISPOSE'

export interface Bank {
  id: string
  code: string
  culture_id?: string
  culture?: Culture
  lot_id?: string
  lot?: Lot
  bank_type: BankType
  status: BankStatus
  freezing_method?: string             // PROGRAMMED, MANUAL_80
  cryo_vials_count: number
  cells_per_vial?: number
  total_cells?: number
  position_id?: string
  position?: Position
  storage_location?: string
  qc_passed: boolean
  qc_date?: string
  freezing_date?: string
  expiration_date?: string
  notes?: string
  created_at: string
  cryo_vials?: CryoVial[]
  qc_tests?: QCTest[]
}

export type CryoVialStatus = 'IN_STOCK' | 'RESERVED' | 'ISSUED' | 'THAWED' | 'DISPOSED'

export interface CryoVial {
  id: string
  bank_id: string
  bank?: Bank
  lot_id?: string
  lot?: Lot
  code?: string
  vial_number?: string
  position_id?: string
  position?: Position
  position_in_box?: string
  cells_count?: number
  freezing_date?: string
  thaw_date?: string
  status: CryoVialStatus
  notes?: string
  created_at: string
}

// Inventory
export type NomenclatureCategory = 'MEDIUM' | 'SERUM' | 'BUFFER' | 'SUPPLEMENT' | 'ENZYME' | 'REAGENT' | 'CONSUMABLE' | 'EQUIP'

export const NOMENCLATURE_CATEGORY_LABELS: Record<string, string> = {
  MEDIUM: 'Среды',
  SERUM: 'Сыворотки',
  BUFFER: 'Буферы',
  ENZYME: 'Ферменты',
  REAGENT: 'Реагенты',
  SUPPLEMENT: 'Добавки',
  CONSUMABLE: 'Расходники',
}

export type UsageTag = 'FEED' | 'DISSOCIATION' | 'WASH' | 'SEED' | 'FREEZING' | 'THAW'

export const USAGE_TAG_LABELS: Record<UsageTag, string> = {
  FEED: 'Подкормка',
  DISSOCIATION: 'Диссоциация',
  WASH: 'Промывка',
  SEED: 'Посев',
  FREEZING: 'Заморозка',
  THAW: 'Разморозка',
}

export interface Nomenclature {
  id: string
  code?: string
  name: string
  category: NomenclatureCategory
  unit: string
  storage_temp?: number
  storage_requirements?: string
  usage_tags?: UsageTag[]
  is_active: boolean
  created_at: string
  batches?: Batch[]
}

export type BatchStatus = 'AVAILABLE' | 'RESERVED' | 'USED' | 'EXPIRED' | 'QUARANTINE' | 'DISPOSE'

export interface Batch {
  id: string
  nomenclature_id: string
  nomenclature?: Nomenclature
  batch_number: string
  expiration_date: string
  quantity: number
  volume_per_unit?: number | null
  current_unit_volume?: number | null
  unit: string
  status: BatchStatus
  supplier?: string | null
  manufacturer?: string | null
  catalog_number?: string | null
  invoice_number?: string | null
  invoice_date?: string | null
  notes?: string
  created_at: string
  movements?: InventoryMovement[]
}

export type InventoryMovementType = 'RECEIVE' | 'CONSUME' | 'CORRECT_PLUS' | 'CORRECT_MINUS' | 'DISPOSE'

export interface InventoryMovement {
  id: string
  batch_id: string
  batch?: Batch
  movement_type: InventoryMovementType
  quantity: number
  unit?: string
  reference_type?: string
  reference_id?: string
  notes?: string
  created_at: string
}

// Ready Medium
export type ReadyMediumStatus = 'QUARANTINE' | 'ACTIVE' | 'EXPIRED' | 'DISPOSE'
export type SterilizationMethod = 'FILTRATION' | 'AUTOCLAVE'

export interface ReadyMedium {
  id: string
  code: string
  name: string
  category: string
  volume_ml: number
  status: ReadyMediumStatus
  sterilization_method: SterilizationMethod
  expiration_date: string
  storage_position_id?: string
  storage_position?: Position
  composition?: any
  created_by?: string
  created_by_user?: User
  created_at: string
  activated_at?: string
}

// Operations
export type OperationType = 'SEED' | 'FEEDING' | 'PASSAGE' | 'FREEZE' | 'THAW' | 'OBSERVE' | 'QC' | 'DISPOSE'
export type OperationStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'

export interface Operation {
  id: string
  type: OperationType
  container_id?: string
  bank_id?: string
  lot_id?: string
  lot?: Lot
  operator_id?: string
  operator?: User
  status: OperationStatus
  started_at?: string
  completed_at?: string
  parameters?: Record<string, unknown>
  notes?: string
  result?: string
  created_at: string
  updated_at?: string
  containers?: OperationContainer[]
  media?: OperationMedia[]
  metrics?: OperationMetrics
}

export type ContainerRole = 'SOURCE' | 'TARGET'

export interface OperationContainer {
  id: string
  operation_id: string
  operation?: Operation
  container_id: string
  container?: Container
  role: ContainerRole
  confluent_percent?: number
  morphology?: string
  contaminated: boolean
  created_at: string
}

export interface OperationMedia {
  id: string
  operation_id: string
  operation?: Operation
  batch_id?: string
  batch?: Batch
  ready_medium_id?: string
  ready_medium?: ReadyMedium
  quantity_ml: number
  purpose?: string
  created_at: string
}

export interface OperationMetrics {
  id: string
  operation_id: string
  operation?: Operation
  concentration?: number
  viability_percent?: number
  total_cells?: number
  volume_ml?: number
  passage_yield?: number
  created_at: string
}

// Container Photos
export interface ContainerPhoto {
  id: string
  container_id: string
  operation_id?: string
  file_path: string
  file_url: string
  file_name?: string
  file_size?: number
  notes?: string
  created_at: string
}

// QC Test Configs (reference table)
export type QCResultType = 'BINARY' | 'NUMERIC' | 'TEXT'

export interface QCTestConfig {
  id: string
  code: string
  name: string
  description?: string
  methodology?: string
  unit?: string
  ref_min?: number
  ref_max?: number
  result_type: QCResultType
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CultureTypeQCRequirement {
  id: string
  culture_type_id: string
  qc_test_config_id: string
  is_required: boolean
  qc_test_config?: QCTestConfig
}

// QC Tests
export type QCTestType = 'MYCOPLASMA' | 'STERILITY' | 'LAL' | 'VIA' | string
export type QCTestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type QCResult = 'PASSED' | 'FAILED'

export interface QCTest {
  id: string
  target_type: string
  target_id: string
  test_type: QCTestType
  status: QCTestStatus
  result?: QCResult
  results_data?: Record<string, unknown>
  started_at?: string
  completed_at?: string
  notes?: string
  methodology?: string
  created_by?: string
  created_by_user?: User
  created_at: string
  qc_test_config?: QCTestConfig
}

// Orders
export type OrderType = 'STANDARD' | 'URGENT' | 'RESEARCH'
export type OrderStatus = 'PENDING' | 'APPROVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'
export type OrderItemStatus = 'PENDING' | 'RESERVED' | 'ISSUED'

export interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  order_type: OrderType
  culture_type_id?: string
  culture_type?: CultureType
  cells_quantity_mln?: number
  deadline?: string
  status: OrderStatus
  notes?: string
  created_by?: string
  created_by_user?: User
  created_at: string
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  order_id: string
  order?: Order
  bank_id?: string
  bank?: Bank
  cryo_vial_id?: string
  cryo_vial?: CryoVial
  quantity: number
  status: OrderItemStatus
  created_at: string
}

// Equipment
export type EquipmentType = 'INCUBATOR' | 'FRIDGE' | 'FREEZER' | 'CABINET' | 'RACK'
export type EquipmentStatus = 'ACTIVE' | 'MAINTENANCE' | 'BROKEN'

export interface Equipment {
  id: string
  code: string
  name: string
  type: EquipmentType
  model?: string
  serial_number?: string
  inventory_number?: string
  location?: string
  status: EquipmentStatus
  last_maintenance?: string
  next_maintenance?: string
  validation_date?: string
  next_validation?: string
  notes?: string
  created_at: string
  positions?: Position[]
}

export interface EquipmentLog {
  id: string
  equipment_id: string
  temperature?: number
  humidity?: number
  co2_level?: number
  o2_level?: number
  notes?: string
  logged_by?: string
  logged_at: string
}

export interface EquipmentMonitoringParam {
  id: string
  equipment_id?: string
  equipment_type: string
  param_key: string
  param_label: string
  unit: string
  min_value?: number
  max_value?: number
  is_required: boolean
  sort_order: number
}

export interface Position {
  id: string
  equipment_id: string
  equipment?: Equipment
  path: string
  qr_code?: string
  is_active: boolean
  capacity: number
  current_load?: number
  created_at: string
}

// Users
export interface User {
  id: string
  username: string
  email: string
  full_name?: string
  role: UserRole
  is_active: boolean
  created_at: string
}

// Tasks & Notifications
export type TaskType = 'INSPECT' | 'FEED' | 'QC_DUE' | 'FEFO' | 'ORDER_DUE' | 'MAINTENANCE'
export type TaskTargetType = 'CULTURE' | 'LOT' | 'CONTAINER' | 'BANK' | 'EQUIPMENT' | 'BATCH'
export type TaskStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED'

export interface Task {
  id: string
  type: TaskType
  target_type: TaskTargetType
  target_id: string
  status: TaskStatus
  due_date?: string
  last_done_date?: string
  interval_days?: number
  created_at: string
}

export type NotificationType = 'QC_READY' | 'ORDER_DEADLINE' | 'CRITICAL_FEFO' | 'EQUIPMENT_ALERT' | 'CONTAMINATION'

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  link_type?: string
  link_id?: string
  user_id?: string
  is_read: boolean
  created_at: string
}

// Audit
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE'

export interface AuditLog {
  id: string
  user_id?: string
  user?: User
  action: AuditAction
  entity_type: string
  entity_id: string
  old_value?: any
  new_value?: any
  description?: string
  ip_address?: string
  user_agent?: string
  created_at: string
}

// Dashboard Stats
export interface DashboardStats {
  totalCultures: number
  activeCultures: number
  totalBanks: number
  pendingOrders: number
  pendingTasks: number
  activeContainers: number
}

// Morphology Types
export interface MorphologyType {
  id: string
  code: string
  name: string
  description?: string
  created_at: string
}

// Dispose Reasons
export interface DisposeReason {
  id: string
  code: string
  name: string
  description?: string
  created_at: string
}

// Supabase Database type (for API client)
export interface Database {
  public: {
    Tables: {
      culture_types: {
        Row: CultureType
        Insert: Partial<CultureType>
        Update: Partial<CultureType>
      }
      culture_type_tissue_types: {
        Row: CultureTypeTissueType
        Insert: Partial<CultureTypeTissueType>
        Update: Partial<CultureTypeTissueType>
      }
      cultures: {
        Row: Culture
        Insert: Partial<Culture>
        Update: Partial<Culture>
      }
      donors: {
        Row: Donor
        Insert: Partial<Donor>
        Update: Partial<Donor>
      }
      donations: {
        Row: Donation
        Insert: Partial<Donation>
        Update: Partial<Donation>
      }
      tissue_types: {
        Row: TissueType
        Insert: Partial<TissueType>
        Update: Partial<TissueType>
      }
      tissues: {
        Row: Tissue
        Insert: Partial<Tissue>
        Update: Partial<Tissue>
      }
      lots: {
        Row: Lot
        Insert: Partial<Lot>
        Update: Partial<Lot>
      }
      containers: {
        Row: Container
        Insert: Partial<Container>
        Update: Partial<Container>
      }
      container_types: {
        Row: ContainerType
        Insert: Partial<ContainerType>
        Update: Partial<ContainerType>
      }
      banks: {
        Row: Bank
        Insert: Partial<Bank>
        Update: Partial<Bank>
      }
      cryo_vials: {
        Row: CryoVial
        Insert: Partial<CryoVial>
        Update: Partial<CryoVial>
      }
      nomenclatures: {
        Row: Nomenclature
        Insert: Partial<Nomenclature>
        Update: Partial<Nomenclature>
      }
      batches: {
        Row: Batch
        Insert: Partial<Batch>
        Update: Partial<Batch>
      }
      inventory_movements: {
        Row: InventoryMovement
        Insert: Partial<InventoryMovement>
        Update: Partial<InventoryMovement>
      }
      ready_media: {
        Row: ReadyMedium
        Insert: Partial<ReadyMedium>
        Update: Partial<ReadyMedium>
      }
      operations: {
        Row: Operation
        Insert: Partial<Operation>
        Update: Partial<Operation>
      }
      operation_containers: {
        Row: OperationContainer
        Insert: Partial<OperationContainer>
        Update: Partial<OperationContainer>
      }
      operation_media: {
        Row: OperationMedia
        Insert: Partial<OperationMedia>
        Update: Partial<OperationMedia>
      }
      operation_metrics: {
        Row: OperationMetrics
        Insert: Partial<OperationMetrics>
        Update: Partial<OperationMetrics>
      }
      container_photos: {
        Row: ContainerPhoto
        Insert: Partial<ContainerPhoto>
        Update: Partial<ContainerPhoto>
      }
      qc_tests: {
        Row: QCTest
        Insert: Partial<QCTest>
        Update: Partial<QCTest>
      }
      orders: {
        Row: Order
        Insert: Partial<Order>
        Update: Partial<Order>
      }
      order_items: {
        Row: OrderItem
        Insert: Partial<OrderItem>
        Update: Partial<OrderItem>
      }
      equipment: {
        Row: Equipment
        Insert: Partial<Equipment>
        Update: Partial<Equipment>
      }
      positions: {
        Row: Position
        Insert: Partial<Position>
        Update: Partial<Position>
      }
      users: {
        Row: User
        Insert: Partial<User>
        Update: Partial<User>
      }
      tasks: {
        Row: Task
        Insert: Partial<Task>
        Update: Partial<Task>
      }
      notifications: {
        Row: Notification
        Insert: Partial<Notification>
        Update: Partial<Notification>
      }
      audit_logs: {
        Row: AuditLog
        Insert: Partial<AuditLog>
        Update: Partial<AuditLog>
      }
    }
  }
}
