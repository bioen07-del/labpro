// LabPro TypeScript Types
// Generated: 30.01.2026

// User Roles
export type UserRole = 'OPERATOR' | 'LABORANT' | 'MANAGER' | 'QC_ADMIN' | 'ADMIN'

// Culture
export type CultureStatus = 'ACTIVE' | 'ARCHIVED'

export interface Culture {
  id: string
  name: string
  type_id?: string
  culture_type?: CultureType
  donor_id?: string
  donor?: Donor
  tissue_id?: string
  tissue?: Tissue
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

// Donor & Tissue
export interface Donor {
  id: string
  code: string
  age?: number
  gender?: 'M' | 'F'
  tissue_type?: string
  collection_date?: string
  notes?: string
  created_at: string
}

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
  culture_id: string
  culture?: Culture
  passage_number: number
  status: LotStatus
  parent_lot_id?: string
  source_container_id?: string
  start_date: string
  end_date?: string
  notes?: string
  created_at: string
  containers?: Container[]
}

// Container
export type ContainerStatus = 'ACTIVE' | 'IN_BANK' | 'DISPOSE'

export interface Container {
  id: string
  lot_id: string
  lot?: Lot
  code: string
  type_id: string
  type?: ContainerType
  status: ContainerStatus
  parent_container_id?: string
  position_id?: string
  position?: Position
  confluent_percent?: number
  morphology?: string
  contaminated: boolean
  placed_at?: string
  created_by?: string
  created_by_user?: User
  created_at: string
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
  culture_id?: string
  culture?: Culture
  lot_id?: string
  lot?: Lot
  bank_type: BankType
  status: BankStatus
  cryo_vials_count: number
  cells_per_vial?: number
  total_cells?: number
  position_id?: string
  position?: Position
  qc_passed: boolean
  freezing_date?: string
  expiration_date?: string
  notes?: string
  created_at: string
  cryo_vials?: CryoVial[]
  qc_tests?: QCTest[]
}

export type CryoVialStatus = 'IN_STOCK' | 'RESERVED' | 'ISSUED'

export interface CryoVial {
  id: string
  bank_id: string
  bank?: Bank
  code: string
  position_id?: string
  position?: Position
  status: CryoVialStatus
  cells_count?: number
  created_at: string
}

// Inventory
export type NomenclatureCategory = 'MEDIUM' | 'CONSUMABLE' | 'REAGENT' | 'EQUIP' | 'SERUM'

export interface Nomenclature {
  id: string
  name: string
  category: NomenclatureCategory
  unit: string
  storage_temp?: number
  is_active: boolean
  created_at: string
  batches?: Batch[]
}

export type BatchStatus = 'ACTIVE' | 'EXPIRED' | 'DISPOSE'

export interface Batch {
  id: string
  nomenclature_id: string
  nomenclature?: Nomenclature
  batch_number: string
  expiration_date: string
  quantity: number
  unit: string
  status: BatchStatus
  notes?: string
  created_at: string
  movements?: InventoryMovement[]
}

export type InventoryMovementType = 'RECEIVE' | 'CONSUME' | 'CORRECT_PLUS' | 'CORRECT_MINUS' | 'DISPOSE'

export interface InventoryMovement {
  id: string
  batch_id: string
  batch?: Batch
  operation_id?: string
  operation?: Operation
  movement_type: InventoryMovementType
  quantity_change: number
  quantity_after: number
  notes?: string
  moved_by?: string
  moved_by_user?: User
  moved_at: string
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
export type OperationType = 'FEED' | 'PASSAGE' | 'FREEZE' | 'THAW' | 'OBSERVE' | 'DISPOSE' | 'QCREG'
export type OperationStatus = 'IN_PROGRESS' | 'COMPLETED'

export interface Operation {
  id: string
  lot_id?: string
  lot?: Lot
  operation_type: OperationType
  status: OperationStatus
  started_at: string
  completed_at?: string
  notes?: string
  created_by?: string
  created_by_user?: User
  created_at: string
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

// QC Tests
export type QCTestType = 'MYCOPLASMA' | 'STERILITY' | 'LAL' | 'VIA'
export type QCTestStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type QCResult = 'PASSED' | 'FAILED'

export interface QCTest {
  id: string
  target_type: string
  target_id: string
  test_type: QCTestType
  status: QCTestStatus
  result?: QCResult
  started_at?: string
  completed_at?: string
  notes?: string
  created_by?: string
  created_by_user?: User
  created_at: string
}

// Orders
export type OrderType = 'BANK_CREATION' | 'ISSUANCE'
export type OrderStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
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
  location?: string
  temperature?: number
  status: EquipmentStatus
  notes?: string
  created_at: string
  positions?: Position[]
}

export interface Position {
  id: string
  equipment_id: string
  equipment?: Equipment
  code: string
  qr_code?: string
  path: string
  capacity: number
  is_active: boolean
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
  total_cultures: number
  active_cultures: number
  total_banks: number
  pending_orders: number
  expiring_batches: number
  pending_tasks: number
  unread_notifications: number
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
