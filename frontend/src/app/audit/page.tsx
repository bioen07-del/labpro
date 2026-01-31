"use client"

import { useEffect, useState } from "react"
import { 
  History, 
  Search, 
  Filter,
  User,
  Calendar,
  Clock,
  FileText,
  Database,
  Trash2,
  Edit,
  Download
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { getAuditLogs, getUsers } from "@/lib/api"

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Создание",
  UPDATE: "Изменение",
  DELETE: "Удаление",
  VIEW: "Просмотр",
  LOGIN: "Вход",
  LOGOUT: "Выход",
  DISPOSE: "Утилизация",
  PASSAGE: "Пассаж",
  OBSERVE: "Наблюдение",
  QC_TEST: "QC тест",
  MOVE: "Перемещение",
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-500",
  UPDATE: "bg-blue-500",
  DELETE: "bg-red-500",
  VIEW: "bg-gray-500",
  LOGIN: "bg-purple-500",
  LOGOUT: "bg-purple-500",
  DISPOSE: "bg-red-500",
  PASSAGE: "bg-blue-500",
  OBSERVE: "bg-blue-500",
  QC_TEST: "bg-purple-500",
  MOVE: "bg-orange-500",
}

const ENTITY_LABELS: Record<string, string> = {
  cultures: "Культуры",
  lots: "Лоты",
  containers: "Контейнеры",
  banks: "Банки",
  orders: "Заказы",
  qc_tests: "QC тесты",
  ready_media: "Готовые среды",
  equipment: "Оборудование",
  inventory: "Инвентарь",
  users: "Пользователи",
}

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const logsData = await getAuditLogs()
      setLogs(logsData || [])
    } catch (err) {
      console.error(err)
      // При ошибке используем пустой массив
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === "all" || log.action_type === filter
    const matchesSearch = !search || 
      log.user_email?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_id?.toLowerCase().includes(search.toLowerCase())
    
    let matchesDate = true
    if (dateFrom) {
      matchesDate = matchesDate && new Date(log.created_at) >= new Date(dateFrom)
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(log.created_at) <= new Date(dateTo)
    }
    
    return matchesFilter && matchesSearch && matchesDate
  })

  const actionStats = {
    total: logs.length,
    creates: logs.filter(l => l.action_type === "CREATE").length,
    updates: logs.filter(l => l.action_type === "UPDATE").length,
    deletes: logs.filter(l => l.action_type === "DELETE").length,
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Аудит и история</h1>
          <p className="text-muted-foreground">Отслеживание всех действий в системе</p>
        </div>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Экспорт
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <History className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Всего записей</p>
                <p className="text-2xl font-bold">{actionStats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Создания</p>
                <p className="text-2xl font-bold">{actionStats.creates}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Edit className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Изменения</p>
                <p className="text-2xl font-bold">{actionStats.updates}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Удаления</p>
                <p className="text-2xl font-bold">{actionStats.deletes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">Все</TabsTrigger>
                <TabsTrigger value="CREATE">Создания</TabsTrigger>
                <TabsTrigger value="UPDATE">Изменения</TabsTrigger>
                <TabsTrigger value="DELETE">Удаления</TabsTrigger>
                <TabsTrigger value="LOGIN">Входы</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-40"
                placeholder="От"
              />
              <span className="text-muted-foreground">—</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-40"
                placeholder="До"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">История действий</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredLogs.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                Записи не найдены
              </div>
            ) : (
              filteredLogs.slice(0, 100).map((log, index) => (
                <div 
                  key={log.id || index} 
                  className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-shrink-0">
                    <div className={`p-2 rounded-full ${ACTION_COLORS[log.action_type] || "bg-gray-500"}`}>
                      {(() => {
                        const Icon = log.action_type === "CREATE" ? FileText :
                                    log.action_type === "UPDATE" ? Edit :
                                    log.action_type === "DELETE" ? Trash2 :
                                    log.action_type === "LOGIN" || log.action_type === "LOGOUT" ? User :
                                    Database
                        return <Icon className="h-4 w-4 text-white" />
                      })()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={ACTION_COLORS[log.action_type] || "bg-gray-500"}>
                        {ACTION_LABELS[log.action_type] || log.action_type}
                      </Badge>
                      <Badge variant="outline">
                        {ENTITY_LABELS[log.entity_type] || log.entity_type}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">
                      {log.entity_id && (
                        <span className="font-mono bg-muted px-1 rounded">
                          {log.entity_id.slice(0, 8)}...
                        </span>
                      )}
                      {log.details && (
                        <span className="ml-2 text-muted-foreground">
                          {log.details}
                        </span>
                      )}
                    </p>
                    {log.changes && (
                      <div className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(log.changes, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <User className="h-3 w-3" />
                      <span>{log.user_email || "Система"}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {format(new Date(log.created_at), "dd MMM yyyy", { locale: ru })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Clock className="h-3 w-3" />
                      <span>
                        {format(new Date(log.created_at), "HH:mm:ss")}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          {filteredLogs.length > 100 && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Показано 100 из {filteredLogs.length} записей
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
