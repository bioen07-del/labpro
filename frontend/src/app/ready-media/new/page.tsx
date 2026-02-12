"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Plus, Trash2, Calculator } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { createReadyMedium, getBatches } from "@/lib/api"

interface BatchOption {
  id: string
  batch_number: string
  quantity: number
  unit: string
  volume_per_unit?: number | null
  current_unit_volume?: number | null
  nomenclature?: { id: string; name: string; category: string } | null
  expiration_date?: string
}

/** Формат остатка партии: учитывает пофлаконный учёт (только для сред/реагентов) */
function formatBatchStock(b: BatchOption): string {
  if (b.volume_per_unit && b.volume_per_unit > 0 && b.nomenclature?.category !== 'CONSUMABLE') {
    return `${b.quantity} фл, тек: ${b.current_unit_volume ?? b.volume_per_unit}/${b.volume_per_unit} мл`
  }
  return `${b.quantity} ${b.unit}`
}

interface Component {
  id: string
  batch_id: string
  percent: number
  volume_ml: number
  categoryFilter: string
}

let componentCounter = 0

export default function NewReadyMediumPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [batches, setBatches] = useState<BatchOption[]>([])
  const [batchesLoading, setBatchesLoading] = useState(true)

  // Form
  const [name, setName] = useState("")
  const [baseBatchId, setBaseBatchId] = useState("")
  const [totalVolume, setTotalVolume] = useState(500)
  const [prepDate, setPrepDate] = useState(new Date().toISOString().split("T")[0])
  const [expDate, setExpDate] = useState("")
  const [notes, setNotes] = useState("")

  // Components (additives)
  const [components, setComponents] = useState<Component[]>([])

  useEffect(() => {
    loadBatches()
  }, [])

  async function loadBatches() {
    setBatchesLoading(true)
    try {
      const data = await getBatches({ status: "AVAILABLE" })
      setBatches((data || []) as BatchOption[])
    } catch (err) {
      console.error("Error loading batches:", err)
      toast.error("Ошибка загрузки партий")
    } finally {
      setBatchesLoading(false)
    }
  }

  // Split batches into media (base) and reagents/serums (components)
  const mediaBatches = batches.filter(
    (b) => b.nomenclature?.category === "MEDIUM"
  )
  // All non-MEDIUM, non-CONSUMABLE batches can be used as components
  const componentBatches = batches.filter(
    (b) =>
      b.nomenclature?.category &&
      b.nomenclature.category !== "MEDIUM" &&
      b.nomenclature.category !== "CONSUMABLE"
  )

  /** Фильтрация компонентов по категории (per-component) */
  function getFilteredComponents(catFilter: string) {
    return catFilter === 'all'
      ? componentBatches
      : componentBatches.filter((b) => b.nomenclature?.category === catFilter)
  }

  // Calculate volumes
  const totalComponentPercent = components.reduce((s, c) => s + c.percent, 0)
  const basePercent = 100 - totalComponentPercent
  const baseVolume = (basePercent / 100) * totalVolume

  // Recalculate component volumes when totalVolume or percent changes
  const componentsWithVolume = components.map((c) => ({
    ...c,
    volume_ml: (c.percent / 100) * totalVolume,
  }))

  // Auto-generate name from composition
  const autoName = useMemo(() => {
    const baseBatch = mediaBatches.find((b) => b.id === baseBatchId)
    const baseName = baseBatch?.nomenclature?.name || ""
    if (!baseName) return ""

    const parts = [baseName]
    for (const c of components) {
      const cb = batches.find((b) => b.id === c.batch_id)
      if (cb?.nomenclature?.name && c.percent > 0) {
        parts.push(`${c.percent}% ${cb.nomenclature.name}`)
      }
    }
    return parts.join(" + ")
  }, [baseBatchId, components, mediaBatches, batches])

  // Add component
  function addComponent() {
    componentCounter++
    setComponents((prev) => [
      ...prev,
      { id: `comp-${componentCounter}`, batch_id: "", percent: 0, volume_ml: 0, categoryFilter: 'all' },
    ])
  }

  function removeComponent(id: string) {
    setComponents((prev) => prev.filter((c) => c.id !== id))
  }

  function updateComponent(id: string, field: "batch_id" | "percent" | "categoryFilter", value: string | number) {
    setComponents((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const updated = { ...c, [field]: field === "percent" ? Number(value) : value }
        // При смене категории сбрасываем выбранную партию
        if (field === "categoryFilter") updated.batch_id = ""
        return updated
      })
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (totalComponentPercent > 100) {
      toast.error("Сумма компонентов превышает 100%")
      return
    }

    setLoading(true)
    try {
      const baseBatch = mediaBatches.find((b) => b.id === baseBatchId)

      // Build composition JSON
      const composition = {
        base: {
          batch_id: baseBatchId,
          nomenclature: baseBatch?.nomenclature?.name,
          percent: basePercent,
          volume_ml: baseVolume,
        },
        components: componentsWithVolume
          .filter((c) => c.batch_id && c.percent > 0)
          .map((c) => {
            const cb = batches.find((b) => b.id === c.batch_id)
            return {
              batch_id: c.batch_id,
              nomenclature: cb?.nomenclature?.name,
              percent: c.percent,
              volume_ml: c.volume_ml,
            }
          }),
        total_volume_ml: totalVolume,
      }

      await createReadyMedium({
        name: name || autoName,
        batch_id: baseBatchId || null,
        nomenclature_id: baseBatch?.nomenclature?.id || null,
        volume_ml: totalVolume,
        current_volume_ml: totalVolume,
        composition,
        prepared_at: prepDate || null,
        expiration_date: expDate || null,
        notes: notes || null,
        status: "ACTIVE",
      })

      toast.success("Рабочая среда создана")
      router.push("/inventory")
    } catch (err) {
      console.error("Error creating ready medium:", err)
      toast.error("Ошибка при создании рабочей среды")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-3xl space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inventory">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Приготовление рабочей среды</h1>
          <p className="text-muted-foreground">
            Рассчитайте состав и зарегистрируйте новую рабочую среду
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Базовая среда */}
        <Card>
          <CardHeader>
            <CardTitle>Базовая среда</CardTitle>
            <CardDescription>Выберите партию базовой среды</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Партия базовой среды *</Label>
                {batchesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Загрузка...
                  </div>
                ) : (
                  <Select value={baseBatchId} onValueChange={setBaseBatchId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите партию среды..." />
                    </SelectTrigger>
                    <SelectContent>
                      {mediaBatches.length === 0 ? (
                        <SelectItem value="__empty" disabled>
                          Нет доступных партий сред
                        </SelectItem>
                      ) : (
                        mediaBatches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.nomenclature?.name} — {batch.batch_number} ({formatBatchStock(batch)})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Общий объём (мл) *</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={totalVolume}
                  onChange={(e) => setTotalVolume(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Компоненты/Добавки */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Компоненты / Добавки</span>
              <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                <Plus className="mr-1 h-4 w-4" />
                Добавить
              </Button>
            </CardTitle>
            <CardDescription>
              FBS, пенициллин-стрептомицин, L-глутамин, HEPES и другие добавки
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {components.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Нажмите «Добавить» для добавления компонентов
              </p>
            ) : (
              components.map((comp, idx) => {
                const filtered = getFilteredComponents(comp.categoryFilter)
                return (
                <div key={comp.id} className="border-b pb-3 space-y-2">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Компонент {idx + 1}
                      </Label>
                      <div className="flex gap-2">
                        <Select value={comp.categoryFilter} onValueChange={(v) => updateComponent(comp.id, "categoryFilter", v)}>
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Категория" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Все</SelectItem>
                            <SelectItem value="SERUM">Сыворотки</SelectItem>
                            <SelectItem value="SUPPLEMENT">Добавки</SelectItem>
                            <SelectItem value="BUFFER">Буферы</SelectItem>
                            <SelectItem value="ENZYME">Ферменты</SelectItem>
                            <SelectItem value="REAGENT">Реагенты</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={comp.batch_id}
                          onValueChange={(v) => updateComponent(comp.id, "batch_id", v)}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Выберите компонент..." />
                          </SelectTrigger>
                          <SelectContent>
                            {filtered.map((batch) => (
                              <SelectItem key={batch.id} value={batch.id}>
                                {batch.nomenclature?.name} — {batch.batch_number} ({formatBatchStock(batch)})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                  <div className="w-24 space-y-1">
                    <Label className="text-xs text-muted-foreground">%</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={comp.percent || ""}
                      onChange={(e) =>
                        updateComponent(comp.id, "percent", e.target.value)
                      }
                      placeholder="10"
                    />
                  </div>

                  <div className="w-24 text-right">
                    <p className="text-sm font-medium">
                      {((comp.percent / 100) * totalVolume).toFixed(1)} мл
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => removeComponent(comp.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  </div>
                </div>
                )
              })
            )}

            {/* Summary */}
            <div className="mt-4 p-3 rounded-lg bg-muted/50 space-y-1">
              <div className="flex items-center gap-2 mb-2">
                <Calculator className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm">Расчёт объёмов</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Базовая среда ({basePercent.toFixed(1)}%)</span>
                <span className="font-medium">{baseVolume.toFixed(1)} мл</span>
              </div>
              {componentsWithVolume
                .filter((c) => c.batch_id && c.percent > 0)
                .map((c) => {
                  const cb = batches.find((b) => b.id === c.batch_id)
                  return (
                    <div key={c.id} className="flex justify-between text-sm">
                      <span>
                        {cb?.nomenclature?.name || "?"} ({c.percent}%)
                      </span>
                      <span className="font-medium">{c.volume_ml.toFixed(1)} мл</span>
                    </div>
                  )
                })}
              <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
                <span>ИТОГО</span>
                <span>{totalVolume.toFixed(1)} мл</span>
              </div>
              {totalComponentPercent > 100 && (
                <p className="text-destructive text-xs mt-1">
                  Сумма компонентов превышает 100%!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Название и даты */}
        <Card>
          <CardHeader>
            <CardTitle>Регистрация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={autoName || "DMEM + 10% FBS + 1% P/S"}
              />
              {autoName && !name && (
                <p className="text-xs text-muted-foreground">
                  Авто: <Badge variant="outline" className="text-xs">{autoName}</Badge>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Дата приготовления *</Label>
                <Input
                  type="date"
                  value={prepDate}
                  onChange={(e) => setPrepDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Срок годности *</Label>
                <Input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Примечания</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Дополнительная информация..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={loading || !baseBatchId || totalComponentPercent > 100}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Создание...
              </>
            ) : (
              "Создать рабочую среду"
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/inventory">Отмена</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
