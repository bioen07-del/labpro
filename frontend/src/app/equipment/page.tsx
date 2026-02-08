"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Search, 
  Thermometer, 
  Settings,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getEquipment, createEquipmentLog } from "@/lib/api"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500",
  MAINTENANCE: "bg-yellow-500",
  BROKEN: "bg-red-500",
  OFFLINE: "bg-gray-500",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Работает",
  MAINTENANCE: "Обслуживание",
  BROKEN: "Неисправен",
  OFFLINE: "Офлайн",
}

const TYPE_LABELS: Record<string, string> = {
  INCUBATOR: "Инкубатор",
  FREEZER: "Морозильник",
  REFRIGERATOR: "Холодильник",
  LN2_TANK: "Сосуд Дьюара",
  BSC: "Бокс биологической безопасности",
  MICROSCOPE: "Микроскоп",
  CENTRIFUGE: "Центрифуга",
  AUTOCLAVE: "Автоклав",
  OTHER: "Другое",
}

export default function EquipmentPage() {
  const router = useRouter()
  const [equipment, setEquipment] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedEquip, setSelectedEquip] = useState<any>(null)
  const [showTempModal, setShowTempModal] = useState(false)
  const [tempValue, setTempValue] = useState<number | "">("")
  const [tempNotes, setTempNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    loadEquipment()
  }, [])

  const loadEquipment = async () => {
    try {
      const data = await getEquipment()
      setEquipment(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogTemp = async () => {
    if (!selectedEquip || tempValue === "") return
    
    setIsSubmitting(true)
    try {
      await createEquipmentLog(selectedEquip.id, {
        temperature: Number(tempValue),
        notes: tempNotes
      })
      setShowTempModal(false)
      setSelectedEquip(null)
      setTempValue("")
      setTempNotes("")
      loadEquipment()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getTemperatureStatus = (temp: number, minTemp: number, maxTemp: number) => {
    if (temp < minTemp || temp > maxTemp) return "critical"
    if (temp >= minTemp - 1 && temp <= maxTemp + 1) return "warning"
    return "normal"
  }

  const filteredEquipment = equipment.filter(item => {
    const matchesStatus = filter === "all" || item.status === filter
    const matchesType = typeFilter === "all" || item.type === typeFilter
    const matchesSearch = !search || 
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.code?.toLowerCase().includes(search.toLowerCase()) ||
      item.location?.toLowerCase().includes(search.toLowerCase())
    return matchesStatus && matchesType && matchesSearch
  })

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
            <TabsTrigger value="REFRIGERATOR">Холодильники</TabsTrigger>
          </TabsList>
        </Tabs>
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
          filteredEquipment.map(item => {
            const tempStatus = item.current_temperature !== undefined 
              ? getTemperatureStatus(item.current_temperature, item.min_temp || -100, item.max_temp || 100)
              : null

            return (
              <Card key={item.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        {item.type?.includes("FREEZER") || item.type?.includes("REFRIGERATOR") ? (
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
                          {tempStatus === "critical" && (
                            <Badge variant="destructive">Критичная температура</Badge>
                          )}
                          {tempStatus === "warning" && (
                            <Badge variant="outline">Отклонение</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>{TYPE_LABELS[item.type] || item.type}</span>
                          <span>Код: {item.code}</span>
                          <span>{item.location}</span>
                        </div>
                        {item.serial_number && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Серийный: {item.serial_number}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {item.current_temperature !== undefined && (
                        <div className="flex items-center gap-2">
                          <Thermometer className={`h-5 w-5 ${
                            tempStatus === "critical" ? "text-red-500" : 
                            tempStatus === "warning" ? "text-yellow-500" : "text-green-500"
                          }`} />
                          <span className={`text-2xl font-bold ${
                            tempStatus === "critical" ? "text-red-600" : 
                            tempStatus === "warning" ? "text-yellow-600" : ""
                          }`}>
                            {item.current_temperature}°C
                          </span>
                        </div>
                      )}
                      {item.min_temp !== undefined && item.max_temp !== undefined && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Норма: {item.min_temp}°C ... {item.max_temp}°C
                        </p>
                      )}
                      {item.last_calibration_date && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Калибровка: {format(new Date(item.last_calibration_date), "dd MMM yyyy", { locale: ru })}
                        </p>
                      )}
                      <div className="flex gap-2 mt-3">
                        {item.current_temperature !== undefined && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedEquip(item)
                              setTempValue(item.current_temperature)
                              setShowTempModal(true)
                            }}
                          >
                            <Thermometer className="mr-2 h-4 w-4" />
                            Температура
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
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Temperature Modal */}
      {showTempModal && selectedEquip && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Запись температуры</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedEquip.name}</p>
                <p className="text-sm text-muted-foreground">
                  Норма: {selectedEquip.min_temp}°C ... {selectedEquip.max_temp}°C
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium">Температура (°C) *</label>
                <Input
                  type="number"
                  step="0.1"
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value ? Number(e.target.value) : "")}
                  className="mt-1"
                  placeholder="Например: 37.0"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Примечания</label>
                <textarea
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  className="w-full mt-1 p-3 border rounded-lg"
                  rows={3}
                  placeholder="Дополнительные заметки..."
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowTempModal(false)
                    setSelectedEquip(null)
                  }}
                >
                  Отмена
                </Button>
                <Button onClick={handleLogTemp} disabled={isSubmitting || tempValue === ""}>
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
