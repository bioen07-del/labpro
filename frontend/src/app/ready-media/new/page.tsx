"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Plus, Trash2, Calculator, Beaker, FlaskConical, Info } from "lucide-react"
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

/** Режим ввода количества для отдельного компонента */
type ComponentMode = 'PERCENT' | 'VOLUME' | 'MASS' | 'ACTIVITY'

/** Режим формы: приготовление рецепта или разведение стока */
type FormMode = 'RECIPE' | 'DILUTION'

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

interface RecipeComponent {
  id: string
  batch_id: string
  categoryFilter: string
  mode: ComponentMode
  // PERCENT
  percent: number
  // VOLUME (мкл / мл / л)
  volume: number
  volumeUnit: string
  // MASS (мкг / мг / г)
  mass: number
  massUnit: string
  // ACTIVITY (ЕД / МЕ)
  activity: number
  activityUnit: string
}

// ==================== HELPERS ====================

function formatBatchStock(b: BatchOption): string {
  if (b.volume_per_unit && b.volume_per_unit > 0 && b.nomenclature?.category !== 'CONSUMABLE') {
    return `${b.quantity} фл, тек: ${b.current_unit_volume ?? b.volume_per_unit}/${b.volume_per_unit} мл`
  }
  return `${b.quantity} ${b.unit}`
}

const ALL_CATEGORIES = [
  { value: 'all', label: 'Все' },
  { value: 'MEDIUM', label: 'Среды' },
  { value: 'SERUM', label: 'Сыворотки' },
  { value: 'SUPPLEMENT', label: 'Добавки' },
  { value: 'BUFFER', label: 'Буферы' },
  { value: 'ENZYME', label: 'Ферменты' },
  { value: 'REAGENT', label: 'Реагенты' },
]

const COMPONENT_MODE_LABELS: Record<ComponentMode, string> = {
  PERCENT: '%',
  VOLUME: 'мл',
  MASS: 'мг',
  ACTIVITY: 'ЕД',
}

const VOLUME_UNITS = ['мкл', 'мл', 'л']
const MASS_UNITS = ['мкг', 'мг', 'г']
const ACTIVITY_UNITS = ['ЕД', 'МЕ']

/** Получить объём компонента в мл */
function getComponentVolumeMl(comp: RecipeComponent, totalVolume: number): number {
  switch (comp.mode) {
    case 'PERCENT':
      return (comp.percent / 100) * totalVolume
    case 'VOLUME': {
      const factors: Record<string, number> = { 'мкл': 0.001, 'мл': 1, 'л': 1000 }
      return comp.volume * (factors[comp.volumeUnit] || 1)
    }
    case 'MASS':
      // Масса не конвертируется в объём напрямую — пользователь вводит объём вручную если нужно
      return 0
    case 'ACTIVITY':
      return 0
    default:
      return 0
  }
}

/** Получить label количества для сводки */
function getComponentAmountLabel(comp: RecipeComponent): string {
  switch (comp.mode) {
    case 'PERCENT': return `${comp.percent}%`
    case 'VOLUME': return `${comp.volume} ${comp.volumeUnit}`
    case 'MASS': return `${comp.mass} ${comp.massUnit}`
    case 'ACTIVITY': return `${comp.activity} ${comp.activityUnit}`
    default: return ''
  }
}

function makeComponent(counterRef: React.MutableRefObject<number>): RecipeComponent {
  counterRef.current++
  return {
    id: `comp-${counterRef.current}`,
    batch_id: '',
    categoryFilter: 'all',
    mode: 'PERCENT',
    percent: 0,
    volume: 0,
    volumeUnit: 'мл',
    mass: 0,
    massUnit: 'мг',
    activity: 0,
    activityUnit: 'ЕД',
  }
}

// ==================== MAIN COMPONENT ====================

export default function NewReadyMediumPage() {
  const router = useRouter()
  const componentCounterRef = useRef(0)
  const [loading, setLoading] = useState(false)
  const [batches, setBatches] = useState<BatchOption[]>([])
  const [stocks, setStocks] = useState<StockOption[]>([])
  const [batchesLoading, setBatchesLoading] = useState(true)

  // Form mode: RECIPE (приготовление) or DILUTION (разведение стока)
  const [formMode, setFormMode] = useState<FormMode>('RECIPE')

  // Physical state & concentration
  const [physicalState, setPhysicalState] = useState<PhysicalState>('WORKING_SOLUTION')
  const [concentration, setConcentration] = useState<number>(0)
  const [concentrationUnit, setConcentrationUnit] = useState<string>('×')

  // Common fields
  const [name, setName] = useState("")
  const [totalVolume, setTotalVolume] = useState(500)
  const [prepDate, setPrepDate] = useState(new Date().toISOString().split("T")[0])
  const [expDate, setExpDate] = useState("")
  const [notes, setNotes] = useState("")

  // RECIPE mode: растворитель (опционально) + компоненты
  const [solventBatchId, setSolventBatchId] = useState("")
  const [solventCategoryFilter, setSolventCategoryFilter] = useState("all")
  const [components, setComponents] = useState<RecipeComponent[]>([])

  // DILUTION mode
  const [sourceStockId, setSourceStockId] = useState("")
  const [targetConc, setTargetConc] = useState<number>(0)
  const [targetConcUnit, setTargetConcUnit] = useState<string>('×')
  const [diluentBatchId, setDiluentBatchId] = useState("")
  const [diluentCategoryFilter, setDiluentCategoryFilter] = useState("all")

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

  /** Все партии (кроме расходников), фильтрованные по категории */
  function getFilteredBatches(catFilter: string) {
    const nonConsumable = batches.filter(b => b.nomenclature?.category && b.nomenclature.category !== 'CONSUMABLE')
    return catFilter === 'all'
      ? nonConsumable
      : nonConsumable.filter(b => b.nomenclature?.category === catFilter)
  }

  // ==================== RECIPE CALCULATIONS ====================

  // Суммарный объём компонентов, выраженных в % или мл
  const totalComponentsVolume = components.reduce((s, c) => s + getComponentVolumeMl(c, totalVolume), 0)
  const totalComponentsPercent = components.reduce((s, c) => c.mode === 'PERCENT' ? s + c.percent : s, 0)
  const solventVolume = totalVolume - totalComponentsVolume
  const solventPercent = totalVolume > 0 ? (solventVolume / totalVolume) * 100 : 0

  // ==================== DILUTION CALCULATIONS ====================

  const sourceStock = stocks.find(s => s.id === sourceStockId)
  const sourceConc = sourceStock?.concentration || 0
  const dilutionV1 = sourceConc > 0 && targetConc > 0
    ? (targetConc * totalVolume) / sourceConc
    : 0
  const dilutionVDiluent = totalVolume - dilutionV1
  const dilutionValid = dilutionV1 > 0 && dilutionV1 <= totalVolume &&
    dilutionV1 <= (sourceStock?.current_volume_ml ?? sourceStock?.volume_ml ?? 0)

  // ==================== AUTO-NAME ====================

  const autoName = useMemo(() => {
    if (formMode === 'DILUTION') {
      if (!sourceStock) return ""
      return `${sourceStock.name} ${targetConc}${targetConcUnit}`
    }

    const parts: string[] = []

    // Растворитель
    const solventBatch = batches.find(b => b.id === solventBatchId)
    if (solventBatch?.nomenclature?.name) {
      parts.push(solventBatch.nomenclature.name)
    }

    // Компоненты
    for (const c of components) {
      const cb = batches.find(b => b.id === c.batch_id)
      if (cb?.nomenclature?.name) {
        const label = getComponentAmountLabel(c)
        if (label && label !== '0%' && label !== '0 мл' && label !== '0 мг' && label !== '0 ЕД') {
          parts.push(`${label} ${cb.nomenclature.name}`)
        }
      }
    }
    return parts.join(" + ")
  }, [formMode, solventBatchId, components, sourceStockId, targetConc, targetConcUnit, batches, stocks, sourceStock])

  // ==================== COMPONENT ACTIONS ====================

  function addComponent() {
    setComponents(prev => [...prev, makeComponent(componentCounterRef)])
  }

  function removeComponent(id: string) {
    setComponents(prev => prev.filter(c => c.id !== id))
  }

  function updateComponent(id: string, updates: Partial<RecipeComponent>) {
    setComponents(prev => prev.map(c => {
      if (c.id !== id) return c
      const updated = { ...c, ...updates }
      // Сброс batch_id при смене категории
      if ('categoryFilter' in updates) updated.batch_id = ''
      return updated
    }))
  }

  // ==================== SUBMIT ====================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (formMode === 'RECIPE') {
        await submitRecipe()
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

  async function submitRecipe() {
    if (solventVolume < -0.01) throw new Error("Объём компонентов превышает общий объём")
    if (totalComponentsPercent > 100) throw new Error("Сумма процентных компонентов превышает 100%")

    const hasSolvent = solventBatchId && solventBatchId !== '__none__'
    const solventBatch = hasSolvent ? batches.find(b => b.id === solventBatchId) : null

    const composition = {
      mode: 'RECIPE',
      solvent: hasSolvent ? {
        batch_id: solventBatchId,
        nomenclature: solventBatch?.nomenclature?.name,
        volume_ml: Math.round(solventVolume * 100) / 100,
      } : null,
      components: components
        .filter(c => c.batch_id)
        .map(c => {
          const cb = batches.find(b => b.id === c.batch_id)
          return {
            batch_id: c.batch_id,
            nomenclature: cb?.nomenclature?.name,
            mode: c.mode,
            ...(c.mode === 'PERCENT' && { percent: c.percent }),
            ...(c.mode === 'VOLUME' && { volume: c.volume, volume_unit: c.volumeUnit }),
            ...(c.mode === 'MASS' && { mass: c.mass, mass_unit: c.massUnit }),
            ...(c.mode === 'ACTIVITY' && { activity: c.activity, activity_unit: c.activityUnit }),
            volume_ml: getComponentVolumeMl(c, totalVolume),
          }
        }),
      total_volume_ml: totalVolume,
    }

    await createReadyMedium({
      name: name || autoName,
      batch_id: hasSolvent ? solventBatchId : null,
      nomenclature_id: solventBatch?.nomenclature?.id || null,
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

    const hasDiluent = diluentBatchId && diluentBatchId !== '__none__'
    const diluentBatch = hasDiluent ? batches.find(b => b.id === diluentBatchId) : null
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
        batch_id: hasDiluent ? diluentBatchId : null,
        nomenclature: diluentBatch?.nomenclature?.name || null,
        volume_ml: Math.round(dilutionVDiluent * 100) / 100,
      },
      target_concentration: targetConc,
      target_concentration_unit: targetConcUnit,
      total_volume_ml: totalVolume,
    }

    // 1. Списать V1 из стока
    await writeOffReadyMediumVolume(sourceStockId, dilutionV1)

    // 2. Списать разбавитель из batch (если есть)
    if (hasDiluent && dilutionVDiluent > 0) {
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
    if (formMode === 'RECIPE') {
      // Нужен хотя бы растворитель ИЛИ хотя бы один компонент
      const hasSolvent = !!solventBatchId && solventBatchId !== '__none__'
      const hasContent = hasSolvent || components.some(c => c.batch_id)
      return hasContent && solventVolume >= -0.01 && totalComponentsPercent <= 100
    }
    if (formMode === 'DILUTION') return !!sourceStockId && dilutionValid
    return false
  })()

  // ==================== RENDER ====================

  return (
    <div className="container mx-auto py-6 max-w-3xl space-y-6">
      {/* Header */}
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

      {/* Mode selector: Recipe vs Dilution */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Label className="text-base font-medium">Режим</Label>
            <Tabs value={formMode} onValueChange={v => setFormMode(v as FormMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="RECIPE" className="gap-1.5">
                  <Beaker className="h-4 w-4" /> Приготовление
                </TabsTrigger>
                <TabsTrigger value="DILUTION" className="gap-1.5">
                  <FlaskConical className="h-4 w-4" /> Разведение стока
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Physical state (RECIPE only) */}
            {formMode === 'RECIPE' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Тип раствора</Label>
                  <Select value={physicalState} onValueChange={v => setPhysicalState(v as PhysicalState)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(PHYSICAL_STATE_LABELS) as [PhysicalState, string][])
                        .filter(([k]) => k !== 'AS_RECEIVED')
                        .map(([k, label]) => (
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

        {/* ==================== RECIPE MODE ==================== */}
        {formMode === 'RECIPE' && (
          <>
            {/* Растворитель / базовая среда */}
            <Card>
              <CardHeader>
                <CardTitle>Растворитель / Базовая среда</CardTitle>
                <CardDescription>
                  {physicalState === 'STOCK_SOLUTION'
                    ? 'Вода, DMSO, PBS или другой растворитель для стока. Можно не указывать, если растворитель не со склада.'
                    : 'Базовая среда (DMEM, RPMI, MEM...). Составит остаток объёма после добавок.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Категория</Label>
                    <Select value={solventCategoryFilter} onValueChange={v => { setSolventCategoryFilter(v); setSolventBatchId('') }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Партия {physicalState === 'STOCK_SOLUTION' ? '(опционально)' : ''}</Label>
                    {batchesLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка...
                      </div>
                    ) : (
                      <Select value={solventBatchId} onValueChange={setSolventBatchId}>
                        <SelectTrigger>
                          <SelectValue placeholder={physicalState === 'STOCK_SOLUTION' ? 'Без растворителя со склада' : 'Выберите среду...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {physicalState === 'STOCK_SOLUTION' && (
                            <SelectItem value="__none__">Без растворителя со склада</SelectItem>
                          )}
                          {getFilteredBatches(solventCategoryFilter).map(batch => (
                            <SelectItem key={batch.id} value={batch.id}>
                              {batch.nomenclature?.name} — {batch.batch_number} ({formatBatchStock(batch)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Общий объём (мл) *</Label>
                    <Input type="number" min={0.1} step="any" value={totalVolume} onChange={e => setTotalVolume(parseFloat(e.target.value) || 0)} required />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Компоненты — per-component mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Компоненты</span>
                  <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                    <Plus className="mr-1 h-4 w-4" /> Добавить
                  </Button>
                </CardTitle>
                <CardDescription>
                  Каждый компонент — свой режим ввода: %, объём (мл), масса (мг) или активность (ЕД)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {components.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Нажмите «Добавить» для добавления компонентов (FBS, P/S, L-глутамин и др.)
                  </p>
                ) : components.map((comp, idx) => {
                  const filtered = getFilteredBatches(comp.categoryFilter)
                  return (
                    <div key={comp.id} className="border rounded-lg p-3 space-y-3">
                      {/* Row 1: Category + Batch */}
                      <div className="flex items-end gap-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs text-muted-foreground">Компонент {idx + 1}</Label>
                          <div className="flex gap-2">
                            <Select value={comp.categoryFilter} onValueChange={v => updateComponent(comp.id, { categoryFilter: v })}>
                              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Категория" /></SelectTrigger>
                              <SelectContent>
                                {ALL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Select value={comp.batch_id} onValueChange={v => updateComponent(comp.id, { batch_id: v })}>
                              <SelectTrigger className="flex-1"><SelectValue placeholder="Выберите..." /></SelectTrigger>
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
                        <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeComponent(comp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Row 2: Mode + Value */}
                      <div className="flex items-end gap-2">
                        {/* Mode selector */}
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Режим</Label>
                          <Select value={comp.mode} onValueChange={v => updateComponent(comp.id, { mode: v as ComponentMode })}>
                            <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PERCENT">%</SelectItem>
                              <SelectItem value="VOLUME">Объём</SelectItem>
                              <SelectItem value="MASS">Масса</SelectItem>
                              <SelectItem value="ACTIVITY">Акт.</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Value input — depends on mode */}
                        {comp.mode === 'PERCENT' && (
                          <div className="flex items-end gap-2 flex-1">
                            <div className="w-24 space-y-1">
                              <Label className="text-xs text-muted-foreground">%</Label>
                              <Input type="number" min={0} max={100} step={0.1} value={comp.percent || ''} onChange={e => updateComponent(comp.id, { percent: parseFloat(e.target.value) || 0 })} placeholder="10" />
                            </div>
                            <p className="text-sm text-muted-foreground pb-2">= {getComponentVolumeMl(comp, totalVolume).toFixed(1)} мл</p>
                          </div>
                        )}

                        {comp.mode === 'VOLUME' && (
                          <div className="flex items-end gap-2 flex-1">
                            <div className="w-24 space-y-1">
                              <Label className="text-xs text-muted-foreground">Объём</Label>
                              <Input type="number" min={0} step="any" value={comp.volume || ''} onChange={e => updateComponent(comp.id, { volume: parseFloat(e.target.value) || 0 })} placeholder="50" />
                            </div>
                            <div className="w-20 space-y-1">
                              <Label className="text-xs text-muted-foreground">Ед.</Label>
                              <Select value={comp.volumeUnit} onValueChange={v => updateComponent(comp.id, { volumeUnit: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {VOLUME_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {comp.mode === 'MASS' && (
                          <div className="flex items-end gap-2 flex-1">
                            <div className="w-24 space-y-1">
                              <Label className="text-xs text-muted-foreground">Масса</Label>
                              <Input type="number" min={0} step="any" value={comp.mass || ''} onChange={e => updateComponent(comp.id, { mass: parseFloat(e.target.value) || 0 })} placeholder="5" />
                            </div>
                            <div className="w-20 space-y-1">
                              <Label className="text-xs text-muted-foreground">Ед.</Label>
                              <Select value={comp.massUnit} onValueChange={v => updateComponent(comp.id, { massUnit: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {MASS_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}

                        {comp.mode === 'ACTIVITY' && (
                          <div className="flex items-end gap-2 flex-1">
                            <div className="w-24 space-y-1">
                              <Label className="text-xs text-muted-foreground">Кол-во</Label>
                              <Input type="number" min={0} step="any" value={comp.activity || ''} onChange={e => updateComponent(comp.id, { activity: parseFloat(e.target.value) || 0 })} placeholder="100" />
                            </div>
                            <div className="w-20 space-y-1">
                              <Label className="text-xs text-muted-foreground">Ед.</Label>
                              <Select value={comp.activityUnit} onValueChange={v => updateComponent(comp.id, { activityUnit: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {ACTIVITY_UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
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

                  {/* Растворитель */}
                  {(solventBatchId && solventBatchId !== '__none__') && (() => {
                    const sb = batches.find(b => b.id === solventBatchId)
                    return (
                      <div className="flex justify-between text-sm">
                        <span>{sb?.nomenclature?.name || 'Растворитель'} ({solventPercent.toFixed(1)}%)</span>
                        <span className="font-medium">{solventVolume.toFixed(1)} мл</span>
                      </div>
                    )
                  })()}

                  {!solventBatchId && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Растворитель (не выбран)</span>
                      <span>{solventVolume.toFixed(1)} мл</span>
                    </div>
                  )}

                  {/* Компоненты */}
                  {components.filter(c => c.batch_id).map(c => {
                    const cb = batches.find(b => b.id === c.batch_id)
                    const volMl = getComponentVolumeMl(c, totalVolume)
                    return (
                      <div key={c.id} className="flex justify-between text-sm">
                        <span>
                          {cb?.nomenclature?.name || '?'} ({getComponentAmountLabel(c)})
                        </span>
                        <span className="font-medium">
                          {volMl > 0 ? `${volMl.toFixed(1)} мл` : getComponentAmountLabel(c)}
                        </span>
                      </div>
                    )
                  })}

                  <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
                    <span>ИТОГО</span>
                    <span>{totalVolume.toFixed(1)} мл</span>
                  </div>

                  {solventVolume < -0.01 && (
                    <p className="text-destructive text-xs mt-1">Объём компонентов превышает общий объём!</p>
                  )}
                  {totalComponentsPercent > 100 && (
                    <p className="text-destructive text-xs mt-1">Сумма процентных компонентов превышает 100%!</p>
                  )}

                  {components.some(c => c.mode === 'MASS' || c.mode === 'ACTIVITY') && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      Компоненты в мг/ЕД не вычитаются из объёма растворителя (навеска/суспензия)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ==================== DILUTION MODE ==================== */}
        {formMode === 'DILUTION' && (
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
                        <SelectItem value="__empty" disabled>Нет доступных стоков. Приготовьте сток в режиме «Приготовление»</SelectItem>
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

              {/* Target concentration + volume + diluent */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
                  <Input type="number" min={0.1} step="any" value={totalVolume} onChange={e => setTotalVolume(parseFloat(e.target.value) || 0)} required />
                </div>
                <div className="space-y-2">
                  <Label>Разбавитель</Label>
                  <Select value={diluentCategoryFilter} onValueChange={v => { setDiluentCategoryFilter(v); setDiluentBatchId('') }}>
                    <SelectTrigger className="mb-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={diluentBatchId} onValueChange={setDiluentBatchId}>
                    <SelectTrigger><SelectValue placeholder="Вода / PBS..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Без списания</SelectItem>
                      {getFilteredBatches(diluentCategoryFilter).map(batch => (
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
              formMode === 'DILUTION' ? "Развести и создать" : "Создать среду"
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
