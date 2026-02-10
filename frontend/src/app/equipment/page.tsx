"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Search,
  Thermometer,
  Settings,
  Calendar,
  CheckCircle2,
  XCircle,
  Zap,
  ClipboardList,
  Trash2,
  Power,
  PowerOff,
  Eye,
  EyeOff,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getEquipment, createEquipmentLog, getMonitoringParams, deactivateEquipment, activateEquipment, deleteEquipment } from "@/lib/api"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500",
  MAINTENANCE: "bg-yellow-500",
  BROKEN: "bg-red-500",
  DECOMMISSIONED: "bg-gray-500",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Работает",
  MAINTENANCE: "Обслуживание",
  BROKEN: "Неисправен",
  DECOMMISSIONED: "Списано",
}

const TYPE_LABELS: Record<string, string> = {
  INCUBATOR: "Инкубатор",
  FREEZER: "Морозильник",
  FRIDGE: "Холодильник",
  CABINET: "Бокс",
  RACK: "Стеллаж",
  LAMINAR: "Ламинарный шкаф",
  CENTRIFUGE: "Центрифуга",
  MICROSCOPE: "Микроскоп",
  NITROGEN_TANK: "Сосуд Дьюара",
  WATER_BATH: "Водяная баня",
  OTHER: "Другое",
}

// Monitoring is now per-equipment (configured via checkboxes)

interface MonitoringParam {
  id: string
  equipment_type: string
  param_key: string
  param_label: string
  unit: string
  min_value?: number
  max_value?: number
  is_required: boolean
  sort_order: number
}

export default function EquipmentPage() {
  const router = useRouter()
  const [equipment, setEquipment] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedEquip, setSelectedEquip] = useState<any>(null)
  const [showMonitoringModal, setShowMonitoringModal] = useState(false)
  const [monitoringValues, setMonitoringValues] = useState<Record<string, string>>({})
  const [monitoringNotes, setMonitoringNotes] = useState("")
  const [monitoringParams, setMonitoringParams] = useState<MonitoringParam[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<any>(null)

  useEffect(() => {
    loadEquipment()
  }, [])

  const loadEquipment = async () => {
    try {
      const data = await getEquipment({ includeInactive: true })
      setEquipment(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (item: any) => {
    try {
      if (item.is_active === false) {
        await activateEquipment(item.id)
        toast.success(`${item.name} активировано`)
      } else {
        await deactivateEquipment(item.id)
        toast.success(`${item.name} деактивировано`)
      }
      loadEquipment()
    } catch (err) {
      console.error(err)
      toast.error("Ошибка при изменении статуса")
    }
  }

  const handleDelete = async (item: any) => {
    try {
      await deleteEquipment(item.id)
      toast.success(`${item.name} удалено`)
      setConfirmDelete(null)
      loadEquipment()
    } catch (err: any) {
      console.error(err)
      if (err?.message?.includes("foreign key") || err?.code === "23503") {
        toast.error("Нельзя удалить — есть связанные записи. Деактивируйте вместо удаления.")
      } else {
        toast.error("Ошибка при удалении")
      }
      setConfirmDelete(null)
    }
  }

  const openMonitoring = async (item: any) => {
    setSelectedEquip(item)
    setMonitoringValues({})
    setMonitoringNotes("")
    try {
      const params = await getMonitoringParams(item.id)
      setMonitoringParams(params || [])
    } catch (err) {
      console.error(err)
      setMonitoringParams([])
    }
    setShowMonitoringModal(true)
  }

  const handleLogMonitoring = async () => {
    if (!selectedEquip) return

    setIsSubmitting(true)
    try {
      const logData: Record<string, any> = { notes: monitoringNotes || undefined }
      for (const param of monitoringParams) {
        const val = monitoringValues[param.param_key]
        if (val !== undefined && val !== "") {
          logData[param.param_key] = Number(val)
        }
      }
      await createEquipmentLog(selectedEquip.id, logData)
      setShowMonitoringModal(false)
      setSelectedEquip(null)
      setMonitoringValues({})
      setMonitoringNotes("")
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isValidationSoon = (item: any) => {
    if (!item.next_validation) return false
    const diff = new Date(item.next_validation).getTime() - Date.now()
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000 // 30 days
  }

  const isValidationOverdue = (item: any) => {
    if (!item.next_validation) return false
    return new Date(item.next_validation).getTime() < Date.now()
  }

  const isMaintenanceOverdue = (item: any) => {
    if (!item.next_maintenance) return false
    return new Date(item.next_maintenance).getTime() < Date.now()
  }

  const isMaintenanceUrgent = (item: any) => {
    if (!item.next_maintenance) return false
    const diff = new Date(item.next_maintenance).getTime() - Date.now()
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000 // 7 days
  }

  const isMaintenanceSoon = (item: any) => {
    if (!item.next_maintenance) return false
    const diff = new Date(item.next_maintenance).getTime() - Date.now()
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000 // 30 days
  }

  const filteredEquipment = equipment.filter(item => {
    if (!showInactive && item.is_active === false) return false
    const matchesStatus = filter === "all" || item.status === filter
    const matchesType = typeFilter === "all" || item.type === typeFilter
    const matchesSearch = !search ||
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.code?.toLowerCase().includes(search.toLowerCase()) ||
      item.location?.toLowerCase().includes(search.toLowerCase()) ||
      item.inventory_number?.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesType && matchesSearch
  })
  const inactiveCount = equipment.filter(e => e.is_active === false).length

  const activeEquipment = filteredEquipment.filter(e => e.status === "ACTIVE")
  const maintenanceEquipment = filteredEquipment.filter(e => e.status === "MAINTENANCE")
  const brokenEquipment = filteredEquipment.filter(e => e.status === "BROKEN")

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
          <h1 className="text-2xl font-bold">Оборудование</h1>
          <p className="text-muted-foreground">Учёт и мониторинг лабораторного оборудования</p>
        </div>
        <Button onClick={() => router.push("/equipment/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Добавить
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Работает</p>
                <p className="text-2xl font-bold">{activeEquipment.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Settings className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Обслуживание</p>
                <p className="text-2xl font-bold">{maintenanceEquipment.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Неисправно</p>
                <p className="text-2xl font-bold">{brokenEquipment.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Zap className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Всего</p>
                <p className="text-2xl font-bold">{filteredEquipment.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
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
            <TabsTrigger value="ACTIVE">Работает</TabsTrigger>
            <TabsTrigger value="MAINTENANCE">Обслуживание</TabsTrigger>
            <TabsTrigger value="BROKEN">Неисправно</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={typeFilter} onValueChange={setTypeFilter}>
          <TabsList>
            <TabsTrigger value="all">Все типы</TabsTrigger>
            <TabsTrigger value="INCUBATOR">Инкубаторы</TabsTrigger>
            <TabsTrigger value="FREEZER">Морозилки</TabsTrigger>
            <TabsTrigger value="FRIDGE">Холодильники</TabsTrigger>
          </TabsList>
        </Tabs>
        {inactiveCount > 0 && (
          <Button
            variant={showInactive ? "default" : "outline"}
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
            className="gap-1.5"
          >
            {showInactive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {showInactive ? `Скрыть неактивные (${inactiveCount})` : `Показать неактивные (${inactiveCount})`}
          </Button>
        )}
      </div>

      {/* Equipment List */}
      <div className="space-y-4">
        {filteredEquipment.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Оборудование не найдено
            </CardContent>
          </Card>
        ) : (
          filteredEquipment.map(item => (
            <Card key={item.id} className={`hover:bg-muted/50 transition-colors ${item.is_active === false ? 'opacity-60' : ''}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      {["INCUBATOR", "FRIDGE", "FREEZER"].includes(item.type) ? (
                        <Thermometer className="h-5 w-5" />
                      ) : (
                        <Settings className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{item.name}</p>
                        <Badge className={STATUS_COLORS[item.status]}>
                          {STATUS_LABELS[item.status]}
                        </Badge>
                        {item.is_active === false && (
                          <Badge variant="outline" className="text-gray-500 border-gray-400">Деактивировано</Badge>
                        )}
                        {isValidationOverdue(item) && (
                          <Badge variant="destructive">Валидация просрочена</Badge>
                        )}
                        {isValidationSoon(item) && !isValidationOverdue(item) && (
                          <Badge variant="outline" className="text-yellow-600 border-yellow-400">Скоро валидация</Badge>
                        )}
                        {isMaintenanceOverdue(item) && (
                          <Badge variant="destructive">ТО просрочено</Badge>
                        )}
                        {isMaintenanceUrgent(item) && !isMaintenanceOverdue(item) && (
                          <Badge variant="outline" className="text-red-600 border-red-400">Срочно ТО</Badge>
                        )}
                        {isMaintenanceSoon(item) && !isMaintenanceUrgent(item) && !isMaintenanceOverdue(item) && (
                          <Badge variant="outline" className="text-orange-600 border-orange-400">Скоро ТО</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span>{TYPE_LABELS[item.type] || item.type}</span>
                        {item.code && <span>Код: {item.code}</span>}
                        {item.inventory_number && <span>Инв.: {item.inventory_number}</span>}
                        {item.location && <span>{item.location}</span>}
                      </div>
                      {item.serial_number && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Серийный: {item.serial_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {item.next_validation && (
                      <p className="text-sm text-muted-foreground">
                        <Calendar className="inline h-3.5 w-3.5 mr-1" />
                        Валидация: {format(new Date(item.next_validation), "dd.MM.yyyy", { locale: ru })}
                      </p>
                    )}
                    {item.next_maintenance && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <Settings className="inline h-3.5 w-3.5 mr-1" />
                        ТО: {format(new Date(item.next_maintenance), "dd.MM.yyyy", { locale: ru })}
                      </p>
                    )}
                    <div className="flex gap-2 mt-3 flex-wrap justify-end">
                      {item.is_active !== false && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMonitoring(item)}
                        >
                          <ClipboardList className="mr-2 h-4 w-4" />
                          Мониторинг
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/equipment/${item.id}`)}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Детали
                      </Button>
                      <Button
                        size="sm"
                        variant={item.is_active === false ? "default" : "outline"}
                        onClick={() => handleDeactivate(item)}
                      >
                        {item.is_active === false ? (
                          <><Power className="mr-2 h-4 w-4" />Активировать</>
                        ) : (
                          <><PowerOff className="mr-2 h-4 w-4" />Деактивировать</>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmDelete(item)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Удалить
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader>
              <CardTitle className="text-destructive">Удалить оборудование?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Вы уверены, что хотите удалить <strong>{confirmDelete.name}</strong>?
                Это действие нельзя отменить. Все позиции этого оборудования также будут удалены.
              </p>
              <p className="text-xs text-muted-foreground">
                Если есть связанные контейнеры или логи, удаление будет невозможно. Используйте деактивацию.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                  Отмена
                </Button>
                <Button variant="destructive" onClick={() => handleDelete(confirmDelete)}>
                  Удалить
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Monitoring Modal */}
      {showMonitoringModal && selectedEquip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Мониторинг</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedEquip.name}</p>
                <p className="text-sm text-muted-foreground">
                  {TYPE_LABELS[selectedEquip.type] || selectedEquip.type}
                </p>
              </div>

              {monitoringParams.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Параметры мониторинга не настроены для этого типа оборудования.
                  Добавьте их в справочнике параметров мониторинга.
                </p>
              ) : (
                monitoringParams.map(param => (
                  <div key={param.param_key}>
                    <label className="text-sm font-medium">
                      {param.param_label} ({param.unit})
                      {param.is_required && " *"}
                    </label>
                    {param.min_value != null && param.max_value != null && (
                      <p className="text-xs text-muted-foreground mb-1">
                        Норма: {param.min_value} ... {param.max_value} {param.unit}
                      </p>
                    )}
                    <Input
                      type="number"
                      step="0.1"
                      value={monitoringValues[param.param_key] || ""}
                      onChange={(e) => setMonitoringValues(prev => ({
                        ...prev,
                        [param.param_key]: e.target.value
                      }))}
                      className="mt-1"
                      placeholder={`Введите ${param.param_label.toLowerCase()}`}
                    />
                  </div>
                ))
              )}

              <div>
                <label className="text-sm font-medium">Примечания</label>
                <textarea
                  value={monitoringNotes}
                  onChange={(e) => setMonitoringNotes(e.target.value)}
                  className="w-full mt-1 p-3 border rounded-lg"
                  rows={3}
                  placeholder="Дополнительные заметки..."
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMonitoringModal(false)
                    setSelectedEquip(null)
                  }}
                >
                  Отмена
                </Button>
                <Button
                  onClick={handleLogMonitoring}
                  disabled={isSubmitting || (monitoringParams.length > 0 && monitoringParams.some(p => p.is_required && !monitoringValues[p.param_key]))}
                >
                  {isSubmitting ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
