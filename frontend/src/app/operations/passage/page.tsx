"use client"

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import {
  ArrowLeft,
  ArrowRight,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  Loader2,
  TestTubes,
  Beaker,
  Plus,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { PositionTreeSelect } from '@/components/position-tree-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import {
  getLots,
  getContainersByLot,
  getContainerTypes,
  getAvailableMediaForFeed,
  getReagentBatches,
  getPositions,
  getContainerStockByType,
  createOperationPassage,
  checkBatchVolumeDeduction,
} from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LotItem {
  id: string
  lot_number: string
  passage_number: number
  status: string
  culture_id: string
  culture?: {
    id: string
    name: string
    culture_type?: { name: string }
  }
}

interface ContainerItem {
  id: string
  code: string
  status: string
  container_status?: string
  confluent_percent?: number
  passage_number?: number
  position?: { id: string; path: string } | null
  container_type?: { id: string; name: string; code?: string; surface_area_cm2?: number; volume_ml?: number } | null
}

interface ContainerTypeItem {
  id: string
  name: string
  code?: string
  is_cryo?: boolean
  is_active?: boolean
  surface_area_cm2?: number | null
  volume_ml?: number | null
  optimal_confluent?: number | null
}

interface ReadyMediumItem {
  id: string
  code: string
  name?: string
  current_volume_ml?: number
  expiration_date?: string
}

interface ReagentBatchItem {
  id: string
  batch_number: string
  quantity: number
  volume_per_unit?: number | null
  current_unit_volume?: number | null
  nomenclature?: { name?: string; code?: string; category?: string } | null
  expiration_date?: string
}

interface PositionItem {
  id: string
  path: string
  is_active?: boolean
  equipment?: { name?: string; type?: string } | null
}

interface StockBatchItem {
  id: string
  batch_number: string
  quantity: number
  nomenclature?: {
    name?: string
    code?: string
    container_type_id?: string
    container_type?: { id: string; name: string; code: string; surface_area_cm2?: number } | null
  } | null
  expiration_date?: string
}

interface ResultContainerRow {
  id: string
  stockBatchId: string       // batch from stock → determines container type + write-off
  containerTypeId: string    // derived from stockBatchId
  count: string
}

function generateRowId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// ---------------------------------------------------------------------------
// Step labels
// ---------------------------------------------------------------------------

const STEPS = [
  'Источник',
  'Среды',
  'Метрики',
  'Результат',
  'Подтверждение',
] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function PassagePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // --- wizard state ---
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // --- reference data ---
  const [lots, setLots] = useState<LotItem[]>([])
  const [containers, setContainers] = useState<ContainerItem[]>([])
  const [containerTypes, setContainerTypes] = useState<ContainerTypeItem[]>([])
  const [readyMedia, setReadyMedia] = useState<ReadyMediumItem[]>([])
  const [reagentBatches, setReagentBatches] = useState<ReagentBatchItem[]>([])
  const [positions, setPositions] = useState<PositionItem[]>([])
  const [containerStock, setContainerStock] = useState<StockBatchItem[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // --- Step 1: source ---
  const [selectedLotId, setSelectedLotId] = useState<string>('')
  const [selectedContainerIds, setSelectedContainerIds] = useState<Set<string>>(new Set())

  // --- Step 2: media (required) ---
  const [dissociationMediumId, setDissociationMediumId] = useState<string>('')
  const [washMediumId, setWashMediumId] = useState<string>('')
  const [seedMediumId, setSeedMediumId] = useState<string>('')

  // --- Step 2/4: media volumes ---
  const [dissociationVolume, setDissociationVolume] = useState<string>('')
  const [washVolume, setWashVolume] = useState<string>('')
  const [seedVolume, setSeedVolume] = useState<string>('')

  // --- Step 3: metrics (per passage) ---
  const [concentration, setConcentration] = useState<string>('')
  const [volumeMl, setVolumeMl] = useState<string>('')
  const [viability, setViability] = useState<string>('')

  // --- Step 4: result (multi-row container groups) ---
  const [resultRows, setResultRows] = useState<ResultContainerRow[]>([
    { id: generateRowId(), stockBatchId: '', containerTypeId: '', count: '1' }
  ])
  const [positionId, setPositionId] = useState<string>('')

  // --- Step 4: per-container media mode ---
  const [perContainerMediaMode, setPerContainerMediaMode] = useState(false)
  const [perRowMedia, setPerRowMedia] = useState<Record<string, string>>({})   // rowId -> mediumId
  const [perRowVolume, setPerRowVolume] = useState<Record<string, string>>({})  // rowId -> volume per container

  // --- Step 4: additional components (serum, reagent, additive) ---
  const [additionalComponents, setAdditionalComponents] = useState<
    { id: string; mediumId: string; volumeMl: string }[]
  >([])

  // --- Step 5: confirmation ---
  const [notes, setNotes] = useState('')

  // =========================================================================
  // Load reference data
  // =========================================================================

  useEffect(() => {
    ;(async () => {
      try {
        const [lotsData, typesData, mediaData, reagentsData, posData, stockData] = await Promise.all([
          getLots({ status: 'ACTIVE' }),
          getContainerTypes(),
          getAvailableMediaForFeed(),
          getReagentBatches(),
          getPositions(),
          getContainerStockByType(),
        ])
        setLots((lotsData as LotItem[]) || [])
        setContainerTypes((typesData as ContainerTypeItem[]) || [])
        setReadyMedia((mediaData as ReadyMediumItem[]) || [])
        setReagentBatches((reagentsData as ReagentBatchItem[]) || [])
        setPositions((posData as PositionItem[]) || [])
        setContainerStock((stockData as StockBatchItem[]) || [])

        // Auto-bind from URL params
        const paramLotId = searchParams.get('lot_id')
        const paramContainerId = searchParams.get('container_id')
        if (paramLotId) {
          setSelectedLotId(paramLotId)
        }
        if (paramContainerId) {
          setSelectedContainerIds(new Set([paramContainerId]))
        }
      } catch (err) {
        console.error('Error loading reference data:', err)
        toast.error('Ошибка загрузки справочных данных')
      } finally {
        setLoadingData(false)
      }
    })()
  }, [searchParams])

  // Load containers when lot changes
  useEffect(() => {
    if (!selectedLotId) {
      setContainers([])
      setSelectedContainerIds(new Set())
      return
    }
    ;(async () => {
      try {
        const data = await getContainersByLot(selectedLotId)
        setContainers((data as ContainerItem[]) || [])
        const paramContainerId = searchParams.get('container_id')
        if (paramContainerId && data?.some((c: any) => c.id === paramContainerId)) {
          setSelectedContainerIds(new Set([paramContainerId]))
        } else if (!paramContainerId) {
          setSelectedContainerIds(new Set())
        }
      } catch (err) {
        console.error('Error loading containers:', err)
        toast.error('Ошибка загрузки контейнеров')
      }
    })()
  }, [selectedLotId, searchParams])

  // =========================================================================
  // Derived values
  // =========================================================================

  const selectedLot = useMemo(
    () => lots.find((l) => l.id === selectedLotId) ?? null,
    [lots, selectedLotId],
  )

  const activeContainers = useMemo(
    () => containers.filter((c) => {
      const st = c.container_status || c.status
      return st === 'IN_CULTURE' || st === 'ACTIVE'
    }),
    [containers],
  )

  const allSelected =
    activeContainers.length > 0 &&
    activeContainers.every((c) => selectedContainerIds.has(c.id))

  const splitMode: 'full' | 'partial' =
    activeContainers.length > 0 && allSelected ? 'full' : 'partial'

  const concentrationNum = parseFloat(concentration) || 0
  const volumeNum = parseFloat(volumeMl) || 0
  const viabilityNum = parseFloat(viability) || 0
  const totalCellsMillions = (concentrationNum * volumeNum) / 1_000_000
  const totalNewContainers = resultRows.reduce((sum, r) => sum + (parseInt(r.count, 10) || 0), 0)
  const cellsPerContainer = totalNewContainers > 0 ? totalCellsMillions / totalNewContainers : 0
  const seedVolumePerContainer = parseFloat(seedVolume) || 0
  const totalSeedVolume = seedVolumePerContainer * totalNewContainers

  // Find seed medium details for volume checking
  const seedMediumParsed = parseMediumId(seedMediumId)
  const seedMediumObj = seedMediumParsed?.type === 'ready_medium'
    ? readyMedia.find(m => m.id === seedMediumParsed.id)
    : null
  const seedMediumAvailable = seedMediumObj?.current_volume_ml ?? 0
  const seedMediumOverflow = seedMediumObj && totalSeedVolume > seedMediumAvailable

  // --- Volume overflow checks for batch-reagents (пофлаконный учёт) ---
  function getBatchOverflowInfo(mediumComboId: string, volumeMl: number) {
    const parsed = parseMediumId(mediumComboId)
    if (!parsed || parsed.type !== 'batch' || !volumeMl) return null
    const batch = reagentBatches.find(b => b.id === parsed.id)
    if (!batch || !batch.volume_per_unit) return null // без пофлаконного учёта
    const result = checkBatchVolumeDeduction(
      { quantity: batch.quantity, volume_per_unit: batch.volume_per_unit, current_unit_volume: batch.current_unit_volume },
      volumeMl
    )
    if (result.fits) return null
    return { unitsNeeded: result.unitsNeeded, currentVol: batch.current_unit_volume ?? batch.volume_per_unit, totalAvailable: result.totalAvailable }
  }

  const dissocOverflow = getBatchOverflowInfo(dissociationMediumId, parseFloat(dissociationVolume) || 0)
  const washOverflow = getBatchOverflowInfo(washMediumId, parseFloat(washVolume) || 0)
  const seedBatchOverflow = seedMediumParsed?.type === 'batch'
    ? getBatchOverflowInfo(seedMediumId, totalSeedVolume)
    : null

  // Check consumable overflow for any row (must be before step validation)
  const hasConsumableOverflow = resultRows.some(row => {
    if (!row.stockBatchId) return false
    const batch = containerStock.find(b => b.id === row.stockBatchId)
    const count = parseInt(row.count, 10) || 0
    return batch != null && count > batch.quantity
  })

  // Non-cryo container types
  const filteredContainerTypes = useMemo(
    () => containerTypes.filter((t) => !t.is_cryo && t.is_active !== false),
    [containerTypes],
  )

  // Stock batches for container selection — non-cryo, with quantity
  const containerStockOptions = useMemo(() => {
    return containerStock.filter(b => {
      const ct = b.nomenclature?.container_type
      if (!ct) return false
      // exclude cryo
      const name = (ct.name || '').toUpperCase()
      return !name.includes('CRYO')
    })
  }, [containerStock])

  // Cells per cm² calculation (uses containerStock, must be after it)
  const totalSurfaceArea = resultRows.reduce((sum, row) => {
    const batch = containerStock.find(b => b.id === row.stockBatchId)
    const area = batch?.nomenclature?.container_type?.surface_area_cm2 ?? 0
    const count = parseInt(row.count, 10) || 0
    return sum + area * count
  }, 0)
  const cellsPerCm2 = totalSurfaceArea > 0 ? (totalCellsMillions * 1_000_000) / totalSurfaceArea : 0

  // Combined list of all media/reagents for selection
  const allMediaOptions = useMemo(() => {
    const options: { id: string; label: string; type: 'ready_medium' | 'batch'; category?: string }[] = []

    // Ready media
    for (const m of readyMedia) {
      options.push({
        id: `rm:${m.id}`,
        label: `${m.name || m.code} (${m.current_volume_ml ?? '?'} мл) — Готовая среда`,
        type: 'ready_medium',
        category: 'MEDIUM',
      })
    }

    // Reagent batches (media, buffers, enzymes, additives)
    for (const b of reagentBatches) {
      const nom = b.nomenclature
      if (!nom) continue
      // Пофлаконный лейбл: "Alpha-MEM LOT-001 (3 фл × 500 мл, тек: 320 мл)"
      let qtyLabel: string
      if (b.volume_per_unit && b.volume_per_unit > 0) {
        const curVol = b.current_unit_volume ?? b.volume_per_unit
        qtyLabel = `${b.quantity} фл × ${b.volume_per_unit} мл, тек: ${curVol} мл`
      } else {
        qtyLabel = `${b.quantity} ${nom.category === 'MEDIUM' ? 'мл' : 'шт.'}`
      }
      options.push({
        id: `batch:${b.id}`,
        label: `${nom.name || b.batch_number} (${qtyLabel})${b.expiration_date ? ` до ${b.expiration_date}` : ''}`,
        type: 'batch',
        category: nom.category || undefined,
      })
    }

    return options
  }, [readyMedia, reagentBatches])


  // =========================================================================
  // Step validation
  // =========================================================================

  const canProceedStep1 = selectedLotId !== '' && selectedContainerIds.size > 0
  const canProceedStep2 = dissociationMediumId !== '' && washMediumId !== ''
  const canProceedStep3 =
    concentrationNum > 0 && volumeNum > 0 && viabilityNum > 0 && viabilityNum <= 100
  const canProceedStep4 = resultRows.length > 0
    && resultRows.every(r => r.stockBatchId !== '' && (parseInt(r.count, 10) || 0) >= 1)
    && positionId !== ''
    && (perContainerMediaMode
      ? resultRows.every(r => perRowMedia[r.id] && perRowMedia[r.id] !== '')
      : seedMediumId !== '')
    && !hasConsumableOverflow

  function canProceed(s: number): boolean {
    if (s === 1) return canProceedStep1
    if (s === 2) return canProceedStep2
    if (s === 3) return canProceedStep3
    if (s === 4) return canProceedStep4
    return true
  }

  // =========================================================================
  // Container selection helpers
  // =========================================================================

  function toggleContainer(id: string) {
    setSelectedContainerIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedContainerIds(new Set())
    } else {
      setSelectedContainerIds(new Set(activeContainers.map((c) => c.id)))
    }
  }

  function addResultRow() {
    setResultRows(prev => [...prev, { id: generateRowId(), stockBatchId: '', containerTypeId: '', count: '1' }])
  }

  function removeResultRow(rowId: string) {
    if (resultRows.length <= 1) return
    setResultRows(prev => prev.filter(r => r.id !== rowId))
  }

  function updateResultRow(rowId: string, updates: Partial<ResultContainerRow>) {
    setResultRows(prev => prev.map(r => r.id === rowId ? { ...r, ...updates } : r))
  }

  // Parse medium ID (rm:xxx or batch:xxx)
  function parseMediumId(combined: string): { type: 'ready_medium' | 'batch'; id: string } | null {
    if (!combined) return null
    const [type, ...rest] = combined.split(':')
    const id = rest.join(':')
    if (type === 'rm') return { type: 'ready_medium', id }
    if (type === 'batch') return { type: 'batch', id }
    return null
  }

  // =========================================================================
  // Submit
  // =========================================================================

  async function handleSubmit() {
    if (!selectedLot) return
    setSubmitting(true)
    try {
      const sourceContainers = Array.from(selectedContainerIds).map((cid) => {
        const c = containers.find((x) => x.id === cid)
        return {
          container_id: cid,
          split_ratio: 1,
          confluent_percent: c?.confluent_percent ?? 0,
          viability_percent: viabilityNum,
          concentration: concentrationNum,
          volume_ml: volumeNum,
        }
      })

      const dissoc = parseMediumId(dissociationMediumId)
      const wash = parseMediumId(washMediumId)
      const seed = parseMediumId(seedMediumId)

      await createOperationPassage({
        source_lot_id: selectedLotId,
        source_containers: sourceContainers,
        metrics: {
          concentration: concentrationNum,
          volume_ml: volumeNum,
          viability_percent: viabilityNum,
        },
        media: {
          dissociation_rm_id: dissoc?.type === 'ready_medium' ? dissoc.id : undefined,
          dissociation_batch_id: dissoc?.type === 'batch' ? dissoc.id : undefined,
          dissociation_volume_ml: parseFloat(dissociationVolume) || undefined,
          wash_rm_id: wash?.type === 'ready_medium' ? wash.id : undefined,
          wash_batch_id: wash?.type === 'batch' ? wash.id : undefined,
          wash_volume_ml: parseFloat(washVolume) || undefined,
          seed_rm_id: seed?.type === 'ready_medium' ? seed.id : undefined,
          seed_batch_id: seed?.type === 'batch' ? seed.id : undefined,
          seed_volume_ml: totalSeedVolume > 0 ? totalSeedVolume : undefined,
        },
        result: {
          container_groups: resultRows.map(r => ({
            container_type_id: r.containerTypeId,
            target_count: parseInt(r.count, 10) || 1,
            consumable_batch_id: r.stockBatchId || undefined,
          })),
          position_id: positionId,
        },
        split_mode: splitMode,
        notes: notes || undefined,
      })

      toast.success('Пассаж выполнен успешно')
      const cultureId = selectedLot?.culture_id || selectedLot?.culture?.id
      if (cultureId) {
        router.push(`/cultures/${cultureId}`)
      } else {
        router.push(`/lots/${selectedLotId}`)
      }
    } catch (err: unknown) {
      console.error('Passage error:', err)
      const msg = err instanceof Error ? err.message : 'Неизвестная ошибка'
      toast.error(`Ошибка при выполнении пассажа: ${msg}`)
    } finally {
      setSubmitting(false)
    }
  }

  // =========================================================================
  // Render
  // =========================================================================

  if (loadingData) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Find medium label for summary
  function getMediumLabel(id: string): string {
    const opt = allMediaOptions.find((o) => o.id === id)
    return opt?.label || '—'
  }

  return (
    <div className="container py-6 space-y-6 max-w-3xl mx-auto">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Пассажирование</h1>
          <p className="text-muted-foreground">
            Пересев культуры в новые контейнеры с увеличением пассажа
          </p>
        </div>
      </div>

      {/* ---- Step indicator ---- */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {STEPS.map((label, i) => {
          const stepNum = i + 1
          const isCompleted = step > stepNum
          const isCurrent = step === stepNum
          return (
            <div key={i} className="flex items-center gap-1.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> : stepNum}
              </div>
              <span
                className={`text-xs whitespace-nowrap ${
                  isCurrent || isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="w-4 h-0.5 bg-border shrink-0" />}
            </div>
          )
        })}
      </div>

      {/* ================================================================== */}
      {/* STEP 1 — SOURCE                                                    */}
      {/* ================================================================== */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Выберите лот и контейнеры</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Lot selector */}
            <div className="space-y-2">
              <Label>Лот</Label>
              <Select value={selectedLotId} onValueChange={setSelectedLotId} disabled={!!searchParams.get('lot_id')}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите активный лот..." />
                </SelectTrigger>
                <SelectContent>
                  {lots.map((lot) => (
                    <SelectItem key={lot.id} value={lot.id}>
                      {lot.lot_number} — {lot.culture?.name ?? 'N/A'} (P
                      {lot.passage_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lot info */}
            {selectedLot && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">
                  Культура: {selectedLot.culture?.name ?? '—'}
                </Badge>
                <Badge variant="secondary">
                  Пассаж: P{selectedLot.passage_number}
                </Badge>
                <Badge variant="secondary">
                  Контейнеров: {activeContainers.length}
                </Badge>
              </div>
            )}

            {/* Containers */}
            {selectedLotId && activeContainers.length > 0 && (
              <>
                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="select-all"
                      checked={allSelected}
                      onCheckedChange={toggleAll}
                    />
                    <Label htmlFor="select-all" className="cursor-pointer font-medium">
                      Выбрать все ({activeContainers.length})
                    </Label>
                  </div>

                  <div className="grid gap-2">
                    {activeContainers.map((c) => (
                      <div
                        key={c.id}
                        className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedContainerIds.has(c.id)
                            ? 'border-primary bg-primary/5'
                            : 'hover:border-muted-foreground/50'
                        }`}
                        onClick={() => toggleContainer(c.id)}
                      >
                        <Checkbox
                          checked={selectedContainerIds.has(c.id)}
                          onCheckedChange={() => toggleContainer(c.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm">{c.code}</span>
                            <Badge variant="outline" className="text-xs">
                              {c.container_status || c.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                            {c.container_type?.name && (
                              <span>{c.container_type.name}</span>
                            )}
                            {c.container_type?.surface_area_cm2 && (
                              <span>{c.container_type.surface_area_cm2} см²</span>
                            )}
                            {c.confluent_percent !== undefined && (
                              <span className={
                                c.confluent_percent >= 90 ? 'text-green-600 font-medium' :
                                c.confluent_percent >= 70 ? 'text-orange-600 font-medium' : ''
                              }>
                                Конфл.: {c.confluent_percent}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Split mode indicator */}
                {selectedContainerIds.size > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Режим:</span>
                      <Badge variant={splitMode === 'full' ? 'default' : 'secondary'}>
                        {splitMode === 'full' ? 'Full' : 'Partial'}
                      </Badge>
                    </div>
                    {splitMode === 'partial' && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Split: будет создан новый лот (выбраны не все контейнеры)
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </>
            )}

            {selectedLotId && activeContainers.length === 0 && (
              <p className="text-center py-6 text-muted-foreground">
                В этом лоте нет активных контейнеров
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* STEP 2 — MEDIA (Среды — обязательные)                              */}
      {/* ================================================================== */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTubes className="h-5 w-5" />
              Среды для пассажа
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dissociation medium - required */}
            <div className="space-y-2">
              <Label>
                Среда диссоциации (снятие клеток) <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">Фермент или реагент для открепления клеток (трипсин, коллагеназа, аккутаза и т.д.)</p>
              <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                <Select value={dissociationMediumId} onValueChange={setDissociationMediumId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите среду диссоциации..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allMediaOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Объём (мл)</Label>
                  <Input type="number" min={0} step="any" placeholder="мл"
                    value={dissociationVolume}
                    onChange={(e) => setDissociationVolume(e.target.value)} />
                </div>
              </div>
              {dissocOverflow && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Недостаточно в текущем флаконе (осталось {dissocOverflow.currentVol} мл).
                    Будет открыто <strong>{dissocOverflow.unitsNeeded}</strong> нов. ед.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Wash medium - required */}
            <div className="space-y-2">
              <Label>
                Среда промывки <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">Буфер для промывки клеток после диссоциации (PBS, HBSS и т.д.)</p>
              <div className="grid gap-3 md:grid-cols-[1fr_120px]">
                <Select value={washMediumId} onValueChange={setWashMediumId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите среду промывки..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allMediaOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Объём (мл)</Label>
                  <Input type="number" min={0} step="any" placeholder="мл"
                    value={washVolume}
                    onChange={(e) => setWashVolume(e.target.value)} />
                </div>
              </div>
              {washOverflow && (
                <Alert variant="destructive" className="mt-2">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Недостаточно в текущем флаконе (осталось {washOverflow.currentVol} мл).
                    Будет открыто <strong>{washOverflow.unitsNeeded}</strong> нов. ед.
                  </AlertDescription>
                </Alert>
              )}
            </div>

          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* STEP 3 — METRICS                                                   */}
      {/* ================================================================== */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Beaker className="h-5 w-5" />
              Метрики (после снятия клеток)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Введите результаты подсчёта клеток после диссоциации
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              {/* Concentration */}
              <div className="space-y-2">
                <Label htmlFor="concentration">
                  Концентрация (кл/мл) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="concentration"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Например: 500000"
                  value={concentration}
                  onChange={(e) => setConcentration(e.target.value)}
                />
              </div>

              {/* Volume */}
              <div className="space-y-2">
                <Label htmlFor="volume">
                  Объём суспензии (мл) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="volume"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="Например: 10"
                  value={volumeMl}
                  onChange={(e) => setVolumeMl(e.target.value)}
                />
              </div>

              {/* Viability */}
              <div className="space-y-2">
                <Label htmlFor="viability">
                  Жизнеспособность (%) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="viability"
                  type="number"
                  min={0}
                  max={100}
                  step="any"
                  placeholder="0 — 100"
                  value={viability}
                  onChange={(e) => setViability(e.target.value)}
                />
              </div>
            </div>

            {/* Auto-calculated total cells */}
            {concentrationNum > 0 && volumeNum > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Всего клеток: {totalCellsMillions.toFixed(2)} млн
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* STEP 4 — RESULT                                                    */}
      {/* ================================================================== */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Container selection card - matching culture creation pattern */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Контейнеры</span>
                <Badge variant="outline" className="text-base">
                  Всего: {totalNewContainers} шт.
                </Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Выберите типы контейнеров и количество. Можно добавить несколько типов.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {resultRows.map((row, index) => {
                const selectedBatch = containerStock.find(b => b.id === row.stockBatchId)
                const ct = selectedBatch?.nomenclature?.container_type
                const rowCount = parseInt(row.count, 10) || 0
                const rowOverflow = selectedBatch && rowCount > selectedBatch.quantity

                return (
                  <div key={row.id} className="border rounded-lg p-4 space-y-3 relative">
                    {/* Row header with remove button */}
                    {resultRows.length > 1 && (
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-muted-foreground">
                          Контейнер {index + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeResultRow(row.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Single stock-based dropdown + count */}
                    <div className="grid gap-3 md:grid-cols-[1fr_100px]">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Контейнер со склада *</Label>
                        <Select
                          value={row.stockBatchId}
                          onValueChange={(val) => {
                            const batch = containerStock.find(b => b.id === val)
                            updateResultRow(row.id, {
                              stockBatchId: val,
                              containerTypeId: batch?.nomenclature?.container_type?.id || '',
                            })
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите со склада..." />
                          </SelectTrigger>
                          <SelectContent>
                            {containerStockOptions.map((b) => {
                              const bct = b.nomenclature?.container_type
                              return (
                                <SelectItem key={b.id} value={b.id}>
                                  {bct?.name || b.nomenclature?.name || b.batch_number}
                                  {bct?.surface_area_cm2 ? ` (${bct.surface_area_cm2} см²)` : ''}
                                  {' — '}{b.quantity} шт.
                                  {b.expiration_date ? ` (до ${b.expiration_date})` : ''}
                                </SelectItem>
                              )
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Кол-во *</Label>
                        <Input
                          type="number"
                          min={1}
                          value={row.count}
                          onChange={(e) => updateResultRow(row.id, { count: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Stock info + write-off summary */}
                    {selectedBatch && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Списание: <strong className={rowOverflow ? 'text-destructive' : 'text-foreground'}>{rowCount}</strong> из {selectedBatch.quantity} шт.
                        </span>
                        {ct?.surface_area_cm2 && (
                          <span>• {ct.surface_area_cm2} см²</span>
                        )}
                        {rowOverflow && (
                          <span className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            Недостаточно
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add row button */}
              <Button type="button" variant="outline" size="sm" onClick={addResultRow} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Добавить тип контейнера
              </Button>
            </CardContent>
          </Card>

          {/* Totals + calculations */}
          {totalNewContainers > 0 && totalCellsMillions > 0 && (
            <Card>
              <CardContent className="pt-4 space-y-1.5">
                <div className="flex items-center gap-2 text-sm">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Всего контейнеров: <strong>{totalNewContainers}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Клеток на контейнер: <strong>{cellsPerContainer.toFixed(2)} млн</strong>
                  </span>
                </div>
                {totalSurfaceArea > 0 && (
                  <>
                    <div className="flex items-center gap-2 text-sm">
                      <Calculator className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Общая площадь: <strong>{totalSurfaceArea.toFixed(1)} см²</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calculator className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Плотность посева: <strong>{cellsPerCm2 >= 1000 ? `${(cellsPerCm2 / 1000).toFixed(1)} тыс./см²` : `${cellsPerCm2.toFixed(0)} кл/см²`}</strong>
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Incubator position */}
          <Card>
            <CardHeader>
              <CardTitle>
                Размещение (инкубатор) <span className="text-destructive">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PositionTreeSelect
                positions={positions}
                value={positionId}
                onValueChange={setPositionId}
                equipmentTypeFilter="INCUBATOR"
                placeholder="Выберите позицию..."
              />
            </CardContent>
          </Card>

          {/* Seed medium - with per-container option */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTubes className="h-5 w-5" />
                Питательная среда для посева <span className="text-destructive">*</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">Среда для ресуспензирования и посева в новые контейнеры</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode toggle */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="per-container-media"
                  checked={perContainerMediaMode}
                  onCheckedChange={(checked) => setPerContainerMediaMode(checked === true)}
                />
                <Label htmlFor="per-container-media" className="text-sm cursor-pointer">
                  Индивидуальная среда для каждого типа контейнера
                </Label>
              </div>

              {!perContainerMediaMode ? (
                /* Shared medium for all containers */
                <>
                  <div className="grid gap-4 md:grid-cols-[1fr_140px]">
                    <div className="space-y-2">
                      <Label>Готовая среда</Label>
                      <Select value={seedMediumId} onValueChange={setSeedMediumId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите среду..." />
                        </SelectTrigger>
                        <SelectContent>
                          {allMediaOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Объём / конт. (мл)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={seedVolume}
                        onChange={(e) => setSeedVolume(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {seedMediumId && seedVolumePerContainer > 0 && (
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-muted-foreground">
                        Итого: <strong>{totalSeedVolume.toFixed(1)} мл</strong> ({totalNewContainers} шт. × {seedVolumePerContainer} мл)
                      </span>
                      {seedMediumOverflow && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <AlertTriangle className="h-4 w-4" />
                          Превышает остаток ({seedMediumAvailable} мл)
                        </span>
                      )}
                      {seedBatchOverflow && (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <AlertTriangle className="h-4 w-4" />
                          Нехватка во флаконе (ост. {seedBatchOverflow.currentVol} мл), откроется {seedBatchOverflow.unitsNeeded} нов. ед.
                        </span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                /* Per container type media */
                <div className="space-y-3">
                  {resultRows.map((row) => {
                    const ct = filteredContainerTypes.find((t) => t.id === row.containerTypeId)
                    if (!ct) return null
                    const rowCount = parseInt(row.count, 10) || 0
                    const rowVol = parseFloat(perRowVolume[row.id] || '') || 0
                    const rowTotal = rowVol * rowCount
                    return (
                      <div key={row.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{ct.name}</Badge>
                          <span className="text-xs text-muted-foreground">× {rowCount}</span>
                          {ct.surface_area_cm2 && (
                            <span className="text-xs text-muted-foreground">({ct.surface_area_cm2} см²)</span>
                          )}
                        </div>
                        <div className="grid gap-2 md:grid-cols-[1fr_120px]">
                          <Select
                            value={perRowMedia[row.id] || ''}
                            onValueChange={(val) => setPerRowMedia(prev => ({ ...prev, [row.id]: val }))}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Выберите среду..." />
                            </SelectTrigger>
                            <SelectContent>
                              {allMediaOptions.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min={0}
                            step={0.5}
                            className="h-8 text-xs"
                            placeholder="мл / конт."
                            value={perRowVolume[row.id] || ''}
                            onChange={(e) => setPerRowVolume(prev => ({ ...prev, [row.id]: e.target.value }))}
                          />
                        </div>
                        {rowVol > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Итого: {rowTotal.toFixed(1)} мл ({rowCount} × {rowVol} мл)
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Additional components (serum, reagent, additive) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Дополнительные компоненты
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Сыворотка, реагенты, добавки — необязательно
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {additionalComponents.map((comp, idx) => (
                <div key={comp.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Компонент {idx + 1}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setAdditionalComponents(prev => prev.filter(c => c.id !== comp.id))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-[1fr_120px]">
                    <Select
                      value={comp.mediumId}
                      onValueChange={(val) => setAdditionalComponents(prev =>
                        prev.map(c => c.id === comp.id ? { ...c, mediumId: val } : c)
                      )}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Выберите компонент..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allMediaOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      className="h-8 text-xs"
                      placeholder="мл / конт."
                      value={comp.volumeMl}
                      onChange={(e) => setAdditionalComponents(prev =>
                        prev.map(c => c.id === comp.id ? { ...c, volumeMl: e.target.value } : c)
                      )}
                    />
                  </div>
                  {comp.volumeMl && parseFloat(comp.volumeMl) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Итого: {(parseFloat(comp.volumeMl) * totalNewContainers).toFixed(1)} мл ({totalNewContainers} × {comp.volumeMl} мл)
                    </p>
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setAdditionalComponents(prev => [...prev, { id: generateRowId(), mediumId: '', volumeMl: '' }])}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить компонент
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 5 — CONFIRMATION                                              */}
      {/* ================================================================== */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Подтверждение</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Source */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Источник
                </h3>
                <p>
                  <span className="text-muted-foreground">Лот:</span>{' '}
                  {selectedLot?.lot_number ?? '—'} (P{selectedLot?.passage_number ?? 0})
                </p>
                <p>
                  <span className="text-muted-foreground">Культура:</span>{' '}
                  {selectedLot?.culture?.name ?? '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Контейнеров:</span>{' '}
                  {selectedContainerIds.size}
                </p>
                <p>
                  <span className="text-muted-foreground">Режим:</span>{' '}
                  <Badge variant={splitMode === 'full' ? 'default' : 'secondary'} className="ml-1">
                    {splitMode}
                  </Badge>
                </p>
              </div>

              {/* Result */}
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Результат
                </h3>
                <p>
                  <span className="text-muted-foreground">Новый пассаж:</span> P
                  {(selectedLot?.passage_number ?? 0) + 1}
                </p>
                <div>
                  <span className="text-muted-foreground">Новых контейнеров:</span>
                  <ul className="ml-4 mt-1 list-disc text-sm space-y-0.5">
                    {resultRows.map((row) => {
                      const batch = containerStock.find(b => b.id === row.stockBatchId)
                      const ctName = batch?.nomenclature?.container_type?.name ?? '—'
                      return (
                        <li key={row.id}>
                          {parseInt(row.count, 10) || 0} &times; {ctName}
                        </li>
                      )
                    })}
                  </ul>
                </div>
                <p>
                  <span className="text-muted-foreground">Всего контейнеров:</span>{' '}
                  {totalNewContainers}
                </p>
                <p>
                  <span className="text-muted-foreground">Всего клеток:</span>{' '}
                  {totalCellsMillions.toFixed(2)} млн
                </p>
                <p>
                  <span className="text-muted-foreground">Клеток/контейнер:</span>{' '}
                  {cellsPerContainer.toFixed(2)} млн
                </p>
              </div>
            </div>

            {/* Media summary */}
            <div className="p-4 bg-muted rounded-lg space-y-1">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">
                Среды
              </h3>
              <p className="text-sm">
                <span className="text-muted-foreground">Диссоциация:</span>{' '}
                {getMediumLabel(dissociationMediumId)}
                {dissociationVolume && <span className="ml-1 text-muted-foreground">({dissociationVolume} мл)</span>}
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Промывка:</span>{' '}
                {getMediumLabel(washMediumId)}
                {washVolume && <span className="ml-1 text-muted-foreground">({washVolume} мл)</span>}
              </p>
              {seedMediumId && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Питательная:</span>{' '}
                  {getMediumLabel(seedMediumId)}
                  {seedVolume && <span className="ml-1 text-muted-foreground">({seedVolume} мл)</span>}
                </p>
              )}
            </div>

            {/* Metrics */}
            <div className="p-4 bg-muted rounded-lg space-y-1">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">
                Метрики
              </h3>
              <p className="text-sm">
                <span className="text-muted-foreground">Концентрация:</span>{' '}
                {concentrationNum.toLocaleString()} кл/мл
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Объём:</span> {volumeNum} мл
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Жизнеспособность:</span> {viabilityNum}%
              </p>
            </div>

            {/* Info */}
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                После подтверждения исходные контейнеры будут списаны, а в новом лоте P
                {(selectedLot?.passage_number ?? 0) + 1} будет создано {totalNewContainers}{' '}
                контейнер(ов).
              </AlertDescription>
            </Alert>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Дополнительные заметки..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* NAVIGATION                                                         */}
      {/* ================================================================== */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={step === 1 ? () => router.back() : () => setStep((s) => s - 1)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 1 ? 'Отмена' : 'Назад'}
        </Button>

        {step < 5 ? (
          <Button
            onClick={() => setStep((s) => Math.min(5, s + 1))}
            disabled={!canProceed(step)}
          >
            Далее
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4 mr-2" />
            )}
            {submitting ? 'Выполняется...' : 'Выполнить пассаж'}
          </Button>
        )}
      </div>
    </div>
  )
}

export default function PassagePage() {
  return (
    <Suspense fallback={<div className="container py-6 text-center text-muted-foreground">Загрузка...</div>}>
      <PassagePageInner />
    </Suspense>
  )
}
