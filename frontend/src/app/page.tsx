"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FlaskConical,
  Package,
  Database,
  ClipboardList,
  Bell,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  Camera,
  Dna,
  Eye,
  TestTubes,
  RefreshCw,
  Snowflake,
  Info,
  BellRing,
  Wrench,
  ShieldCheck,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  getDashboardStats,
  getTasks,
  getNotifications,
  markAllNotificationsRead,
  getOperations,
} from "@/lib/api"
import { APP_VERSION, CHANGELOG } from "@/lib/version"
import { format, formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EquipmentAlert {
  id: string
  name: string
  code: string
  type: 'maintenance' | 'validation'
  urgency: 'overdue' | 'urgent' | 'soon'
  date: string
}

interface DashboardStats {
  totalCultures: number
  activeCultures: number
  totalBanks: number
  pendingOrders: number
  pendingTasks: number
  activeContainers: number
  equipmentAlerts?: EquipmentAlert[]
}

interface TaskItem {
  id: string
  type: string
  title?: string
  description?: string
  target_type?: string
  target_id?: string
  due_date?: string
  status: string
  priority?: string
  container?: { id: string; code: string } | null
  bank?: { id: string; code: string } | null
  order?: { id: string; order_number: string } | null
}

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
  link_type?: string
  link_id?: string
}

interface OperationItem {
  id: string
  type: string
  status: string
  started_at: string
  completed_at?: string
  notes?: string
  lot?: {
    id: string
    lot_number: string
    culture?: {
      id: string
      name: string
      culture_type?: { name: string } | null
    } | null
  } | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TASK_TYPE_LABELS: Record<string, string> = {
  FEED: "Подкормка",
  INSPECT: "Осмотр",
  OBSERVE: "Осмотр",
  PASSAGE: "Пассаж",
  QC: "Контроль качества",
  QC_DUE: "Контроль качества",
  MAINTENANCE: "Обслуживание",
  FREEZE: "Заморозка",
}

const OPERATION_TYPE_LABELS: Record<string, string> = {
  OBSERVE: "Осмотр",
  FEED: "Подкормка",
  PASSAGE: "Пассаж",
  FREEZE: "Заморозка",
  THAW: "Размораживание",
  DISPOSE: "Утилизация",
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "QC_READY":
      return <AlertCircle className="h-4 w-4" />
    case "ORDER_DEADLINE":
      return <Clock className="h-4 w-4" />
    case "CRITICAL_FEFO":
      return <AlertCircle className="h-4 w-4" />
    case "EQUIPMENT_ALERT":
      return <BellRing className="h-4 w-4" />
    case "CONTAMINATION":
      return <AlertCircle className="h-4 w-4 text-destructive" />
    default:
      return <Info className="h-4 w-4" />
  }
}

function getTaskTargetHref(task: TaskItem): string | null {
  if (task.container?.id) return `/containers/${task.container.id}`
  if (task.bank?.id) return `/banks/${task.bank.id}`
  if (task.order?.id) return `/orders/${task.order.id}`
  if (task.target_type && task.target_id) {
    const map: Record<string, string> = {
      CONTAINER: "containers",
      LOT: "lots",
      BANK: "banks",
      CULTURE: "cultures",
      EQUIPMENT: "equipment",
    }
    const prefix = map[task.target_type]
    if (prefix) return `/${prefix}/${task.target_id}`
  }
  return null
}

function getTaskDescription(task: TaskItem): string {
  if (task.description) return task.description
  if (task.container?.code) return task.container.code
  if (task.bank?.code) return task.bank.code
  if (task.order?.order_number) return task.order.order_number
  return "---"
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter()

  const [stats, setStats] = useState<DashboardStats>({
    totalCultures: 0,
    activeCultures: 0,
    totalBanks: 0,
    pendingOrders: 0,
    pendingTasks: 0,
    activeContainers: 0,
  })
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [recentOperations, setRecentOperations] = useState<OperationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [markingRead, setMarkingRead] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [statsData, tasksData, notificationsData, operationsData] =
        await Promise.all([
          getDashboardStats(),
          getTasks({ status: "PENDING" }).catch(() => []),
          getNotifications({ limit: 5 }).catch(() => []),
          getOperations({ status: "COMPLETED" }).catch(() => []),
        ])

      setStats(statsData)
      setTasks(tasksData.slice(0, 10))
      setNotifications(notificationsData)
      setRecentOperations(operationsData.slice(0, 5))
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleMarkAllRead = async () => {
    setMarkingRead(true)
    try {
      await markAllNotificationsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      toast.success("Все уведомления отмечены как прочитанные")
    } catch (error) {
      console.error("Error marking notifications as read:", error)
      toast.error("Не удалось отметить уведомления")
    } finally {
      setMarkingRead(false)
    }
  }

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  // ---- Rendered page ----
  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* ---------- Header ---------- */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Панель управления
        </h1>
        <p className="text-muted-foreground">Обзор состояния лаборатории</p>
      </div>

      {/* ========== 1. Stats cards row (4 cards) ========== */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Активные культуры */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Активные культуры
            </CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCultures}</div>
            <p className="text-xs text-muted-foreground">
              из {stats.totalCultures} всего
            </p>
          </CardContent>
        </Card>

        {/* Контейнеры в работе */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Контейнеры в работе
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeContainers}</div>
            <p className="text-xs text-muted-foreground">в культивировании</p>
          </CardContent>
        </Card>

        {/* Банки */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Банки</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBanks}</div>
            <p className="text-xs text-muted-foreground">криобанков</p>
          </CardContent>
        </Card>

        {/* Ожидающие задачи */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ожидающие задачи
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTasks}</div>
            <p className="text-xs text-muted-foreground">требуют внимания</p>
          </CardContent>
        </Card>
      </div>

      {/* ========== 1.5 Equipment Alerts ========== */}
      {stats.equipmentAlerts && stats.equipmentAlerts.length > 0 && (
        <Card className="border-orange-300 bg-orange-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4 text-orange-600" />
              Обслуживание оборудования
              <Badge variant="secondary" className="ml-auto">
                {stats.equipmentAlerts.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.equipmentAlerts.slice(0, 5).map((alert, idx) => (
                <Link
                  key={`${alert.id}-${alert.type}-${idx}`}
                  href={`/equipment/${alert.id}`}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  {alert.type === 'maintenance' ? (
                    <Wrench className="h-4 w-4 shrink-0 text-orange-600" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 shrink-0 text-blue-600" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{alert.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.type === 'maintenance' ? 'ТО' : 'Валидация'} —{' '}
                      {format(new Date(alert.date), 'dd.MM.yyyy', { locale: ru })}
                    </p>
                  </div>
                  <Badge
                    className={
                      alert.urgency === 'overdue'
                        ? 'bg-red-600 hover:bg-red-600 text-white'
                        : alert.urgency === 'urgent'
                          ? 'bg-orange-500 hover:bg-orange-500 text-white'
                          : 'bg-yellow-500 hover:bg-yellow-500 text-white'
                    }
                  >
                    {alert.urgency === 'overdue'
                      ? 'Просрочено'
                      : alert.urgency === 'urgent'
                        ? 'Срочно'
                        : 'Скоро'}
                  </Badge>
                </Link>
              ))}
              {stats.equipmentAlerts.length > 5 && (
                <Link href="/equipment">
                  <Button variant="ghost" size="sm" className="w-full">
                    Все оборудование ({stats.equipmentAlerts.length} предупреждений)
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== 2 + 3. Tasks & Notifications (two-column) ========== */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ---------- 2. Pending Tasks ---------- */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Ожидающие задачи
                </CardTitle>
                <CardDescription>
                  Задачи со статусом PENDING (макс. 10)
                </CardDescription>
              </div>
              <Link href="/tasks">
                <Button variant="ghost" size="sm">
                  Все задачи
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Нет ожидающих задач</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Тип</TableHead>
                    <TableHead>Описание</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task) => {
                    const href = getTaskTargetHref(task)
                    const row = (
                      <TableRow
                        key={task.id}
                        className={href ? "cursor-pointer" : ""}
                        onClick={
                          href ? () => router.push(href) : undefined
                        }
                      >
                        <TableCell>
                          <Badge variant="outline">
                            {TASK_TYPE_LABELS[task.type] || task.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {getTaskDescription(task)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {task.due_date
                            ? format(new Date(task.due_date), "dd.MM.yyyy", {
                                locale: ru,
                              })
                            : "---"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{task.status}</Badge>
                        </TableCell>
                      </TableRow>
                    )
                    return row
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ---------- 3. Recent Notifications ---------- */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Уведомления
                </CardTitle>
                <CardDescription>
                  Последние 5 уведомлений
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    markingRead ||
                    notifications.every((n) => n.is_read)
                  }
                  onClick={handleMarkAllRead}
                >
                  Отметить все прочитанными
                </Button>
                <Link href="/notifications">
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Нет уведомлений</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                      notification.is_read
                        ? "bg-muted/30"
                        : "bg-muted/50 border-primary/20"
                    }`}
                  >
                    <div
                      className={`mt-0.5 ${
                        notification.is_read
                          ? "text-muted-foreground"
                          : "text-primary"
                      }`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-tight">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5 truncate">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(
                          new Date(notification.created_at),
                          { addSuffix: true, locale: ru }
                        )}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========== 4. Quick Actions ========== */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <Link href="/scan">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Camera className="h-5 w-5" />
                <span className="text-xs">Сканировать QR</span>
              </Button>
            </Link>

            <Link href="/cultures/new">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Dna className="h-5 w-5" />
                <span className="text-xs">Создать культуру</span>
              </Button>
            </Link>

            <Link href="/operations/observe">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Eye className="h-5 w-5" />
                <span className="text-xs">Осмотр</span>
              </Button>
            </Link>

            <Link href="/operations/feed">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <TestTubes className="h-5 w-5" />
                <span className="text-xs">Подкормка</span>
              </Button>
            </Link>

            <Link href="/operations/passage">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <RefreshCw className="h-5 w-5" />
                <span className="text-xs">Пассаж</span>
              </Button>
            </Link>

            <Link href="/operations/freeze">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Snowflake className="h-5 w-5" />
                <span className="text-xs">Заморозка</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* ========== 5. Recent Operations ========== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Последние операции
              </CardTitle>
              <CardDescription>
                Последние 5 завершённых операций
              </CardDescription>
            </div>
            <Link href="/operations">
              <Button variant="ghost" size="sm">
                Все операции
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentOperations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Нет операций</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Тип</TableHead>
                  <TableHead>Культура</TableHead>
                  <TableHead>Партия</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOperations.map((operation) => (
                  <TableRow key={operation.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {OPERATION_TYPE_LABELS[operation.type] || operation.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {operation.lot?.culture?.name || "---"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {operation.lot?.lot_number || "---"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {operation.completed_at
                        ? format(
                            new Date(operation.completed_at),
                            "dd MMM HH:mm",
                            { locale: ru }
                          )
                        : operation.started_at
                          ? format(
                              new Date(operation.started_at),
                              "dd MMM HH:mm",
                              { locale: ru }
                            )
                          : "---"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          operation.status === "COMPLETED"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {operation.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ========== 6. Version Footer ========== */}
      <div className="flex justify-center pb-4">
        <Dialog>
          <DialogTrigger asChild>
            <button className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
              LabPro v{APP_VERSION}
            </button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Журнал изменений</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {CHANGELOG.map((entry, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      v{entry.version}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {entry.date}
                    </span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-sm text-muted-foreground ml-1">
                    {entry.changes.map((change, ci) => (
                      <li key={ci}>{change}</li>
                    ))}
                  </ul>
                  {idx < CHANGELOG.length - 1 && <Separator className="mt-3" />}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
