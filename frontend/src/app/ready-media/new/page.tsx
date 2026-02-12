"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Plus, Trash2, Calculator, Beaker, FlaskConical } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

import {
  createReadyMedium, getBatches, getAvailableStocks,
  writeOffBatchVolume, writeOffReadyMediumVolume,
} from "@/lib/api"
import { CONCENTRATION_UNITS } from "@/lib/units"
import type { PhysicalState } from "@/types"
import { PHYSICAL_STATE_LABELS } from "@/types"

// ==================== TYPES ====================

type CalculatorMode = 'PERCENT' | 'ABSOLUTE' | 'DILUTION'

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

interface StockOption {
  id: string
  code: string
  name: string
  current_volume_ml?: number
  volume_ml: number
  concentration?: number
  concentration_unit?: string
  physical_state?: string
}

interface PercentComponent {
  id: string
  batch_id: string
  percent: number
  volume_ml: number
  categoryFilter: string
}

interface AbsoluteComponent {
  id: string
  batch_id: string
  amount: number
  amount_unit: string
  volume_ml: number
  categoryFilter: string
}

// ==================== HELPERS ====================

function formatBatchStock(b: BatchOption): string {
  if (b.volume_per_unit && b.volume_per_unit > 0 && b.nomenclature?.category !== 'CONSUMABLE') {
    return `${b.quantity} фл, тек: ${b.current_unit_volume ?? b.volume_per_unit}/${b.volume_per_unit} мл`
  }
  return `${b.quantity} ${b.unit}`
}

const COMPONENT_CATEGORIES = [
  { value: 'all', label: 'Все' },
  { value: 'SERUM', label: 'Сыворотки' },
  { value: 'SUPPLEMENT', label: 'Добавки' },
  { value: 'BUFFER', label: 'Буферы' },
  { value: 'ENZYME', label: 'Ферменты' },
  { value: 'REAGENT', label: 'Реагенты' },
]

const AMOUNT_UNITS = ['мкг', 'мг', 'г', 'мкл', 'мл', 'ЕД', 'МЕ']

let componentCounter = 0

// ==================== MAIN COMPONENT ====================

export default function NewReadyMediumPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [batches, setBatches] = useState<BatchOption[]>([])
  const [stocks, setStocks] = useState<StockOption[]>([])
  const [batchesLoading, setBatchesLoading] = useState(true)

  // Calculator mode
  const [calcMode, setCalcMode] = useState<CalculatorMode>('PERCENT')

  // Physical state & concentration
  const [physicalState, setPhysicalState] = useState<PhysicalState>('WORKING_SOLUTION')
  const [concentration, setConcentration] = useState<number>(0)
  const [concentrationUnit, setConcentrationUnit] = useState<string>('×')

  // Common form fields
  const [name, setName] = useState("")
  const [baseBatchId, setBaseBatchId] = useState("")
  const [totalVolume, setTotalVolume] = useState(500)
  const [prepDate, setPrepDate] = prepDateState()
  const [expDate, setExpDate] = useState("")
  const [notes, setNotes] = useState("")

  // PERCENT mode components
  const [pctComponents, setPctComponents] = useState<PercentComponent[]>([])

  // ABSOLUTE mode components
  const [absComponents, setAbsComponents] = useState<AbsoluteComponent[]>([])

  // DILUTION mode
  const [sourceStockId, setSourceStockId] = useState("")
  const [targetConc, setTargetConc] = useState<number>(0)
  const [targetConcUnit, setTargetConcUnit] = useState<string>('×')
  const [diluentBatchId, setDiluentBatchId] = useState("")

  function prepDateState(): [string, (v: string) => void] {
    const [val, set] = useState(new Date().toISOString().split("T")[0])
    return [val, set]
  }

  // ==================== LOAD DATA ====================

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setBatchesLoading(true)
    try {
      const [batchData, stockData] = await Promise.all([
        getBatches({ status: "AVAILABLE" }),
        getAvailableStocks(),
      ])
      setBatches((batchData || []) as BatchOption[])
      setStocks((stockData || []) as StockOption[])
    } catch (err) {
      console.error("Error loading data:", err)
      toast.error("Ошибка загрузки данных")
    } finally {
      setBatchesLoading(false)
    }
  }

  // ==================== BATCH FILTERS ====================

  const mediaBatches = batches.filter(b => b.nomenclature?.category === "MEDIUM")
  const componentBatches = batches.filter(
    b => b.nomenclature?.category && b.nomenclature.category !== "MEDIUM" && b.nomenclature.category !== "CONSUMABLE"
  )

  function getFilteredComponents(catFilter: string) {
    return catFilter === 'all'
      ? componentBatches
      : componentBatches.filter(b => b.nomenclature?.category === catFilter)
  }

  // ==================== PERCENT CALCULATIONS ====================

  const totalPctPercent = pctComponents.reduce((s, c) => s + c.percent, 0)
  const basePctPercent = 100 - totalPctPercent
  const basePctVolume = (basePctPercent / 100) * totalVolume

  const pctWithVolume = pctComponents.map(c => ({
    ...c,
    volume_ml: (c.percent / 100) * totalVolume,
  }))

  // ==================== ABSOLUTE CALCULATIONS ====================

  const totalAbsComponentVolume = absComponents.reduce((s, c) => s + (c.volume_ml || 0), 0)
  const baseAbsVolume = totalVolume - totalAbsComponentVolume

  // ==================== DILUTION CALCULATIONS ====================

  const sourceStock = stocks.find(s => s.id === sourceStockId)
  const sourceConc = sourceStock?.concentration || 0
  // C1*V1 = C2*V2 → V1 = C2*V2/C1
  const dilutionV1 = sourceConc > 0 && targetConc > 0
    ? (targetConc * totalVolume) / sourceConc
    : 0
  const dilutionVDiluent = totalVolume - dilutionV1
  const dilutionValid = dilutionV1 > 0 && dilutionV1 <= totalVolume &&
    dilutionV1 <= (sourceStock?.current_volume_ml ?? sourceStock?.volume_ml ?? 0)

  // ==================== AUTO-NAME ====================

  const autoName = useMemo(() => {
    if (calcMode === 'DILUTION') {
      if (!sourceStock) return ""
      return `${sourceStock.name} ${targetConc}${targetConcUnit}`
    }

    const baseBatch = mediaBatches.find(b => b.id === baseBatchId)
    const baseName = baseBatch?.nomenclature?.name || ""
    if (!baseName) return ""

    const parts = [baseName]
    const comps = calcMode === 'PERCENT' ? pctComponents : absComponents
    for (const c of comps) {
      const cb = batches.find(b => b.id === c.batch_id)
      if (cb?.nomenclature?.name) {
        if (calcMode === 'PERCENT' && 'percent' in c && c.percent > 0) {
          parts.push(`${c.percent}% ${cb.nomenclature.name}`)
        } else if (calcMode === 'ABSOLUTE' && 'amount' in c && c.amount > 0) {
          parts.push(`${c.amount}${(c as AbsoluteComponent).amount_unit} ${cb.nomenclature.name}`)
        }
      }
    }
    return parts.join(" + ")
  }, [calcMode, baseBatchId, pctComponents, absComponents, sourceStockId, targetConc, targetConcUnit, mediaBatches, batches, stocks, sourceStock])

  // ==================== COMPONENT ACTIONS ====================

  function addPctComponent() {
    componentCounter++
    setPctComponents(prev => [...prev, { id: `pct-${componentCounter}`, batch_id: "", percent: 0, volume_ml: 0, categoryFilter: 'all' }])
  }
  function removePctComponent(id: string) {
    setPctComponents(prev => prev.filter(c => c.id !== id))
  }
  function updatePctComponent(id: string, field: keyof PercentComponent, value: string | number) {
    setPctComponents(prev => prev.map(c => {
      if (c.id !== id) return c
      const updated = { ...c, [field]: field === "percent" ? Number(value) : value }
      if (field === "categoryFilter") updated.batch_id = ""
      return updated
    }))
  }

  function addAbsComponent() {
    componentCounter++
    setAbsComponents(prev => [...prev, { id: `abs-${componentCounter}`, batch_id: "", amount: 0, amount_unit: 'мг', volume_ml: 0, categoryFilter: 'all' }])
  }
  function removeAbsComponent(id: string) {
    setAbsComponents(prev => prev.filter(c => c.id !== id))
  }
  function updateAbsComponent(id: string, field: keyof AbsoluteComponent, value: string | number) {
    setAbsComponents(prev => prev.map(c => {
      if (c.id !== id) return c
      const updated = { ...c, [field]: field === "amount" || field === "volume_ml" ? Number(value) : value }
      if (field === "categoryFilter") updated.batch_id = ""
      return updated
    }))
  }

  // ==================== SUBMIT ====================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (calcMode === 'PERCENT') {
        await submitPercent()
      } else if (calcMode === 'ABSOLUTE') {
        await submitAbsolute()
      } else {
        await submitDilution()
      }
      toast.success("Среда создана")
      router.push("/inventory")
    } catch (err: any) {
      console.error("Error:", err)
      toast.error(err.message || "Ошибка при создании среды")
    } finally {
      setLoading(false)
    }
  }

  async function submitPercent() {
    if (totalPctPercent > 100) throw new Error("Сумма компонентов превышает 100%")

    const baseBatch = mediaBatches.find(b => b.id === baseBatchId)
    const composition = {
      mode: 'PERCENT',
      base: {
        batch_id: baseBatchId,
        nomenclature: baseBatch?.nomenclature?.name,
        percent: basePctPercent,
        volume_ml: basePctVolume,
      },
      components: pctWithVolume
        .filter(c => c.batch_id && c.percent > 0)
        .map(c => {
          const cb = batches.find(b => b.id === c.batch_id)
          return { batch_id: c.batch_id, nomenclature: cb?.nomenclature?.name, percent: c.percent, volume_ml: c.volume_ml }
        }),
      total_volume_ml: totalVolume,
    }

    await createReadyMedium({
      name: name || autoName,
      batch_id: baseBatchId || null,
      nomenclature_id: baseBatch?.nomenclature?.id || null,
      volume_ml: totalVolume,
      current_volume_ml: totalVolume,
      physical_state: physicalState,
      concentration: physicalState === 'STOCK_SOLUTION' && concentration > 0 ? concentration : null,
      concentration_unit: physicalState === 'STOCK_SOLUTION' && concentration > 0 ? concentrationUnit : null,
      composition,
      prepared_at: prepDate || null,
      expiration_date: expDate || null,
      notes: notes || null,
      status: "ACTIVE",
    })
  }

  async function submitAbsolute() {
    if (baseAbsVolume < 0) throw new Error("Объём компонентов превышает общий объём")

    const baseBatch = mediaBatches.find(b => b.id === baseBatchId)
    const composition = {
      mode: 'ABSOLUTE',
      base: {
        batch_id: baseBatchId,
        nomenclature: baseBatch?.nomenclature?.name,
        volume_ml: baseAbsVolume,
      },
      components: absComponents
        .filter(c => c.batch_id && c.amount > 0)
        .map(c => {
          const cb = batches.find(b => b.id === c.batch_id)
          return {
            batch_id: c.batch_id,
            nomenclature: cb?.nomenclature?.name,
            amount: c.amount,
            amount_unit: c.amount_unit,
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
      physical_state: physicalState,
      concentration: physicalState === 'STOCK_SOLUTION' && concentration > 0 ? concentration : null,
      concentration_unit: physicalState === 'STOCK_SOLUTION' && concentration > 0 ? concentrationUnit : null,
      composition,
      prepared_at: prepDate || null,
      expiration_date: expDate || null,
      notes: notes || null,
      status: "ACTIVE",
    })
  }

  async function submitDilution() {
    if (!sourceStockId) throw new Error("Выберите стоковый раствор")
    if (!dilutionValid) throw new Error("Невалидные параметры разведения")

    const diluentBatch = mediaBatches.find(b => b.id === diluentBatchId)
    const composition = {
      mode: 'DILUTION',
      source: {
        ready_medium_id: sourceStockId,
        name: sourceStock?.name,
        concentration: sourceConc,
        concentration_unit: sourceStock?.concentration_unit || '×',
        volume_ml: Math.round(dilutionV1 * 100) / 100,
      },
      diluent: {
        batch_id: diluentBatchId,
        nomenclature: diluentBatch?.nomenclature?.name,
        volume_ml: Math.round(dilutionVDiluent * 100) / 100,
      },
      target_concentration: targetConc,
      target_concentration_unit: targetConcUnit,
      total_volume_ml: totalVolume,
    }

    // 1. Списать V1 из стока
    await writeOffReadyMediumVolume(sourceStockId, dilutionV1)

    // 2. Списать разбавитель из batch (если есть)
    if (diluentBatchId && dilutionVDiluent > 0) {
      // Создаём фиктивную операцию для трекинга
      await writeOffBatchVolume(diluentBatchId, dilutionVDiluent, '', 'Разбавитель для разведения стока')
    }

    // 3. Создать рабочий раствор
    await createReadyMedium({
      name: name || autoName,
      volume_ml: totalVolume,
      current_volume_ml: totalVolume,
      physical_state: 'WORKING_SOLUTION',
      concentration: targetConc,
      concentration_unit: targetConcUnit,
      parent_medium_id: sourceStockId,
      composition,
      prepared_at: prepDate || null,
      expiration_date: expDate || null,
      notes: notes || null,
      status: "ACTIVE",
    })
  }

  // ==================== VALIDATION ====================

  const canSubmit = (() => {
    if (loading) return false
    if (calcMode === 'PERCENT') return !!baseBatchId && totalPctPercent <= 100
    if (calcMode === 'ABSOLUTE') return !!baseBatchId && baseAbsVolume >= 0
    if (calcMode === 'DILUTION') return !!sourceStockId && dilutionValid
    return false
  })()

  // ==================== RENDER ====================

  return (
    <div className="container mx-auto py-6 max-w-3xl space-y-6">
      {/* Back link */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inventory"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Приготовление среды</h1>
          <p className="text-muted-foreground">
            Рассчитайте состав и зарегистрируйте новую среду
          </p>
        </div>
      </div>

      {/* Mode selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Label className="text-base font-medium">Режим калькулятора</Label>
            <Tabs value={calcMode} onValueChange={v => setCalcMode(v as CalculatorMode)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="PERCENT" className="gap-1.5">
                  <span className="text-lg">%</span> Процент
                </TabsTrigger>
                <TabsTrigger value="ABSOLUTE" className="gap-1.5">
                  <span className="text-sm font-bold">mg</span> Абсолют
                </TabsTrigger>
                <TabsTrigger value="DILUTION" className="gap-1.5">
                  C<sub>1</sub>V<sub>1</sub> Разведение
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Physical state (for PERCENT and ABSOLUTE only) */}
            {calcMode !== 'DILUTION' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип раствора</Label>
                  <Select value={physicalState} onValueChange={v => setPhysicalState(v as PhysicalState)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(PHYSICAL_STATE_LABELS) as [PhysicalState, string][]).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {physicalState === 'STOCK_SOLUTION' && (
                  <div className="space-y-2">
                    <Label>Концентрация стока</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={concentration || ''}
                        onChange={e => setConcentration(parseFloat(e.target.value) || 0)}
                        placeholder="10"
                        className="flex-1"
                      />
                      <Select value={concentrationUnit} onValueChange={setConcentrationUnit}>
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CONCENTRATION_UNITS.map(u => (
                            <SelectItem key={u} value={u}>{u}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ==================== PERCENT MODE ==================== */}
        {calcMode === 'PERCENT' && (
          <>
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
                        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка...
                      </div>
                    ) : (
                      <Select value={baseBatchId} onValueChange={setBaseBatchId}>
                        <SelectTrigger><SelectValue placeholder="Выберите партию среды..." /></SelectTrigger>
                        <SelectContent>
                          {mediaBatches.length === 0 ? (
                            <SelectItem value="__empty" disabled>Нет доступных партий сред</SelectItem>
                          ) : mediaBatches.map(batch => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {batch.nomenclature?.name} — {batch.batch_number} ({formatBatchStock(batch)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Общий объём (мл) *</Label>
                    <Input type="number" min={1} step={1} value={totalVolume} onChange={e => setTotalVolume(parseFloat(e.target.value) || 0)} required />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Компоненты % */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Компоненты / Добавки</span>
                  <Button type="button" variant="outline" size="sm" onClick={addPctComponent}>
                    <Plus className="mr-1 h-4 w-4" /> Добавить
                  </Button>
                </CardTitle>
                <CardDescription>FBS, пенициллин-стрептомицин, L-глутамин, HEPES и другие добавки</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {pctComponents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Нажмите «Добавить» для добавления компонентов</p>
                ) : pctComponents.map((comp, idx) => {
                  const filtered = getFilteredComponents(comp.categoryFilter)
                  return (
                    <div key={comp.id} className="border-b pb-3 space-y-2">
                      <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-muted-foreground">Компонент {idx + 1}</Label>
                          <div className="flex gap-2">
                            <Select value={comp.categoryFilter} onValueChange={v => updatePctComponent(comp.id, "categoryFilter", v)}>
                              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Категория" /></SelectTrigger>
                              <SelectContent>
                                {COMPONENT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Select value={comp.batch_id} onValueChange={v => updatePctComponent(comp.id, "batch_id", v)}>
                              <SelectTrigger className="flex-1"><SelectValue placeholder="Выберите компонент..." /></SelectTrigger>
                              <SelectContent>
                                {filtered.map(batch => (
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
                          <Input type="number" min={0} max={100} step={0.5} value={comp.percent || ""} onChange={e => updatePctComponent(comp.id, "percent", e.target.value)} placeholder="10" />
                        </div>
                        <div className="w-24 text-right">
                          <p className="text-sm font-medium">{((comp.percent / 100) * totalVolume).toFixed(1)} мл</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removePctComponent(comp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}

                {/* Summary */}
                <div className="mt-4 p-3 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">Расчёт объёмов</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Базовая среда ({basePctPercent.toFixed(1)}%)</span>
                    <span className="font-medium">{basePctVolume.toFixed(1)} мл</span>
                  </div>
                  {pctWithVolume.filter(c => c.batch_id && c.percent > 0).map(c => {
                    const cb = batches.find(b => b.id === c.batch_id)
                    return (
                      <div key={c.id} className="flex justify-between text-sm">
                        <span>{cb?.nomenclature?.name || "?"} ({c.percent}%)</span>
                        <span className="font-medium">{c.volume_ml.toFixed(1)} мл</span>
                      </div>
                    )
                  })}
                  <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
                    <span>ИТОГО</span>
                    <span>{totalVolume.toFixed(1)} мл</span>
                  </div>
                  {totalPctPercent > 100 && (
                    <p className="text-destructive text-xs mt-1">Сумма компонентов превышает 100%!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ==================== ABSOLUTE MODE ==================== */}
        {calcMode === 'ABSOLUTE' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Базовая среда (растворитель)</CardTitle>
                <CardDescription>Выберите среду-основу и задайте общий объём</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Партия базовой среды *</Label>
                    {batchesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка...
                      </div>
                    ) : (
                      <Select value={baseBatchId} onValueChange={setBaseBatchId}>
                        <SelectTrigger><SelectValue placeholder="Выберите среду..." /></SelectTrigger>
                        <SelectContent>
                          {mediaBatches.length === 0 ? (
                            <SelectItem value="__empty" disabled>Нет доступных партий</SelectItem>
                          ) : mediaBatches.map(batch => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {batch.nomenclature?.name} — {batch.batch_number} ({formatBatchStock(batch)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Общий объём (мл) *</Label>
                    <Input type="number" min={1} step={1} value={totalVolume} onChange={e => setTotalVolume(parseFloat(e.target.value) || 0)} required />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Absolute components */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Компоненты (абсолютные количества)</span>
                  <Button type="button" variant="outline" size="sm" onClick={addAbsComponent}>
                    <Plus className="mr-1 h-4 w-4" /> Добавить
                  </Button>
                </CardTitle>
                <CardDescription>Укажите точное количество каждого компонента (мг, мкг, мл, ЕД)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {absComponents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Нажмите «Добавить» для добавления компонентов</p>
                ) : absComponents.map((comp, idx) => {
                  const filtered = getFilteredComponents(comp.categoryFilter)
                  return (
                    <div key={comp.id} className="border-b pb-3 space-y-2">
                      <div className="flex items-end gap-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-muted-foreground">Компонент {idx + 1}</Label>
                          <div className="flex gap-2">
                            <Select value={comp.categoryFilter} onValueChange={v => updateAbsComponent(comp.id, "categoryFilter", v)}>
                              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Категория" /></SelectTrigger>
                              <SelectContent>
                                {COMPONENT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Select value={comp.batch_id} onValueChange={v => updateAbsComponent(comp.id, "batch_id", v)}>
                              <SelectTrigger className="flex-1"><SelectValue placeholder="Выберите компонент..." /></SelectTrigger>
                              <SelectContent>
                                {filtered.map(batch => (
                                  <SelectItem key={batch.id} value={batch.id}>
                                    {batch.nomenclature?.name} — {batch.batch_number} ({formatBatchStock(batch)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs text-muted-foreground">Кол-во</Label>
                          <Input type="number" min={0} step="any" value={comp.amount || ""} onChange={e => updateAbsComponent(comp.id, "amount", e.target.value)} placeholder="5" />
                        </div>
                        <div className="w-20 space-y-1">
                          <Label className="text-xs text-muted-foreground">Ед.</Label>
                          <Select value={comp.amount_unit} onValueChange={v => updateAbsComponent(comp.id, "amount_unit", v)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {AMOUNT_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-24 space-y-1">
                          <Label className="text-xs text-muted-foreground">Объём (мл)</Label>
                          <Input type="number" min={0} step="any" value={comp.volume_ml || ""} onChange={e => updateAbsComponent(comp.id, "volume_ml", e.target.value)} placeholder="0.5" />
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeAbsComponent(comp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}

                {/* Summary */}
                <div className="mt-4 p-3 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">Расчёт объёмов</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Базовая среда (растворитель)</span>
                    <span className="font-medium">{baseAbsVolume.toFixed(1)} мл</span>
                  </div>
                  {absComponents.filter(c => c.batch_id && c.amount > 0).map(c => {
                    const cb = batches.find(b => b.id === c.batch_id)
                    return (
                      <div key={c.id} className="flex justify-between text-sm">
                        <span>{cb?.nomenclature?.name || "?"} ({c.amount} {c.amount_unit})</span>
                        <span className="font-medium">{(c.volume_ml || 0).toFixed(1)} мл</span>
                      </div>
                    )
                  })}
                  <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
                    <span>ИТОГО</span>
                    <span>{totalVolume.toFixed(1)} мл</span>
                  </div>
                  {baseAbsVolume < 0 && (
                    <p className="text-destructive text-xs mt-1">Объём компонентов превышает общий объём!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ==================== DILUTION MODE ==================== */}
        {calcMode === 'DILUTION' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Разведение стока (C₁V₁ = C₂V₂)
              </CardTitle>
              <CardDescription>Выберите стоковый раствор и задайте целевую концентрацию</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Source stock */}
              <div className="space-y-2">
                <Label>Стоковый раствор (C₁) *</Label>
                {batchesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Загрузка...
                  </div>
                ) : (
                  <Select value={sourceStockId} onValueChange={setSourceStockId}>
                    <SelectTrigger><SelectValue placeholder="Выберите сток..." /></SelectTrigger>
                    <SelectContent>
                      {stocks.length === 0 ? (
                        <SelectItem value="__empty" disabled>Нет доступных стоков. Приготовьте сток в режиме «Процент» или «Абсолют»</SelectItem>
                      ) : stocks.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.code} — {s.name} ({s.concentration}{s.concentration_unit || '×'}, {s.current_volume_ml ?? s.volume_ml} мл)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {sourceStock && (
                  <p className="text-xs text-muted-foreground">
                    C₁ = {sourceConc}{sourceStock.concentration_unit || '×'}, остаток: {sourceStock.current_volume_ml ?? sourceStock.volume_ml} мл
                  </p>
                )}
              </div>

              {/* Target concentration */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Целевая концентрация (C₂) *</Label>
                  <div className="flex gap-2">
                    <Input type="number" min={0} step="any" value={targetConc || ''} onChange={e => setTargetConc(parseFloat(e.target.value) || 0)} placeholder="1" className="flex-1" />
                    <Select value={targetConcUnit} onValueChange={setTargetConcUnit}>
                      <SelectTrigger className="w-[80px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONCENTRATION_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Целевой объём V₂ (мл) *</Label>
                  <Input type="number" min={1} step={1} value={totalVolume} onChange={e => setTotalVolume(parseFloat(e.target.value) || 0)} required />
                </div>
                <div className="space-y-2">
                  <Label>Разбавитель</Label>
                  <Select value={diluentBatchId} onValueChange={setDiluentBatchId}>
                    <SelectTrigger><SelectValue placeholder="Вода / PBS..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Без списания</SelectItem>
                      {mediaBatches.map(batch => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.nomenclature?.name} — {batch.batch_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dilution calculation */}
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-sm">Формула: C₁ × V₁ = C₂ × V₂</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">V₁ (стока):</span>
                    <span className="ml-2 font-bold text-lg">{dilutionV1 > 0 ? dilutionV1.toFixed(2) : '—'} мл</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">V разбавителя:</span>
                    <span className="ml-2 font-bold text-lg">{dilutionVDiluent > 0 ? dilutionVDiluent.toFixed(2) : '—'} мл</span>
                  </div>
                </div>
                {sourceStockId && dilutionV1 > 0 && (
                  <p className={`text-xs mt-1 ${dilutionValid ? 'text-green-600' : 'text-destructive'}`}>
                    {dilutionValid
                      ? `Достаточно стока (нужно ${dilutionV1.toFixed(1)} мл из ${sourceStock?.current_volume_ml ?? sourceStock?.volume_ml} мл)`
                      : dilutionV1 > (sourceStock?.current_volume_ml ?? sourceStock?.volume_ml ?? 0)
                        ? `Недостаточно стока! Нужно ${dilutionV1.toFixed(1)} мл, есть ${sourceStock?.current_volume_ml ?? sourceStock?.volume_ml} мл`
                        : 'Невалидные параметры разведения'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ==================== REGISTRATION (all modes) ==================== */}
        <Card>
          <CardHeader>
            <CardTitle>Регистрация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Название</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={autoName || "DMEM + 10% FBS + 1% P/S"} />
              {autoName && !name && (
                <p className="text-xs text-muted-foreground">
                  Авто: <Badge variant="outline" className="text-xs">{autoName}</Badge>
                </p>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Дата приготовления *</Label>
                <Input type="date" value={prepDate} onChange={e => setPrepDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Срок годности *</Label>
                <Input type="date" value={expDate} onChange={e => setExpDate(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Примечания</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Дополнительная информация..." rows={2} />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={!canSubmit}>
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Создание...</>
            ) : (
              calcMode === 'DILUTION' ? "Развести и создать" : "Создать среду"
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
