"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
  Save,
  MapPin,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  getEquipmentById,
  updateEquipment,
  createPosition,
  updatePosition,
} from "@/lib/api"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const equipmentTypes = [
  { value: "INCUBATOR", label: "Инкубатор" },
  { value: "LAMINAR", label: "Ламинарный шкаф" },
  { value: "CENTRIFUGE", label: "Центрифуга" },
  { value: "MICROSCOPE", label: "Микроскоп" },
  { value: "FREEZER", label: "Морозильник" },
  { value: "FRIDGE", label: "Холодильник" },
  { value: "CABINET", label: "Бокс" },
  { value: "RACK", label: "Стеллаж" },
  { value: "NITROGEN_TANK", label: "Сосуд Дьюара (азотный)" },
  { value: "WATER_BATH", label: "Водяная баня" },
  { value: "OTHER", label: "Другое" },
]

const equipmentStatuses = [
  { value: "ACTIVE", label: "Активно" },
  { value: "MAINTENANCE", label: "На обслуживании" },
  { value: "DECOMMISSIONED", label: "Списано" },
]

// ---------------------------------------------------------------------------
// Position interface
// ---------------------------------------------------------------------------

interface Position {
  id: string
  path: string
  qr_code: string | null
  is_active: boolean
  isNew?: boolean // for newly added positions not yet saved
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function EditEquipmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Equipment form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "INCUBATOR",
    model: "",
    serial_number: "",
    location: "",
    status: "ACTIVE",
    notes: "",
    temperature: "",
  })

  // Positions
  const [positions, setPositions] = useState<Position[]>([])
  const [deletedPositionIds, setDeletedPositionIds] = useState<string[]>([])

  // Dialog for adding position
  const [showAddPosition, setShowAddPosition] = useState(false)
  const [newPositionPath, setNewPositionPath] = useState("")
  const [newPositionQR, setNewPositionQR] = useState("")

  // Bulk add dialog
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [bulkPrefix, setBulkPrefix] = useState("")
  const [bulkFrom, setBulkFrom] = useState(1)
  const [bulkTo, setBulkTo] = useState(10)

  // ---- Load data -----------------------------------------------------------
  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getEquipmentById(id)
      setFormData({
        code: data.code || "",
        name: data.name || "",
        type: data.type || "INCUBATOR",
        model: data.model || "",
        serial_number: data.serial_number || "",
        location: data.location || "",
        status: data.status || "ACTIVE",
        notes: data.notes || "",
        temperature: data.current_temperature != null ? String(data.current_temperature) : "",
      })
      setPositions(
        (data.positions || []).map((p: any) => ({
          id: p.id,
          path: p.path || "",
          qr_code: p.qr_code || null,
          is_active: p.is_active !== false,
        }))
      )
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки оборудования")
    } finally {
      setLoading(false)
    }
  }

  // ---- Handlers ------------------------------------------------------------
  function handleChange(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  function addPosition() {
    if (!newPositionPath.trim()) {
      toast.error("Укажите путь позиции")
      return
    }
    const tempId = `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setPositions((prev) => [
      ...prev,
      {
        id: tempId,
        path: newPositionPath.trim(),
        qr_code: newPositionQR.trim() || null,
        is_active: true,
        isNew: true,
      },
    ])
    setNewPositionPath("")
    setNewPositionQR("")
    setShowAddPosition(false)
  }

  function bulkAddPositions() {
    if (!bulkPrefix.trim()) {
      toast.error("Укажите префикс")
      return
    }
    if (bulkFrom > bulkTo) {
      toast.error("Начало должно быть меньше конца")
      return
    }
    const newOnes: Position[] = []
    for (let i = bulkFrom; i <= bulkTo; i++) {
      const tempId = `new-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 5)}`
      newOnes.push({
        id: tempId,
        path: `${bulkPrefix.trim()}/${i}`,
        qr_code: null,
        is_active: true,
        isNew: true,
      })
    }
    setPositions((prev) => [...prev, ...newOnes])
    setShowBulkAdd(false)
    toast.success(`Добавлено ${newOnes.length} позиций`)
  }

  function removePosition(posId: string) {
    const pos = positions.find((p) => p.id === posId)
    if (pos && !pos.isNew) {
      setDeletedPositionIds((prev) => [...prev, posId])
    }
    setPositions((prev) => prev.filter((p) => p.id !== posId))
  }

  function togglePositionActive(posId: string) {
    setPositions((prev) =>
      prev.map((p) => (p.id === posId ? { ...p, is_active: !p.is_active } : p))
    )
  }

  // ---- Save ----------------------------------------------------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      // 1. Update equipment
      await updateEquipment(id, {
        code: formData.code || null,
        name: formData.name,
        type: formData.type,
        location: formData.location || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        status: formData.status,
        notes: formData.notes || null,
        current_temperature: formData.temperature ? parseFloat(formData.temperature) : null,
      })

      // 2. Delete removed positions (soft delete — mark inactive)
      for (const delId of deletedPositionIds) {
        try {
          await updatePosition(delId, { is_active: false })
        } catch (err) {
          console.error("Error deactivating position:", delId, err)
        }
      }

      // 3. Create new positions
      for (const pos of positions) {
        if (pos.isNew) {
          try {
            await createPosition({
              equipment_id: id,
              path: pos.path,
              qr_code: pos.qr_code || null,
              is_active: pos.is_active,
            })
          } catch (err) {
            console.error("Error creating position:", pos.path, err)
          }
        } else {
          // Update existing positions that might have changed
          try {
            await updatePosition(pos.id, {
              path: pos.path,
              is_active: pos.is_active,
            })
          } catch (err) {
            console.error("Error updating position:", pos.id, err)
          }
        }
      }

      toast.success("Оборудование обновлено")
      router.push(`/equipment/${id}`)
    } catch (err: any) {
      console.error("Error updating equipment:", err)
      toast.error(err?.message || "Ошибка при сохранении")
    } finally {
      setSaving(false)
    }
  }

  // ---- Loading / Error states ----------------------------------------------
  if (loading) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="container py-10 space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{error}</span>
        </div>
        <Button variant="outline" asChild>
          <Link href="/equipment">
            <ArrowLeft className="mr-2 h-4 w-4" />
            К списку
          </Link>
        </Button>
      </div>
    )
  }

  // ---- Render --------------------------------------------------------------
  const activePositions = positions.filter((p) => p.is_active)
  const inactivePositions = positions.filter((p) => !p.is_active)

  return (
    <div className="container mx-auto py-6 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/equipment/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Редактирование оборудования</h1>
          <p className="text-muted-foreground text-sm">
            Измените параметры и управляйте позициями хранения
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Equipment Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Код оборудования</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => handleChange("code", e.target.value)}
                  placeholder="INC-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Название *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Инкубатор CO2"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Тип *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => handleChange("type", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Статус</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => handleChange("status", v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {equipmentStatuses.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="model">Модель</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => handleChange("model", e.target.value)}
                  placeholder="Thermo Heracell 150i"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serial_number">Серийный номер</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => handleChange("serial_number", e.target.value)}
                  placeholder="SN12345"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location">Расположение</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange("location", e.target.value)}
                  placeholder="Комната 101"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="temperature">Текущая температура (&deg;C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => handleChange("temperature", e.target.value)}
                  placeholder="37.0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Дополнительная информация..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Positions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Позиции хранения ({activePositions.length})
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkAdd(true)}
                >
                  Пакетное добавление
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddPosition(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Добавить
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              Места хранения внутри оборудования (полки, ячейки, кейны).
              Позиции используются для размещения контейнеров с культурами.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <p className="py-6 text-center text-muted-foreground">
                Нет позиций. Нажмите &laquo;Добавить&raquo; или &laquo;Пакетное
                добавление&raquo;.
              </p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {positions.map((pos) => (
                  <div
                    key={pos.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
                      pos.is_active ? "bg-background" : "bg-muted/50 opacity-60"
                    }`}
                  >
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-mono text-sm flex-1">{pos.path}</span>
                    {pos.qr_code && (
                      <span className="text-xs text-muted-foreground">
                        QR: {pos.qr_code}
                      </span>
                    )}
                    {pos.isNew && (
                      <span className="text-xs text-blue-600 font-medium">
                        Новая
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                      onClick={() => togglePositionActive(pos.id)}
                    >
                      {pos.is_active ? "Деактивировать" : "Активировать"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8"
                      onClick={() => removePosition(pos.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Сохранить
              </>
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/equipment/${id}`}>Отмена</Link>
          </Button>
        </div>
      </form>

      {/* Add Position Dialog */}
      <Dialog open={showAddPosition} onOpenChange={setShowAddPosition}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Добавить позицию</DialogTitle>
            <DialogDescription>
              Укажите путь позиции (напр. &laquo;Полка 1 / Ячейка 3&raquo;)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Путь / название *</Label>
              <Input
                value={newPositionPath}
                onChange={(e) => setNewPositionPath(e.target.value)}
                placeholder="Полка 1 / Ячейка 3"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addPosition()
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>QR-код (необязательно)</Label>
              <Input
                value={newPositionQR}
                onChange={(e) => setNewPositionQR(e.target.value)}
                placeholder="POS-001"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddPosition(false)}>
              Отмена
            </Button>
            <Button onClick={addPosition}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Dialog */}
      <Dialog open={showBulkAdd} onOpenChange={setShowBulkAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Пакетное добавление позиций</DialogTitle>
            <DialogDescription>
              Создать диапазон позиций с числовой нумерацией.
              Например: &laquo;Полка 1&raquo; от 1 до 10 создаст
              &laquo;Полка 1/1&raquo;, &laquo;Полка 1/2&raquo; и т.д.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Префикс *</Label>
              <Input
                value={bulkPrefix}
                onChange={(e) => setBulkPrefix(e.target.value)}
                placeholder="Полка 1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>От</Label>
                <Input
                  type="number"
                  min={1}
                  value={bulkFrom}
                  onChange={(e) => setBulkFrom(parseInt(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-2">
                <Label>До</Label>
                <Input
                  type="number"
                  min={1}
                  value={bulkTo}
                  onChange={(e) => setBulkTo(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Будет создано: {Math.max(0, bulkTo - bulkFrom + 1)} позиций
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkAdd(false)}>
              Отмена
            </Button>
            <Button onClick={bulkAddPositions}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
