"use client"

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  FlaskConical,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  Loader2,
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
  getPositions,
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
  confluent_percent?: number
  passage_number?: number
  position?: { id: string; path: string } | null
}

interface ContainerTypeItem {
  id: string
  name: string
  is_cryo?: boolean
  is_active?: boolean
}

interface ReadyMediumItem {
  id: string
  code: string
  name?: string
  current_volume_ml?: number
  expiration_date?: string
}

interface PositionItem {
  id: string
  path: string
  is_active?: boolean
}

// ---------------------------------------------------------------------------
// Step labels
// ---------------------------------------------------------------------------

const STEPS = [
  'Источник',
  'Метрики',
  'Среды и результат',
  'Подтверждение',
] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PassagePage() {
  const router = useRouter()

  // --- wizard state ---
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // --- reference data ---
  const [lots, setLots] = useState<LotItem[]>([])
  const [containers, setContainers] = useState<ContainerItem[]>([])
  const [containerTypes, setContainerTypes] = useState<ContainerTypeItem[]>([])
  const [readyMedia, setReadyMedia] = useState<ReadyMediumItem[]>([])
  const [positions, setPositions] = useState<PositionItem[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // --- Step 1: source ---
  const [selectedLotId, setSelectedLotId] = useState<string>('')
  const [selectedContainerIds, setSelectedContainerIds] = useState<Set<string>>(new Set())

  // --- Step 2: metrics (per passage, NOT per container) ---
  const [concentration, setConcentration] = useState<string>('')
  const [volumeMl, setVolumeMl] = useState<string>('')
  const [viability, setViability] = useState<string>('')

  // --- Step 3: media & result ---
  const [newContainerTypeId, setNewContainerTypeId] = useState<string>('')
  const [newContainerCount, setNewContainerCount] = useState<string>('1')
  const [dissociationMediumId, setDissociationMediumId] = useState<string>('')
  const [washMediumId, setWashMediumId] = useState<string>('')
  const [positionId, setPositionId] = useState<string>('')

  // --- Step 4: confirmation ---
  const [notes, setNotes] = useState('')

  // =========================================================================
  // Load reference data
  // =========================================================================

  useEffect(() => {
    ;(async () => {
      try {
        const [lotsData, typesData, mediaData, posData] = await Promise.all([
          getLots({ status: 'ACTIVE' }),
          getContainerTypes(),
          getAvailableMediaForFeed(),
          getPositions(),
        ])
        setLots((lotsData as LotItem[]) || [])
        setContainerTypes((typesData as ContainerTypeItem[]) || [])
        setReadyMedia((mediaData as ReadyMediumItem[]) || [])
        setPositions((posData as PositionItem[]) || [])
      } catch (err) {
        console.error('Error loading reference data:', err)
        toast.error('Ошибка загрузки справочных данных')
      } finally {
        setLoadingData(false)
      }
    })()
  }, [])

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
        setSelectedContainerIds(new Set())
      } catch (err) {
        console.error('Error loading containers:', err)
        toast.error('Ошибка загрузки контейнеров')
      }
    })()
  }, [selectedLotId])

  // =========================================================================
  // Derived values
  // =========================================================================

  const selectedLot = useMemo(
    () => lots.find((l) => l.id === selectedLotId) ?? null,
    [lots, selectedLotId],
  )

  const activeContainers = useMemo(
    () => containers.filter((c) => c.status === 'IN_CULTURE' || c.status === 'ACTIVE'),
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
    () => containerTypes.filter((t) => !t.is_cryo),
    [containerTypes],
  )

  const selectedContainerType = useMemo(
    () => filteredContainerTypes.find((t) => t.id === newContainerTypeId) ?? null,
    [filteredContainerTypes, newContainerTypeId],
  )

  // =========================================================================
  // Step validation
  // =========================================================================

  const canProceedStep1 = selectedLotId !== '' && selectedContainerIds.size > 0
  const canProceedStep2 =
    concentrationNum > 0 && volumeNum > 0 && viabilityNum > 0 && viabilityNum <= 100
  const canProceedStep3 = newContainerTypeId !== '' && newContainerCountNum >= 1

  function canProceed(s: number): boolean {
    if (s === 1) return canProceedStep1
    if (s === 2) return canProceedStep2
    if (s === 3) return canProceedStep3
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

      await createOperationPassage({
        source_lot_id: selectedLotId,
        source_containers: sourceContainers,
        metrics: {
          concentration: concentrationNum,
          volume_ml: volumeNum,
          viability_percent: viabilityNum,
        },
        media: {
          dissociation_rm_id: dissociationMediumId || undefined,
          wash_rm_id: washMediumId || undefined,
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
      router.push('/operations')
    } catch (err: unknown) {
      console.error('Passage error:', err)
      toast.error('Ошибка при выполнении пассажа')
    } finally {
      setSubmitting(false)
    }
  }

  // =========================================================================
  // Render helpers
  // =========================================================================

  if (loadingData) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // =========================================================================
  // RENDER
  // =========================================================================

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
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const stepNum = i + 1
          const isCompleted = step > stepNum
          const isCurrent = step === stepNum
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${
                  isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={`text-sm whitespace-nowrap ${
                  isCurrent || isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="w-6 h-0.5 bg-border shrink-0" />}
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
              <Select value={selectedLotId} onValueChange={setSelectedLotId}>
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
                              {c.status}
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
      {/* STEP 2 — METRICS                                                   */}
      {/* ================================================================== */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Метрики пассажа</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {/* Concentration */}
              <div className="space-y-2">
                <Label htmlFor="concentration">
                  Концентрация (клеток/мл) <span className="text-destructive">*</span>
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
      {/* STEP 3 — MEDIA & RESULT                                            */}
      {/* ================================================================== */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Среды и результат</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* --- Result section --- */}
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
                    {filteredContainerTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* New containers count */}
              <div className="space-y-2">
                <Label htmlFor="cnt-count">
                  Количество новых контейнеров <span className="text-destructive">*</span>
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

            {/* Cells per container */}
            {totalCellsMillions > 0 && newContainerCountNum > 0 && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Клеток на контейнер: {cellsPerContainer.toFixed(2)} млн
                </span>
              </div>
            )}

            <Separator />

            {/* --- Media section --- */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Dissociation medium */}
              <div className="space-y-2">
                <Label>Среда диссоциации (опционально)</Label>
                <Select value={dissociationMediumId} onValueChange={setDissociationMediumId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Не выбрано" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Не выбрано</SelectItem>
                    {readyMedia.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.code}
                        {m.name ? ` — ${m.name}` : ''}
                        {m.current_volume_ml != null ? ` (${m.current_volume_ml} мл)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Wash medium */}
              <div className="space-y-2">
                <Label>Среда промывки (опционально)</Label>
                <Select value={washMediumId} onValueChange={setWashMediumId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Не выбрано" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Не выбрано</SelectItem>
                    {readyMedia.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.code}
                        {m.name ? ` — ${m.name}` : ''}
                        {m.current_volume_ml != null ? ` (${m.current_volume_ml} мл)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Position for new containers */}
            <div className="space-y-2">
              <Label>Позиция для новых контейнеров (опционально)</Label>
              <Select value={positionId} onValueChange={setPositionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Авторазмещение" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Авторазмещение</SelectItem>
                  {positions
                    .filter((p) => p.is_active !== false)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.path}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* STEP 4 — CONFIRMATION                                              */}
      {/* ================================================================== */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Подтверждение</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary grid */}
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
                  {newContainerCountNum} x {selectedContainerType?.name ?? '—'}
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

            {/* Metrics summary */}
            <div className="p-4 bg-muted rounded-lg space-y-1">
              <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide mb-2">
                Метрики
              </h3>
              <p>
                <span className="text-muted-foreground">Концентрация:</span>{' '}
                {concentrationNum.toLocaleString()} клеток/мл
              </p>
              <p>
                <span className="text-muted-foreground">Объём суспензии:</span> {volumeNum} мл
              </p>
              <p>
                <span className="text-muted-foreground">Жизнеспособность:</span> {viabilityNum}%
              </p>
            </div>

            {/* Info alert */}
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

        {step < 4 ? (
          <Button
            onClick={() => setStep((s) => Math.min(4, s + 1))}
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
