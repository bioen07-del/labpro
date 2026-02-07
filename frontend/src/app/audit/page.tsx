"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import {
  History,
  Search,
  User,
  Calendar,
  Clock,
  FileText,
  Trash2,
  Pencil,
  Download,
  LogIn,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"
import { getAuditLogs } from "@/lib/api"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Создание",
  UPDATE: "Изменение",
  DELETE: "Удаление",
  VIEW: "Просмотр",
  LOGIN: "Вход в систему",
  LOGOUT: "Выход из системы",
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-500",
  UPDATE: "bg-blue-500",
  DELETE: "bg-red-500",
  VIEW: "bg-gray-500",
  LOGIN: "bg-purple-500",
  LOGOUT: "bg-purple-500",
}

const ACTION_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  CREATE: FileText,
  UPDATE: Pencil,
  DELETE: Trash2,
  VIEW: Eye,
  LOGIN: LogIn,
  LOGOUT: LogIn,
}

const ENTITY_LABELS: Record<string, string> = {
  cultures: "Культуры",
  lots: "Лоты",
  containers: "Контейнеры",
  banks: "Банки",
  operations: "Операции",
  donors: "Доноры",
  donations: "Донации",
  equipment: "Оборудование",
  cryo_vials: "Криовиалы",
  tasks: "Задачи",
}

const ENTITY_TYPE_OPTIONS = Object.entries(ENTITY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

const PAGE_SIZE = 50

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  description: string | null
  ip_address: string | null
  created_at: string
  user: {
    id: string
    full_name: string | null
    email: string | null
  } | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getActionIcon(action: string) {
  return ACTION_ICON_MAP[action] || Eye
}

function exportCSV(logs: AuditLog[]) {
  const header = [
    "Дата",
    "Время",
    "Действие",
    "Тип сущности",
    "ID сущности",
    "Описание",
    "Пользователь",
    "Email",
    "IP-адрес",
  ].join(";")

  const rows = logs.map((log) => {
    const date = log.created_at
      ? format(new Date(log.created_at), "dd.MM.yyyy", { locale: ru })
      : ""
    const time = log.created_at
      ? format(new Date(log.created_at), "HH:mm:ss")
      : ""
    const action = ACTION_LABELS[log.action] || log.action
    const entityType = ENTITY_LABELS[log.entity_type] || log.entity_type || ""
    const entityId = log.entity_id || ""
    const description = (log.description || "").replace(/;/g, ",")
    const userName = log.user?.full_name || ""
    const userEmail = log.user?.email || ""
    const ip = log.ip_address || ""

    return [date, time, action, entityType, entityId, description, userName, userEmail, ip].join(
      ";"
    )
  })

  const bom = "\uFEFF"
  const csv = bom + [header, ...rows].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `audit_logs_${format(new Date(), "yyyy-MM-dd_HH-mm")}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [entityTypeFilter, setEntityTypeFilter] = useState("all")
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getAuditLogs()
      setLogs((data as AuditLog[]) || [])
    } catch (err) {
      console.error(err)
      toast.error("Не удалось загрузить журнал аудита")
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Action filter tab
      if (filter !== "all" && log.action !== filter) return false

      // Entity type dropdown
      if (entityTypeFilter !== "all" && log.entity_type !== entityTypeFilter) return false

      // Search
      if (search) {
        const q = search.toLowerCase()
        const matchesUser =
          log.user?.full_name?.toLowerCase().includes(q) ||
          log.user?.email?.toLowerCase().includes(q)
        const matchesEntity = log.entity_type?.toLowerCase().includes(q)
        const matchesDescription = log.description?.toLowerCase().includes(q)
        if (!matchesUser && !matchesEntity && !matchesDescription) return false
      }

      // Date range
      if (dateFrom && new Date(log.created_at) < new Date(dateFrom)) return false
      if (dateTo) {
        const endOfDay = new Date(dateTo)
        endOfDay.setHours(23, 59, 59, 999)
        if (new Date(log.created_at) > endOfDay) return false
      }

      return true
    })
  }, [logs, filter, entityTypeFilter, search, dateFrom, dateTo])

  // Stats (from all logs, not filtered)
  const stats = useMemo(
    () => ({
      total: logs.length,
      creates: logs.filter((l) => l.action === "CREATE").length,
      updates: logs.filter((l) => l.action === "UPDATE").length,
      deletes: logs.filter((l) => l.action === "DELETE").length,
    }),
    [logs]
  )

  // Pagination
  const visibleLogs = useMemo(
    () => filteredLogs.slice(0, visibleCount),
    [filteredLogs, visibleCount]
  )
  const hasMore = visibleCount < filteredLogs.length

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE)
  }, [])

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleExport = useCallback(() => {
    if (filteredLogs.length === 0) {
      toast.warning("Нет записей для экспорта")
      return
    }
    exportCSV(filteredLogs)
    toast.success(`Экспортировано ${filteredLogs.length} записей`)
  }, [filteredLogs])

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [filter, entityTypeFilter, search, dateFrom, dateTo])

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Загрузка журнала аудита...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Аудит и история</h1>
          <p className="text-muted-foreground">Отслеживание всех действий в системе</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Экспорт CSV
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Всего записей</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-950 rounded-lg">
                <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Создания</p>
                <p className="text-2xl font-bold">{stats.creates}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-950 rounded-lg">
                <Pencil className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Изменения</p>
                <p className="text-2xl font-bold">{stats.updates}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-950 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Удаления</p>
                <p className="text-2xl font-bold">{stats.deletes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap items-end">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени, email, описанию..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Action tabs */}
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">Все</TabsTrigger>
                <TabsTrigger value="CREATE">Создания</TabsTrigger>
                <TabsTrigger value="UPDATE">Изменения</TabsTrigger>
                <TabsTrigger value="DELETE">Удаления</TabsTrigger>
                <TabsTrigger value="LOGIN">Входы</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Entity type filter */}
            <Select value={entityTypeFilter} onValueChange={setEntityTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Тип сущности" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                {ENTITY_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range */}
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[150px]"
              />
              <span className="text-muted-foreground">&mdash;</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[150px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>История действий</span>
            <span className="text-sm font-normal text-muted-foreground">
              {filteredLogs.length} из {logs.length} записей
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visibleLogs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <History className="mx-auto h-10 w-10 mb-3 opacity-40" />
                <p className="text-sm">Записи не найдены</p>
              </div>
            ) : (
              visibleLogs.map((log) => {
                const Icon = getActionIcon(log.action)
                const isExpanded = expandedIds.has(log.id)
                const hasValues = log.old_value || log.new_value

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    {/* Action icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div
                        className={`p-2 rounded-full ${ACTION_COLORS[log.action] || "bg-gray-500"}`}
                      >
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Badges row */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge
                          className={`${ACTION_COLORS[log.action] || "bg-gray-500"} text-white`}
                        >
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                        {log.entity_type && (
                          <Badge variant="outline">
                            {ENTITY_LABELS[log.entity_type] || log.entity_type}
                          </Badge>
                        )}
                        {log.entity_id && (
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                            {log.entity_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      {log.description && (
                        <p className="text-sm text-muted-foreground mt-1">{log.description}</p>
                      )}

                      {/* Expandable old/new value diff */}
                      {hasValues && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={() => toggleExpand(log.id)}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                            {isExpanded ? "Скрыть данные" : "Показать данные"}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 grid gap-2 md:grid-cols-2">
                              {log.old_value && (
                                <div className="text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-3 rounded overflow-auto max-h-60">
                                  <p className="font-medium text-red-700 dark:text-red-400 mb-1">
                                    Старое значение:
                                  </p>
                                  <pre className="whitespace-pre-wrap break-all text-muted-foreground">
                                    {JSON.stringify(log.old_value, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {log.new_value && (
                                <div className="text-xs bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-3 rounded overflow-auto max-h-60">
                                  <p className="font-medium text-green-700 dark:text-green-400 mb-1">
                                    Новое значение:
                                  </p>
                                  <pre className="whitespace-pre-wrap break-all text-muted-foreground">
                                    {JSON.stringify(log.new_value, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right side: user + date */}
                    <div className="flex-shrink-0 text-right space-y-1">
                      <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{log.user?.full_name || log.user?.email || "Система"}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(log.created_at), "dd MMM yyyy", { locale: ru })}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{format(new Date(log.created_at), "HH:mm:ss")}</span>
                      </div>
                      {log.ip_address && (
                        <p className="text-xs text-muted-foreground/60">{log.ip_address}</p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Load more / pagination info */}
          {visibleLogs.length > 0 && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Показано {visibleLogs.length} из {filteredLogs.length} записей
              </p>
              {hasMore && (
                <Button variant="outline" onClick={handleLoadMore}>
                  Загрузить ещё {PAGE_SIZE}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
