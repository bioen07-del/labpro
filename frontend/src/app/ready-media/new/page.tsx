"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Plus, Trash2, Calculator, Beaker, FlaskConical, FlaskRound, Pipette, Info } from "lucide-react"
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
  createReadyMedium, getBatches, getAvailableStocks, getAvailableReadyMedia,
  writeOffBatchVolume, writeOffReadyMediumVolume,
} from "@/lib/api"
import { CONCENTRATION_UNITS, calcVolumeForMolarConc, calcMolarConc, toMoles, calcTotalActivity, calcVolumeForActivityConc, calcActivityConc, calcMassForMolarConc, calcMassForActivityConc } from "@/lib/units"

// ==================== TYPES ====================

/** Режим ввода количества для отдельного компонента */
type ComponentMode = 'PERCENT' | 'VOLUME' | 'MASS' | 'ACTIVITY'

/** 4 режима формы */
type FormMode = 'RECIPE' | 'STOCK' | 'DILUTION' | 'ALIQUOT'

interface BatchOption {
  id: string
  batch_number: string
  quantity: number
  unit: string
  volume_per_unit?: number | null
  current_unit_volume?: number | null
  nomenclature?: { id: string; name: string; category: string; unit?: string; molecular_weight?: number | null; specific_activity?: number | null } | null
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

interface ReadyMediaOption {
  id: string
  code: string
  name: string
  current_volume_ml?: number
  volume_ml: number
  physical_state?: string
  concentration?: number
  concentration_unit?: string
}

interface RecipeComponent {
  id: string
  /** batch:UUID или rm:UUID */
  source_id: string
  categoryFilter: string
  mode: ComponentMode
  percent: number
  volume: number
  volumeUnit: string
  mass: number
  massUnit: string
  activity: number
  activityUnit: string
}

// ==================== HELPERS ====================

function formatBatchStock(b: BatchOption): string {
  if (b.volume_per_unit && b.volume_per_unit > 0 && b.nomenclature?.category !== 'CONSUMABLE') {
    const u = b.unit || b.nomenclature?.unit || 'мл'
    return `${b.quantity} фл, тек: ${b.current_unit_volume ?? b.volume_per_unit}/${b.volume_per_unit} ${u}`
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

/** Парсит source_id → {type, id} */
function parseSourceId(sourceId: string): { type: 'batch' | 'rm'; id: string } {
  if (sourceId.startsWith('rm:')) return { type: 'rm', id: sourceId.slice(3) }
  if (sourceId.startsWith('batch:')) return { type: 'batch', id: sourceId.slice(6) }
  // legacy: plain UUID = batch
  return { type: 'batch', id: sourceId }
}

function makeComponent(counterRef: React.MutableRefObject<number>): RecipeComponent {
  counterRef.current++
  return {
    id: `comp-${counterRef.current}`,
    source_id: '',
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

/** Имя источника для autoName/composition */
function getSourceName(sourceId: string, batches: BatchOption[], readyMedia: ReadyMediaOption[]): string {
  if (!sourceId) return ''
  const { type, id } = parseSourceId(sourceId)
  if (type === 'batch') {
    const b = batches.find(x => x.id === id)
    return b?.nomenclature?.name || ''
  }
  const rm = readyMedia.find(x => x.id === id)
  return rm?.name || ''
}

// ==================== MAIN COMPONENT ====================

export default function NewReadyMediumPage() {
  const router = useRouter()
  const componentCounterRef = useRef(0)
  const [loading, setLoading] = useState(false)
  const [batches, setBatches] = useState<BatchOption[]>([])
  const [stocks, setStocks] = useState<StockOption[]>([])
  const [readyMedia, setReadyMedia] = useState<ReadyMediaOption[]>([])
  const [dataLoading, setDataLoading] = useState(true)

  // Form mode
  const [formMode, setFormMode] = useState<FormMode>('RECIPE')

  // RECIPE mode не поддерживает создание стоков (для этого есть STOCK mode)

  // Common fields
  const [name, setName] = useState("")
  const [totalVolume, setTotalVolume] = useState(500)
  const [prepDate, setPrepDate] = useState(new Date().toISOString().split("T")[0])
  const [expDate, setExpDate] = useState("")
  const [notes, setNotes] = useState("")

  // RECIPE mode: растворитель + компоненты (unified: batch + ready_media)
  const [solventSourceId, setSolventSourceId] = useState("")
  const [solventCategoryFilter, setSolventCategoryFilter] = useState("all")
  const [components, setComponents] = useState<RecipeComponent[]>([])

  // STOCK mode
  const [stockSourceBatchId, setStockSourceBatchId] = useState("")
  const [stockSourceCatFilter, setStockSourceCatFilter] = useState("all")
  const [stockSolventBatchId, setStockSolventBatchId] = useState("")
  const [stockSolventCatFilter, setStockSolventCatFilter] = useState("all")
  const [stockVolume, setStockVolume] = useState(0)
  const [stockConc, setStockConc] = useState(0)
  const [stockConcUnit, setStockConcUnit] = useState('×')

  // DILUTION mode
  const [sourceStockId, setSourceStockId] = useState("")
  const [targetConc, setTargetConc] = useState<number>(0)
  const [targetConcUnit, setTargetConcUnit] = useState<string>('×')
  const [diluentBatchId, setDiluentBatchId] = useState("")
  const [diluentCategoryFilter, setDiluentCategoryFilter] = useState("all")

  // ALIQUOT mode
  const [aliquotSourceType, setAliquotSourceType] = useState<'batch' | 'ready_medium'>('batch')
  const [aliquotSourceId, setAliquotSourceId] = useState('')
  const [aliquotSourceCatFilter, setAliquotSourceCatFilter] = useState('all')
  const [aliquotCount, setAliquotCount] = useState(1)
  const [aliquotVolume, setAliquotVolume] = useState(0)

  // ==================== LOAD DATA ====================

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setDataLoading(true)
    try {
      const [batchData, stockData, rmData] = await Promise.all([
        getBatches({ status: "AVAILABLE" }),
        getAvailableStocks(),
        getAvailableReadyMedia(),
      ])
      setBatches((batchData || []) as BatchOption[])
      setStocks((stockData || []) as StockOption[])
      setReadyMedia((rmData || []) as ReadyMediaOption[])
    } catch (err) {
      console.error("Error loading data:", err)
      toast.error("Ошибка загрузки данных")
    } finally {
      setDataLoading(false)
    }
  }

  // ==================== BATCH/RM FILTERS ====================

  function getFilteredBatches(catFilter: string) {
    const nonConsumable = batches.filter(b => b.nomenclature?.category && b.nomenclature.category !== 'CONSUMABLE')
    return catFilter === 'all' ? nonConsumable : nonConsumable.filter(b => b.nomenclature?.category === catFilter)
  }

  function getFilteredReadyMedia(catFilter: string) {
    // ready_media не имеют category напрямую — фильтруем только по all
    if (catFilter === 'all') return readyMedia
    return readyMedia // TODO: если добавим category в ready_media — фильтровать
  }

  /** Объединённый список для RECIPE: batches + ready_media */
  function getUnifiedOptions(catFilter: string) {
    const batchOpts = getFilteredBatches(catFilter).map(b => ({
      value: `batch:${b.id}`,
      label: `📦 ${b.nomenclature?.name} — ${b.batch_number} (${formatBatchStock(b)})`,
    }))
    const rmOpts = (catFilter === 'all' ? readyMedia : []).map(rm => ({
      value: `rm:${rm.id}`,
      label: `🧪 ${rm.name} — ${rm.code} (${rm.current_volume_ml ?? rm.volume_ml} мл${rm.concentration ? `, ${rm.concentration}${rm.concentration_unit || '×'}` : ''})`,
    }))
    return { batchOpts, rmOpts }
  }

  // ==================== RECIPE CALCULATIONS ====================

  const totalComponentsVolume = components.reduce((s, c) => s + getComponentVolumeMl(c, totalVolume), 0)
  const totalComponentsPercent = components.reduce((s, c) => c.mode === 'PERCENT' ? s + c.percent : s, 0)
  const solventVolume = totalVolume - totalComponentsVolume
  const solventPercent = totalVolume > 0 ? (solventVolume / totalVolume) * 100 : 0

  // ==================== DILUTION CALCULATIONS ====================

  const sourceStock = stocks.find(s => s.id === sourceStockId)
  const sourceConc = sourceStock?.concentration || 0
  const dilutionV1 = sourceConc > 0 && targetConc > 0 ? (targetConc * totalVolume) / sourceConc : 0
  const dilutionVDiluent = totalVolume - dilutionV1
  const dilutionValid = dilutionV1 > 0 && dilutionV1 <= totalVolume &&
    dilutionV1 <= (sourceStock?.current_volume_ml ?? sourceStock?.volume_ml ?? 0)

  // ==================== ALIQUOT CALCULATIONS ====================

  const aliquotTotalVolume = aliquotCount * aliquotVolume
  const aliquotSource = aliquotSourceType === 'batch'
    ? batches.find(b => b.id === aliquotSourceId)
    : readyMedia.find(m => m.id === aliquotSourceId)
  const aliquotAvailable = aliquotSourceType === 'batch'
    ? (() => {
        const b = aliquotSource as BatchOption | undefined
        if (!b) return 0
        if (b.volume_per_unit && b.volume_per_unit > 0 && b.nomenclature?.category !== 'CONSUMABLE') {
          return (b.quantity - 1) * b.volume_per_unit + (b.current_unit_volume ?? b.volume_per_unit)
        }
        return b.quantity
      })()
    : ((aliquotSource as ReadyMediaOption | undefined)?.current_volume_ml ?? 0)
  const aliquotValid = aliquotTotalVolume > 0 && aliquotTotalVolume <= aliquotAvailable

  // ==================== AUTO-NAME ====================

  const autoName = useMemo(() => {
    if (formMode === 'DILUTION') {
      if (!sourceStock) return ""
      return `${sourceStock.name} ${targetConc}${targetConcUnit}`
    }
    if (formMode === 'STOCK') {
      const src = batches.find(b => b.id === stockSourceBatchId)
      if (!src?.nomenclature?.name) return ""
      return `${src.nomenclature.name} ${stockConc}${stockConcUnit}`
    }
    if (formMode === 'ALIQUOT') {
      if (!aliquotSource) return ""
      const srcName = aliquotSourceType === 'batch'
        ? (aliquotSource as BatchOption)?.nomenclature?.name
        : (aliquotSource as ReadyMediaOption)?.name
      return srcName ? `Аликвота ${srcName} (${aliquotVolume} мл)` : ''
    }
    // RECIPE
    const parts: string[] = []
    if (solventSourceId) {
      const sName = getSourceName(solventSourceId, batches, readyMedia)
      if (sName) parts.push(sName)
    }
    for (const c of components) {
      if (!c.source_id) continue
      const cName = getSourceName(c.source_id, batches, readyMedia)
      if (cName) {
        const label = getComponentAmountLabel(c)
        if (label && label !== '0%' && label !== '0 мл' && label !== '0 мг' && label !== '0 ЕД') {
          parts.push(`${label} ${cName}`)
        }
      }
    }
    return parts.join(" + ")
  }, [formMode, solventSourceId, components, sourceStockId, targetConc, targetConcUnit,
    stockSourceBatchId, stockConc, stockConcUnit,
    aliquotSourceType, aliquotSourceId, aliquotVolume, aliquotCount,
    batches, readyMedia, stocks, sourceStock, aliquotSource])

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
      if ('categoryFilter' in updates) updated.source_id = ''
      return updated
    }))
  }

  // ==================== SUBMIT ====================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      switch (formMode) {
        case 'RECIPE': await submitRecipe(); break
        case 'STOCK': await submitStock(); break
        case 'DILUTION': await submitDilution(); break
        case 'ALIQUOT': await submitAliquot(); break
      }
      const msgs: Record<FormMode, string> = {
        RECIPE: 'Рабочая среда создана',
        STOCK: 'Стоковый раствор создан',
        DILUTION: 'Рабочий раствор создан',
        ALIQUOT: `${aliquotCount} аликвот создано`,
      }
      toast.success(msgs[formMode])
      router.push("/inventory")
    } catch (err: any) {
      console.error("Error:", err)
      toast.error(err.message || "Ошибка при создании")
    } finally {
      setLoading(false)
    }
  }

  async function submitRecipe() {
    if (solventVolume < -0.01) throw new Error("Объём компонентов превышает общий объём")
    if (totalComponentsPercent > 100) throw new Error("Сумма процентных компонентов превышает 100%")

    const hasSolvent = !!solventSourceId && solventSourceId !== '__none__'
    const solventParsed = hasSolvent ? parseSourceId(solventSourceId) : null

    const composition = {
      mode: 'RECIPE',
      solvent: hasSolvent ? {
        source_type: solventParsed!.type,
        source_id: solventParsed!.id,
        name: getSourceName(solventSourceId, batches, readyMedia),
        volume_ml: Math.round(solventVolume * 100) / 100,
      } : null,
      components: components
        .filter(c => c.source_id)
        .map(c => {
          const p = parseSourceId(c.source_id)
          return {
            source_type: p.type,
            source_id: p.id,
            name: getSourceName(c.source_id, batches, readyMedia),
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
      batch_id: hasSolvent && solventParsed?.type === 'batch' ? solventParsed.id : null,
      nomenclature_id: hasSolvent && solventParsed?.type === 'batch'
        ? batches.find(b => b.id === solventParsed!.id)?.nomenclature?.id || null
        : null,
      volume_ml: totalVolume,
      current_volume_ml: totalVolume,
      physical_state: 'WORKING_SOLUTION',
      parent_medium_id: hasSolvent && solventParsed?.type === 'rm' ? solventParsed.id : null,
      composition,
      prepared_at: prepDate || null,
      expiration_date: expDate || null,
      notes: notes || null,
      status: "ACTIVE",
    })

    // Write-off компонентов
    if (hasSolvent && solventParsed) {
      const vol = Math.max(solventVolume, 0)
      if (vol > 0) {
        if (solventParsed.type === 'batch') {
          await writeOffBatchVolume(solventParsed.id, vol, null, 'Растворитель для рабочей среды')
        } else {
          await writeOffReadyMediumVolume(solventParsed.id, vol)
        }
      }
    }
    for (const c of components.filter(x => x.source_id)) {
      const volMl = getComponentVolumeMl(c, totalVolume)
      if (volMl > 0) {
        const p = parseSourceId(c.source_id)
        if (p.type === 'batch') {
          await writeOffBatchVolume(p.id, volMl, null, `Компонент среды (${getComponentAmountLabel(c)})`)
        } else {
          await writeOffReadyMediumVolume(p.id, volMl)
        }
      }
    }
  }

  async function submitStock() {
    if (!stockSourceBatchId) throw new Error("Выберите реагент")
    if (stockVolume <= 0) throw new Error("Укажите объём стока")
    if (stockConc <= 0) throw new Error("Укажите концентрацию")

    const srcBatch = batches.find(b => b.id === stockSourceBatchId)
    const hasSolvent = !!stockSolventBatchId && stockSolventBatchId !== '__none__'
    const solventBatch = hasSolvent ? batches.find(b => b.id === stockSolventBatchId) : null

    const composition = {
      mode: 'STOCK',
      source_batch_id: stockSourceBatchId,
      source_name: srcBatch?.nomenclature?.name || '',
      solvent_batch_id: hasSolvent ? stockSolventBatchId : null,
      solvent_name: solventBatch?.nomenclature?.name || null,
      solvent_volume_ml: hasSolvent ? stockVolume : null,
      resulting_concentration: stockConc,
      resulting_concentration_unit: stockConcUnit,
    }

    await createReadyMedium({
      name: name || autoName,
      batch_id: stockSourceBatchId,
      nomenclature_id: srcBatch?.nomenclature?.id || null,
      volume_ml: stockVolume,
      current_volume_ml: stockVolume,
      physical_state: 'STOCK_SOLUTION',
      concentration: stockConc,
      concentration_unit: stockConcUnit,
      composition,
      prepared_at: prepDate || null,
      expiration_date: expDate || null,
      notes: notes || null,
      status: "ACTIVE",
    })

    // Списать 1 ед. реагента
    await writeOffBatchVolume(stockSourceBatchId, 1, null, 'Реагент для приготовления стока')
    // Списать растворитель
    if (hasSolvent && stockVolume > 0) {
      await writeOffBatchVolume(stockSolventBatchId, stockVolume, null, 'Растворитель для стока')
    }
  }

  async function submitDilution() {
    if (!sourceStockId) throw new Error("Выберите стоковый раствор")
    if (targetConc >= sourceConc) throw new Error("Целевая концентрация должна быть меньше исходной")
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

    // Сначала создаём запись, потом списываем (если create упадёт — инвентарь не пострадает)
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

    await writeOffReadyMediumVolume(sourceStockId, dilutionV1)
    if (hasDiluent && dilutionVDiluent > 0) {
      await writeOffBatchVolume(diluentBatchId, dilutionVDiluent, null, 'Разбавитель для рабочего раствора')
    }
  }

  async function submitAliquot() {
    if (!aliquotSourceId) throw new Error("Выберите источник")
    if (aliquotCount < 1) throw new Error("Укажите количество аликвот")
    if (aliquotVolume <= 0) throw new Error("Укажите объём аликвоты")
    if (!aliquotValid) throw new Error("Недостаточно объёма для создания аликвот")

    const srcName = aliquotSourceType === 'batch'
      ? (aliquotSource as BatchOption)?.nomenclature?.name || ''
      : (aliquotSource as ReadyMediaOption)?.name || ''

    const composition = {
      mode: 'ALIQUOT',
      source_type: aliquotSourceType,
      source_id: aliquotSourceId,
      source_name: srcName,
      aliquot_volume_ml: aliquotVolume,
      aliquot_count: aliquotCount,
    }

    // Сначала создаём аликвоты, потом списываем (если create упадёт — инвентарь не пострадает)
    // Создать N аликвот (codeOffset предотвращает коллизию кодов RM-XXXX)
    for (let i = 0; i < aliquotCount; i++) {
      await createReadyMedium({
        name: name || `Аликвота ${srcName} (${aliquotVolume} мл)`,
        batch_id: aliquotSourceType === 'batch' ? aliquotSourceId : null,
        nomenclature_id: aliquotSourceType === 'batch'
          ? (aliquotSource as BatchOption)?.nomenclature?.id || null
          : null,
        volume_ml: aliquotVolume,
        current_volume_ml: aliquotVolume,
        physical_state: 'ALIQUOT',
        parent_medium_id: aliquotSourceType === 'ready_medium' ? aliquotSourceId : null,
        composition,
        prepared_at: prepDate || null,
        expiration_date: expDate || null,
        notes: notes ? `${notes} (${i + 1}/${aliquotCount})` : `Аликвота ${i + 1}/${aliquotCount}`,
        status: "ACTIVE",
      }, i) // codeOffset = i
    }

    // Списать суммарный объём ПОСЛЕ создания всех аликвот
    if (aliquotSourceType === 'batch') {
      await writeOffBatchVolume(aliquotSourceId, aliquotTotalVolume, null, 'Аликвотирование')
    } else {
      await writeOffReadyMediumVolume(aliquotSourceId, aliquotTotalVolume)
    }
  }

  // ==================== VALIDATION ====================

  const canSubmit = (() => {
    if (loading) return false
    if (formMode === 'RECIPE') {
      const hasSolvent = !!solventSourceId && solventSourceId !== '__none__'
      const hasContent = hasSolvent || components.some(c => c.source_id)
      return hasContent && totalVolume > 0 && solventVolume >= -0.01 && totalComponentsPercent <= 100
    }
    if (formMode === 'STOCK') {
      return !!stockSourceBatchId && stockVolume > 0 && stockConc > 0
    }
    if (formMode === 'DILUTION') return !!sourceStockId && dilutionValid
    if (formMode === 'ALIQUOT') return !!aliquotSourceId && aliquotCount >= 1 && aliquotVolume > 0 && aliquotValid
    return false
  })()

  const submitLabel = (() => {
    switch (formMode) {
      case 'RECIPE': return 'Создать рабочую среду'
      case 'STOCK': return 'Создать стоковый раствор'
      case 'DILUTION': return 'Создать рабочий раствор'
      case 'ALIQUOT': return `Создать ${aliquotCount} аликвот`
    }
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
          <h1 className="text-2xl font-bold">Приготовление</h1>
          <p className="text-muted-foreground">
            Среды, растворы и аликвоты
          </p>
        </div>
      </div>

      {/* Mode selector: 4 tabs */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={formMode} onValueChange={v => {
            const newMode = v as FormMode
            setFormMode(newMode)
            // Сброс общих полей при переключении режима
            setName('')
            setNotes('')
            setTotalVolume(newMode === 'RECIPE' ? 500 : 0)
          }}>
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
              <TabsTrigger value="RECIPE" className="gap-1">
                <Beaker className="h-4 w-4" /> <span className="hidden sm:inline">Рабочая</span> среда
              </TabsTrigger>
              <TabsTrigger value="STOCK" className="gap-1">
                <FlaskRound className="h-4 w-4" /> <span className="hidden sm:inline">Стоковый</span> р-р
              </TabsTrigger>
              <TabsTrigger value="DILUTION" className="gap-1">
                <FlaskConical className="h-4 w-4" /> <span className="hidden sm:inline">Рабочий</span> р-р
              </TabsTrigger>
              <TabsTrigger value="ALIQUOT" className="gap-1">
                <Pipette className="h-4 w-4" /> Аликвоты
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ==================== RECIPE MODE ==================== */}
        {formMode === 'RECIPE' && (
          <>
            {/* Базовая среда / растворитель */}
            <Card>
              <CardHeader>
                <CardTitle>Базовая среда / Растворитель</CardTitle>
                <CardDescription>
                  Базовая среда (DMEM, RPMI...) или растворитель. Составит остаток объёма после добавок.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Категория</Label>
                    <Select value={solventCategoryFilter} onValueChange={v => { setSolventCategoryFilter(v); setSolventSourceId('') }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Источник (опционально)</Label>
                    {dataLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Загрузка...
                      </div>
                    ) : (() => {
                      const { batchOpts, rmOpts } = getUnifiedOptions(solventCategoryFilter)
                      return (
                        <Select value={solventSourceId} onValueChange={setSolventSourceId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Без растворителя со склада</SelectItem>
                            {batchOpts.length > 0 && batchOpts.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                            {rmOpts.length > 0 && rmOpts.map(o => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )
                    })()}
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

            {/* Компоненты */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Компоненты</span>
                  <Button type="button" variant="outline" size="sm" onClick={addComponent}>
                    <Plus className="mr-1 h-4 w-4" /> Добавить
                  </Button>
                </CardTitle>
                <CardDescription>
                  Каждый компонент — свой режим: %, объём (мл), масса (мг) или активность (ЕД).
                  Источники: поступления со склада 📦 и приготовленные растворы 🧪.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {components.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    Нажмите «Добавить» для добавления компонентов (FBS, P/S, L-глутамин и др.)
                  </p>
                ) : components.map((comp, idx) => {
                  const { batchOpts, rmOpts } = getUnifiedOptions(comp.categoryFilter)
                  return (
                    <div key={comp.id} className="border rounded-lg p-3 space-y-3">
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
                            <Select value={comp.source_id} onValueChange={v => updateComponent(comp.id, { source_id: v })}>
                              <SelectTrigger className="flex-1"><SelectValue placeholder="Выберите..." /></SelectTrigger>
                              <SelectContent>
                                {batchOpts.map(o => (
                                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                                {rmOpts.map(o => (
                                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="text-destructive shrink-0" onClick={() => removeComponent(comp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Mode + Value */}
                      <div className="flex items-end gap-2">
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

                  {(solventSourceId && solventSourceId !== '__none__') && (
                    <div className="flex justify-between text-sm">
                      <span>{getSourceName(solventSourceId, batches, readyMedia) || 'Растворитель'} ({solventPercent.toFixed(1)}%)</span>
                      <span className="font-medium">{solventVolume.toFixed(1)} мл</span>
                    </div>
                  )}

                  {(!solventSourceId || solventSourceId === '__none__') && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Растворитель (не выбран)</span>
                      <span>{solventVolume.toFixed(1)} мл</span>
                    </div>
                  )}

                  {components.filter(c => c.source_id).map(c => {
                    const volMl = getComponentVolumeMl(c, totalVolume)
                    return (
                      <div key={c.id} className="flex justify-between text-sm">
                        <span>
                          {getSourceName(c.source_id, batches, readyMedia) || '?'} ({getComponentAmountLabel(c)})
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

        {/* ==================== STOCK MODE ==================== */}
        {formMode === 'STOCK' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskRound className="h-5 w-5" />
                Стоковый раствор
              </CardTitle>
              <CardDescription>
                Реконституция лиофилизата, разведение концентрата или регистрация купленного стока.
                Результат — однокомпонентный раствор с известной концентрацией.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Реагент-источник */}
              <div className="space-y-2">
                <Label>Реагент (со склада) *</Label>
                <div className="flex gap-2">
                  <Select value={stockSourceCatFilter} onValueChange={v => { setStockSourceCatFilter(v); setStockSourceBatchId('') }}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {dataLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 flex-1">
                      <Loader2 className="h-4 w-4 animate-spin" /> Загрузка...
                    </div>
                  ) : (
                    <Select value={stockSourceBatchId} onValueChange={setStockSourceBatchId}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Выберите реагент..." /></SelectTrigger>
                      <SelectContent>
                        {getFilteredBatches(stockSourceCatFilter).map(batch => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.nomenclature?.name} — {batch.batch_number} ({formatBatchStock(batch)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* Растворитель */}
              <div className="space-y-2">
                <Label>Растворитель (опционально)</Label>
                <div className="flex gap-2">
                  <Select value={stockSolventCatFilter} onValueChange={v => { setStockSolventCatFilter(v); setStockSolventBatchId('') }}>
                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={stockSolventBatchId} onValueChange={setStockSolventBatchId}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Без растворителя" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Без растворителя со склада</SelectItem>
                      {getFilteredBatches(stockSolventCatFilter).map(batch => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.nomenclature?.name} — {batch.batch_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Объём + Концентрация */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Объём стока (мл) *</Label>
                  <Input type="number" min={0.001} step="any" value={stockVolume || ''} onChange={e => setStockVolume(parseFloat(e.target.value) || 0)} placeholder="1" required />
                </div>
                <div className="space-y-2">
                  <Label>Концентрация *</Label>
                  <div className="flex gap-2">
                    <Input type="number" min={0} step="any" value={stockConc || ''} onChange={e => setStockConc(parseFloat(e.target.value) || 0)} placeholder="100" className="flex-1" />
                    <Select value={stockConcUnit} onValueChange={setStockConcUnit}>
                      <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONCENTRATION_UNITS.map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Подсказка-калькулятор: инструкция для оператора */}
              {(() => {
                const srcBatch = stockSourceBatchId ? batches.find((b: BatchOption) => b.id === stockSourceBatchId) : null
                if (!srcBatch) return null

                const mw = srcBatch.nomenclature?.molecular_weight
                const sa = srcBatch.nomenclature?.specific_activity // ЕД/мг
                const batchUnit = srcBatch.unit || ''
                const batchQtyPerUnit = srcBatch.volume_per_unit ?? 0
                const amountPerUnit = batchQtyPerUnit > 0 ? batchQtyPerUnit : 1

                const isMolarConc = stockConcUnit === 'мМ' || stockConcUnit === 'М'
                const isActivityConc = stockConcUnit === 'ЕД/мл'
                const isMassConc = stockConcUnit === 'мг/мл' || stockConcUnit === 'мкг/мл'

                const hasMolarUnit = ['мкмоль', 'ммоль', 'моль'].includes(batchUnit)
                if (!mw && !sa && !hasMolarUnit) return null

                const targetConcMM = stockConcUnit === 'М' ? stockConc * 1000 : stockConcUnit === 'мМ' ? stockConc : 0

                // Расчёт навески (сколько граммов/мг нужно)
                const massGrams = isMolarConc && mw && targetConcMM > 0 && stockVolume > 0
                  ? calcMassForMolarConc(targetConcMM, stockVolume, mw) : null
                const massMg = isActivityConc && sa && stockConc > 0 && stockVolume > 0
                  ? calcMassForActivityConc(stockConc, stockVolume, sa) : null

                // Форматирование массы в удобные единицы
                const fmtMass = (grams: number) => {
                  if (grams >= 1) return `${grams.toFixed(2)} г`
                  if (grams >= 0.001) return `${(grams * 1000).toFixed(1)} мг`
                  return `${(grams * 1e6).toFixed(0)} мкг`
                }
                const fmtMassMg = (mg: number) => {
                  if (mg >= 1000) return `${(mg / 1000).toFixed(2)} г`
                  if (mg >= 1) return `${mg.toFixed(1)} мг`
                  return `${(mg * 1000).toFixed(0)} мкг`
                }

                // Хватит ли 1 ед. на требуемый объём?
                const moles = toMoles(amountPerUnit, batchUnit, mw)
                const totalEU = sa ? calcTotalActivity(amountPerUnit, batchUnit, sa) : null
                const maxVolMolar = isMolarConc && moles != null && targetConcMM > 0
                  ? calcVolumeForMolarConc(amountPerUnit, batchUnit, targetConcMM, mw) : null
                const maxVolActivity = isActivityConc && totalEU != null && stockConc > 0
                  ? calcVolumeForActivityConc(amountPerUnit, batchUnit, sa!, stockConc) : null

                const hasInstruction = massGrams != null || massMg != null
                const hasRefOnly = !hasInstruction && (mw || sa)

                return (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
                    <p className="text-sm font-medium text-blue-800 flex items-center gap-1.5">
                      <FlaskRound className="h-4 w-4" />
                      Инструкция для приготовления
                    </p>

                    {/* === ГЛАВНЫЙ БЛОК: навеска + растворитель === */}
                    {hasInstruction ? (
                      <div className="bg-white/70 rounded-md p-3 space-y-2">
                        {massGrams != null ? (
                          <>
                            <p className="text-sm text-blue-900">
                              <span className="font-bold text-base">1.</span> Навесить{' '}
                              <span className="font-bold text-base text-blue-900">{fmtMass(massGrams)}</span>{' '}
                              порошка
                            </p>
                            <p className="text-sm text-blue-900">
                              <span className="font-bold text-base">2.</span> Растворить в{' '}
                              <span className="font-bold text-base text-blue-900">{stockVolume} мл</span>{' '}
                              растворителя
                            </p>
                            <p className="text-sm text-blue-900">
                              <span className="font-bold text-base">3.</span> Итого:{' '}
                              <span className="font-bold text-blue-900">{stockConc} {stockConcUnit}</span>{' '}
                              × {stockVolume} мл
                            </p>
                          </>
                        ) : massMg != null ? (
                          <>
                            <p className="text-sm text-blue-900">
                              <span className="font-bold text-base">1.</span> Навесить{' '}
                              <span className="font-bold text-base text-blue-900">{fmtMassMg(massMg)}</span>{' '}
                              порошка
                            </p>
                            <p className="text-sm text-blue-900">
                              <span className="font-bold text-base">2.</span> Растворить в{' '}
                              <span className="font-bold text-base text-blue-900">{stockVolume} мл</span>{' '}
                              растворителя
                            </p>
                            <p className="text-sm text-blue-900">
                              <span className="font-bold text-base">3.</span> Итого:{' '}
                              <span className="font-bold text-blue-900">{stockConc} {stockConcUnit}</span>{' '}
                              × {stockVolume} мл
                            </p>
                          </>
                        ) : null}
                      </div>
                    ) : (stockConc > 0 && stockVolume > 0) ? (
                      <p className="text-sm text-amber-600">
                        {isMolarConc && !mw ? 'Укажите MW в справочнике для расчёта навески' :
                         isActivityConc && !sa ? 'Укажите удельную активность (ЕД/мг) в справочнике' :
                         'Заполните концентрацию и объём для расчёта'}
                      </p>
                    ) : null}

                    {/* === Справочная информация === */}
                    <div className="text-xs text-blue-600 space-y-0.5 border-t border-blue-200 pt-2">
                      {mw ? <p>MW = {mw} г/моль</p> : null}
                      {sa ? <p>Уд. активность = {sa} ЕД/мг</p> : null}
                      {maxVolMolar != null ? (
                        <p>1 ед. ({amountPerUnit} {batchUnit}) хватит на{' '}
                          <span className="font-medium">{maxVolMolar.toFixed(1)} мл</span>{' '}
                          при {stockConc} {stockConcUnit}
                        </p>
                      ) : null}
                      {maxVolActivity != null ? (
                        <p>1 ед. ({amountPerUnit} {batchUnit}) хватит на{' '}
                          <span className="font-medium">{maxVolActivity.toFixed(1)} мл</span>{' '}
                          при {stockConc} {stockConcUnit}
                        </p>
                      ) : null}
                      {/* Справочные пересчёты когда единица конц. другого типа */}
                      {!isMolarConc && !isActivityConc && stockVolume > 0 ? (
                        <>
                          {moles != null ? (
                            <p>Молярная конц.:{' '}
                              <span className="font-medium">
                                {(() => {
                                  const c = calcMolarConc(amountPerUnit, batchUnit, stockVolume, mw)
                                  if (c == null) return '—'
                                  return c >= 1 ? `${c.toFixed(2)} мМ` : `${(c * 1000).toFixed(1)} мкМ`
                                })()}
                              </span> (справочно)
                            </p>
                          ) : null}
                          {totalEU != null ? (
                            <p>Активность:{' '}
                              <span className="font-medium">
                                {(() => {
                                  const c = calcActivityConc(amountPerUnit, batchUnit, sa!, stockVolume)
                                  if (c == null) return '—'
                                  return `${c.toFixed(1)} ЕД/мл`
                                })()}
                              </span> (справочно)
                            </p>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        )}

        {/* ==================== DILUTION MODE ==================== */}
        {formMode === 'DILUTION' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Рабочий раствор (C₁V₁ = C₂V₂)
              </CardTitle>
              <CardDescription>Создание рабочего раствора из стокового. Выберите сток и задайте целевую концентрацию.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Стоковый раствор (C₁) *</Label>
                {dataLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Загрузка...
                  </div>
                ) : (
                  <Select value={sourceStockId} onValueChange={setSourceStockId}>
                    <SelectTrigger><SelectValue placeholder="Выберите сток..." /></SelectTrigger>
                    <SelectContent>
                      {stocks.length === 0 ? (
                        <SelectItem value="__empty" disabled>Нет доступных стоков</SelectItem>
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

        {/* ==================== ALIQUOT MODE ==================== */}
        {formMode === 'ALIQUOT' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pipette className="h-5 w-5" />
                Аликвотирование
              </CardTitle>
              <CardDescription>
                Разлить из одного источника на N одинаковых порций. Концентрация и состав не меняются.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Тип источника */}
              <div className="space-y-2">
                <Label>Тип источника</Label>
                <Tabs value={aliquotSourceType} onValueChange={v => { setAliquotSourceType(v as 'batch' | 'ready_medium'); setAliquotSourceId('') }}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="batch">📦 Со склада (поступления)</TabsTrigger>
                    <TabsTrigger value="ready_medium">🧪 Из приготовленных</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Источник */}
              <div className="space-y-2">
                <Label>Источник *</Label>
                {aliquotSourceType === 'batch' ? (
                  <div className="flex gap-2">
                    <Select value={aliquotSourceCatFilter} onValueChange={v => { setAliquotSourceCatFilter(v); setAliquotSourceId('') }}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ALL_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={aliquotSourceId} onValueChange={setAliquotSourceId}>
                      <SelectTrigger className="flex-1"><SelectValue placeholder="Выберите партию..." /></SelectTrigger>
                      <SelectContent>
                        {getFilteredBatches(aliquotSourceCatFilter).map(batch => (
                          <SelectItem key={batch.id} value={batch.id}>
                            {batch.nomenclature?.name} — {batch.batch_number} ({formatBatchStock(batch)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Select value={aliquotSourceId} onValueChange={setAliquotSourceId}>
                    <SelectTrigger><SelectValue placeholder="Выберите раствор/среду..." /></SelectTrigger>
                    <SelectContent>
                      {readyMedia.map(rm => (
                        <SelectItem key={rm.id} value={rm.id}>
                          🧪 {rm.name} — {rm.code} ({rm.current_volume_ml ?? rm.volume_ml} мл)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {aliquotSource && (
                  <p className="text-xs text-muted-foreground">
                    Доступный объём: <strong>{aliquotAvailable.toFixed(1)} {aliquotSourceType === 'batch' ? (aliquotSource as BatchOption).unit : 'мл'}</strong>
                  </p>
                )}
              </div>

              {/* Параметры аликвот */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Кол-во аликвот *</Label>
                  <Input type="number" min={1} step={1} value={aliquotCount} onChange={e => setAliquotCount(parseInt(e.target.value) || 1)} placeholder="10" required />
                </div>
                <div className="space-y-2">
                  <Label>Объём каждой (мл) *</Label>
                  <Input type="number" min={0.001} step="any" value={aliquotVolume || ''} onChange={e => setAliquotVolume(parseFloat(e.target.value) || 0)} placeholder="50" required />
                </div>
                <div className="space-y-2">
                  <Label>Итого</Label>
                  <div className={`p-2 rounded text-center font-bold ${aliquotValid ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400' : aliquotTotalVolume > 0 ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400' : 'bg-muted text-muted-foreground'}`}>
                    {aliquotCount} × {aliquotVolume || 0} = {aliquotTotalVolume.toFixed(1)} мл
                  </div>
                </div>
              </div>

              {aliquotTotalVolume > 0 && !aliquotValid && (
                <p className="text-destructive text-xs">
                  Недостаточно объёма! Нужно {aliquotTotalVolume.toFixed(1)} мл, доступно {aliquotAvailable.toFixed(1)} мл
                </p>
              )}
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
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={autoName || "Название среды/раствора"} />
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
            ) : submitLabel}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/inventory">Отмена</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
