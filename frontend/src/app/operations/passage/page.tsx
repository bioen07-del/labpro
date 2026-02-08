"use client"

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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
} from 'lucide-react'
import { toast } from 'sonner'
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
  container_type?: { name: string; surface_area_cm2?: number } | null
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

  // --- Step 3: metrics (per passage) ---
  const [concentration, setConcentration] = useState<string>('')
  const [volumeMl, setVolumeMl] = useState<string>('')
  const [viability, setViability] = useState<string>('')

  // --- Step 4: result ---
  const [newContainerTypeId, setNewContainerTypeId] = useState<string>('')
  const [newContainerCount, setNewContainerCount] = useState<string>('1')
  const [positionId, setPositionId] = useState<string>('')

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
  const newContainerCountNum = parseInt(newContainerCount, 10) || 0
  const cellsPerContainer =
    newContainerCountNum > 0 ? totalCellsMillions / newContainerCountNum : 0

  // Non-cryo container types
  const filteredContainerTypes = useMemo(
    () => containerTypes.filter((t) => !t.is_cryo && t.is_active !== false),
    [containerTypes],
  )

  const selectedContainerType = useMemo(
    () => filteredContainerTypes.find((t) => t.id === newContainerTypeId) ?? null,
    [filteredContainerTypes, newContainerTypeId],
  )

  // Cells per cm2
  const cellsPerCm2 = selectedContainerType?.surface_area_cm2 && cellsPerContainer > 0
    ? (cellsPerContainer * 1_000_000) / selectedContainerType.surface_area_cm2
    : 0

  // Stock per container type
  const getStockForType = (typeId: string): number => {
    return containerStock
      .filter((b) => b.nomenclature?.container_type_id === typeId)
      .reduce((sum, b) => sum + (b.quantity || 0), 0)
  }

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
      options.push({
        id: `batch:${b.id}`,
        label: `${nom.name || b.batch_number} (${b.quantity} ${nom.category === 'MEDIUM' ? 'мл' : 'шт.'})${b.expiration_date ? ` до ${b.expiration_date}` : ''}`,
        type: 'batch',
        category: nom.category || undefined,
      })
    }

    return options
  }, [readyMedia, reagentBatches])

  // Filter incubator positions
  const incubatorPositions = useMemo(
    () => positions.filter((p) => p.is_active !== false),
    [positions],
  )

  // =========================================================================
  // Step validation
  // =========================================================================

  const canProceedStep1 = selectedLotId !== '' && selectedContainerIds.size > 0
  const canProceedStep2 = dissociationMediumId !== '' && washMediumId !== ''
  const canProceedStep3 =
    concentrationNum > 0 && volumeNum > 0 && viabilityNum > 0 && viabilityNum <= 100
  const canProceedStep4 = newContainerTypeId !== '' && newContainerCountNum >= 1 && positionId !== '' && seedMediumId !== ''

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
          wash_rm_id: wash?.type === 'ready_medium' ? wash.id : undefined,
          wash_batch_id: wash?.type === 'batch' ? wash.id : undefined,
          seed_rm_id: seed?.type === 'ready_medium' ? seed.id : undefined,
          seed_batch_id: seed?.type === 'batch' ? seed.id : undefined,
        },
        result: {
          container_type_id: newContainerTypeId,
          target_count: newContainerCountNum,
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
        <Button variant="ghost" size="icon" asChild>
          <Link href="/operations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
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
                          {c.confluent_percent !== undefined && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Конфлюэнтность: {c.confluent_percent}%
                            </p>
                          )}
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
            </div>

            {/* Wash medium - required */}
            <div className="space-y-2">
              <Label>
                Среда промывки <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">Буфер для промывки клеток после диссоциации (PBS, HBSS и т.д.)</p>
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
        <Card>
          <CardHeader>
            <CardTitle>Результат пассажа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Выберите тип и количество новых контейнеров для посева
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Container type */}
              <div className="space-y-2">
                <Label>
                  Тип контейнера <span className="text-destructive">*</span>
                </Label>
                <Select value={newContainerTypeId} onValueChange={setNewContainerTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredContainerTypes.map((t) => {
                      const stock = getStockForType(t.id)
                      return (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-2">
                            {t.name}
                            {t.surface_area_cm2 ? ` (${t.surface_area_cm2} см²)` : ''}
                            {stock > 0 ? (
                              <Badge variant="secondary" className="ml-1 text-xs">
                                {stock} шт.
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="ml-1 text-xs text-muted-foreground">
                                нет
                              </Badge>
                            )}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* New containers count */}
              <div className="space-y-2">
                <Label htmlFor="cnt-count">
                  Количество <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="cnt-count"
                  type="number"
                  min={1}
                  value={newContainerCount}
                  onChange={(e) => setNewContainerCount(e.target.value)}
                />
              </div>
            </div>

            {/* Container type info */}
            {selectedContainerType && (
              <div className="grid gap-2 md:grid-cols-3 text-sm p-3 bg-muted rounded-lg">
                {selectedContainerType.surface_area_cm2 && (
                  <div>
                    <span className="text-muted-foreground">Площадь:</span>{' '}
                    <strong>{selectedContainerType.surface_area_cm2} см²</strong>
                  </div>
                )}
                {selectedContainerType.volume_ml && (
                  <div>
                    <span className="text-muted-foreground">Рабочий объём:</span>{' '}
                    <strong>{selectedContainerType.volume_ml} мл</strong>
                  </div>
                )}
                {selectedContainerType.optimal_confluent && (
                  <div>
                    <span className="text-muted-foreground">Оптим. конфлюэнтн.:</span>{' '}
                    <strong>{selectedContainerType.optimal_confluent}%</strong>
                  </div>
                )}
              </div>
            )}

            {/* Cells per container + density */}
            {totalCellsMillions > 0 && newContainerCountNum > 0 && (
              <div className="space-y-1 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Клеток на контейнер: <strong>{cellsPerContainer.toFixed(2)} млн</strong>
                  </span>
                </div>
                {cellsPerCm2 > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Плотность посева: <strong>{Math.round(cellsPerCm2).toLocaleString()} кл/см²</strong>
                    </span>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Position - REQUIRED (incubator) */}
            <div className="space-y-2">
              <Label>
                Размещение (инкубатор) <span className="text-destructive">*</span>
              </Label>
              <Select value={positionId} onValueChange={setPositionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите позицию..." />
                </SelectTrigger>
                <SelectContent>
                  {incubatorPositions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.path}{p.equipment?.name ? ` (${p.equipment.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Seed medium - REQUIRED */}
            <div className="space-y-2">
              <Label>
                Питательная среда для посева <span className="text-destructive">*</span>
              </Label>
              <p className="text-xs text-muted-foreground">Среда для ресуспензирования и посева в новые контейнеры</p>
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
          </CardContent>
        </Card>
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
                <p>
                  <span className="text-muted-foreground">Новых контейнеров:</span>{' '}
                  {newContainerCountNum} × {selectedContainerType?.name ?? '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Всего клеток:</span>{' '}
                  {totalCellsMillions.toFixed(2)} млн
                </p>
                <p>
                  <span className="text-muted-foreground">Клеток/контейнер:</span>{' '}
                  {cellsPerContainer.toFixed(2)} млн
                </p>
                {cellsPerCm2 > 0 && (
                  <p>
                    <span className="text-muted-foreground">Плотность:</span>{' '}
                    {Math.round(cellsPerCm2).toLocaleString()} кл/см²
                  </p>
                )}
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
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Промывка:</span>{' '}
                {getMediumLabel(washMediumId)}
              </p>
              {seedMediumId && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Питательная:</span>{' '}
                  {getMediumLabel(seedMediumId)}
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
                {(selectedLot?.passage_number ?? 0) + 1} будет создано {newContainerCountNum}{' '}
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
          onClick={() => setStep((s) => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
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
