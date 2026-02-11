"use client"

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  ThermometerSnowflake,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Snowflake,
  MapPin,
  Scissors,
  TestTubes,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'

import { PositionTreeSelect } from '@/components/position-tree-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  getLots,
  getContainersByLot,
  getAvailableMediaByUsage,
  buildMediaOptions,
  parseMediumId,
  getPositions,
  getBanks,
  getBatches,
  createOperationFreeze,
} from '@/lib/api'
import type { Batch } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepDef {
  label: string
  shortLabel: string
}

const STEPS: StepDef[] = [
  { label: 'Источник', shortLabel: 'Источник' },
  { label: 'Снятие клеток', shortLabel: 'Снятие' },
  { label: 'Криовиалы', shortLabel: 'Виалы' },
  { label: 'Заморозка', shortLabel: 'Заморозка' },
  { label: 'Подтверждение', shortLabel: 'Итого' },
]

const FREEZING_METHODS = [
  { value: 'PROGRAMMED', label: 'Программное замораживание' },
  { value: 'MANUAL_80', label: 'Ручное (-80 \u00B0C)' },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU')
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '---'
  try {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return String(dateStr)
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function FreezePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // --- wizard step (1-based) ---
  const [step, setStep] = useState(1)

  // --- reference data ---
  const [lots, setLots] = useState<any[]>([])
  const [containers, setContainers] = useState<any[]>([])
  const [dissociationOptions, setDissociationOptions] = useState<{ id: string; label: string; type: 'ready_medium' | 'batch'; category?: string }[]>([])
  const [washOptions, setWashOptions] = useState<{ id: string; label: string; type: 'ready_medium' | 'batch'; category?: string }[]>([])
  const [freezingOptions, setFreezingOptions] = useState<{ id: string; label: string; type: 'ready_medium' | 'batch'; category?: string }[]>([])
  const [positions, setPositions] = useState<any[]>([])

  // --- loading flags ---
  const [initialLoading, setInitialLoading] = useState(true)
  const [containersLoading, setContainersLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // --- Step 1: Source ---
  const [selectedLotId, setSelectedLotId] = useState('')
  const [selectedContainerIds, setSelectedContainerIds] = useState<string[]>([])

  // --- Step 2: Cell detachment (как при пассаже) ---
  const [dissociationMediumId, setDissociationMediumId] = useState('')
  const [dissociationVolume, setDissociationVolume] = useState('')
  const [washMediumId, setWashMediumId] = useState('')
  const [washVolume, setWashVolume] = useState('')
  // Metrics after cell counting
  const [concentration, setConcentration] = useState('')
  const [totalVolume, setTotalVolume] = useState('')
  const [viability, setViability] = useState('')

  // --- Step 3: Cryovials ---
  const [cryoBatches, setCryoBatches] = useState<Batch[]>([])
  const [cryoBatchId, setCryoBatchId] = useState('')
  const [volumePerVial, setVolumePerVial] = useState('')  // номинальный объём пробирки (авто из партии)
  const [cryoVialCount, setCryoVialCount] = useState('')
  const [useIndividualVolume, setUseIndividualVolume] = useState(false)
  const [workingVolume, setWorkingVolume] = useState('')  // единый рабочий объём
  const [individualVolumes, setIndividualVolumes] = useState<string[]>([])  // индивидуальные объёмы

  // --- Step 4: Freezing ---
  const [freezingMediumId, setFreezingMediumId] = useState('')
  const [freezingMediumVolume, setFreezingMediumVolume] = useState('')
  const [freezingMethod, setFreezingMethod] = useState('')
  const [positionId, setPositionId] = useState('')

  // --- Bank type (auto-determined) ---
  const [bankType, setBankType] = useState<'MCB' | 'WCB' | null>(null)
  const [bankTypeLoading, setBankTypeLoading] = useState(false)

  // --- Step 5: Notes ---
  const [notes, setNotes] = useState('')

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  const selectedLot = useMemo(
    () => lots.find((l: any) => l.id === selectedLotId),
    [lots, selectedLotId],
  )

  const selectedPosition = useMemo(
    () => positions.find((p: any) => p.id === positionId),
    [positions, positionId],
  )

  const selectedCryoBatch = useMemo(
    () => cryoBatches.find((b) => b.id === cryoBatchId),
    [cryoBatches, cryoBatchId],
  )

  // Auto-calculated cell metrics
  const totalCells = useMemo(() => {
    const conc = Number(concentration)
    const vol = Number(totalVolume)
    if (conc > 0 && vol > 0) return conc * vol
    return 0
  }, [concentration, totalVolume])

  const cellsPerVial = useMemo(() => {
    const count = Number(cryoVialCount)
    if (totalCells > 0 && count > 0) return Math.round(totalCells / count)
    return 0
  }, [totalCells, cryoVialCount])

  // Эффективный рабочий объём: берём рабочий объём если задан, иначе номинальный
  const effectiveVolumePerVial = useMemo(() => {
    if (useIndividualVolume) {
      // Средний объём из индивидуальных (для расчёта cellsPerMl)
      const filled = individualVolumes.filter(v => Number(v) > 0)
      if (filled.length > 0) return filled.reduce((s, v) => s + Number(v), 0) / filled.length
      return Number(volumePerVial) || 0
    }
    return Number(workingVolume) || Number(volumePerVial) || 0
  }, [useIndividualVolume, workingVolume, individualVolumes, volumePerVial])

  const cellsPerMl = useMemo(() => {
    if (cellsPerVial > 0 && effectiveVolumePerVial > 0) return Math.round(cellsPerVial / effectiveVolumePerVial)
    return 0
  }, [cellsPerVial, effectiveVolumePerVial])

  // ---------------------------------------------------------------------------
  // Initial data load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const load = async () => {
      try {
        const [lotsData, dissResult, washResult, freezeResult, positionsData, cryoBatchesData] = await Promise.all([
          getLots({ status: 'ACTIVE' }),
          getAvailableMediaByUsage('DISSOCIATION'),
          getAvailableMediaByUsage('WASH'),
          getAvailableMediaByUsage('FREEZING'),
          getPositions({ is_active: true }),
          getBatches({ status: 'AVAILABLE', category: 'CONSUMABLE', usage_tag: 'FREEZING' }),
        ])
        setLots(lotsData || [])
        setDissociationOptions(buildMediaOptions(dissResult.readyMedia, dissResult.reagentBatches))
        setWashOptions(buildMediaOptions(washResult.readyMedia, washResult.reagentBatches))
        setFreezingOptions(buildMediaOptions(freezeResult.readyMedia, freezeResult.reagentBatches))
        setPositions(positionsData || [])
        setCryoBatches(cryoBatchesData || [])

        // Auto-bind from URL params
        const paramLotId = searchParams.get('lot_id')
        if (paramLotId) {
          setSelectedLotId(paramLotId)
          setContainersLoading(true)
          try {
            const data = await getContainersByLot(paramLotId)
            setContainers(data || [])
          } catch (err) {
            console.error('Error loading containers from URL param:', err)
          } finally {
            setContainersLoading(false)
          }
        }
      } catch (error) {
        console.error('Error loading initial data:', error)
        toast.error('Ошибка загрузки данных')
      } finally {
        setInitialLoading(false)
      }
    }
    load()
  }, [searchParams])

  // ---------------------------------------------------------------------------
  // Load containers when lot changes
  // ---------------------------------------------------------------------------

  const loadContainers = useCallback(async (lotId: string) => {
    setContainersLoading(true)
    try {
      const data = await getContainersByLot(lotId)
      setContainers(data || [])
      setSelectedContainerIds([])
    } catch (error) {
      console.error('Error loading containers:', error)
      toast.error('Ошибка загрузки контейнеров')
      setContainers([])
    } finally {
      setContainersLoading(false)
    }
  }, [])

  const handleLotChange = (lotId: string) => {
    setSelectedLotId(lotId)
    setSelectedContainerIds([])
    setBankType(null)
    loadContainers(lotId)
  }

  // ---------------------------------------------------------------------------
  // Determine MCB / WCB when lot is selected and user proceeds from step 1
  // ---------------------------------------------------------------------------

  const determineBankType = useCallback(async () => {
    if (!selectedLot) return
    const cultureId = selectedLot.culture_id || selectedLot.culture?.id
    if (!cultureId) return

    setBankTypeLoading(true)
    try {
      const existingBanks = await getBanks({ culture_id: cultureId })
      setBankType(existingBanks && existingBanks.length > 0 ? 'WCB' : 'MCB')
    } catch (error) {
      console.error('Error determining bank type:', error)
      setBankType('MCB')
    } finally {
      setBankTypeLoading(false)
    }
  }, [selectedLot])

  // ---------------------------------------------------------------------------
  // Container selection helpers
  // ---------------------------------------------------------------------------

  const activeContainers = useMemo(
    () => containers.filter((c: any) => {
      const st = c.container_status || c.status
      return st !== 'DISPOSE' && st !== 'USED'
    }),
    [containers],
  )

  const toggleContainer = (id: string) => {
    setSelectedContainerIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id],
    )
  }

  const toggleAll = () => {
    if (selectedContainerIds.length === activeContainers.length) {
      setSelectedContainerIds([])
    } else {
      setSelectedContainerIds(activeContainers.map((c: any) => c.id))
    }
  }

  // ---------------------------------------------------------------------------
  // Step validation
  // ---------------------------------------------------------------------------

  const isStep1Valid =
    selectedLotId !== '' && selectedContainerIds.length > 0

  const isStep2Valid =
    concentration !== '' &&
    Number(concentration) > 0 &&
    totalVolume !== '' &&
    Number(totalVolume) > 0 &&
    viability !== '' &&
    Number(viability) >= 0 &&
    Number(viability) <= 100

  const isStep3Valid =
    (volumePerVial !== '' || workingVolume !== '') &&
    effectiveVolumePerVial > 0 &&
    cryoVialCount !== '' &&
    Number(cryoVialCount) >= 1

  const isStep4Valid =
    freezingMediumId !== '' &&
    freezingMethod !== '' &&
    positionId !== ''

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return isStep1Valid
      case 2:
        return isStep2Valid
      case 3:
        return isStep3Valid
      case 4:
        return isStep4Valid
      default:
        return true
    }
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  const goNext = () => {
    if (step === 1 && bankType === null) {
      determineBankType()
    }
    setStep((s) => Math.min(5, s + 1))
  }

  const goBack = () => setStep((s) => Math.max(1, s - 1))

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      // Parse combined medium IDs
      const parsedFreezing = parseMediumId(freezingMediumId)
      const parsedDissociation = dissociationMediumId ? parseMediumId(dissociationMediumId) : null
      const parsedWash = washMediumId ? parseMediumId(washMediumId) : null

      const result = await createOperationFreeze({
        lot_id: selectedLotId,
        container_ids: selectedContainerIds,
        cryo_vial_count: Number(cryoVialCount),
        freezer_position_id: positionId,
        cells_per_vial: cellsPerVial,
        total_cells: totalCells,
        freezing_medium: parsedFreezing?.type === 'ready_medium' ? parsedFreezing.id : undefined,
        freezing_medium_batch_id: parsedFreezing?.type === 'batch' ? parsedFreezing.id : undefined,
        freezing_medium_volume_ml: freezingMediumVolume ? Number(freezingMediumVolume) : undefined,
        dissociation_medium_id: parsedDissociation?.type === 'ready_medium' ? parsedDissociation.id : undefined,
        dissociation_batch_id: parsedDissociation?.type === 'batch' ? parsedDissociation.id : undefined,
        dissociation_volume_ml: dissociationVolume ? Number(dissociationVolume) : undefined,
        wash_medium_id: parsedWash?.type === 'ready_medium' ? parsedWash.id : undefined,
        wash_batch_id: parsedWash?.type === 'batch' ? parsedWash.id : undefined,
        wash_volume_ml: washVolume ? Number(washVolume) : undefined,
        cryo_batch_id: cryoBatchId || undefined,
        viability_percent: Number(viability),
        concentration: Number(concentration),
        notes: notes || undefined,
      })

      toast.success('Заморозка выполнена', {
        description: `Банк ${result.bankType} создан. Криовиалов: ${Number(cryoVialCount)}`,
      })

      // Return to culture card
      const cultureId = selectedLot?.culture_id || selectedLot?.culture?.id
      if (cultureId) {
        router.push(`/cultures/${cultureId}`)
      } else {
        router.push(`/lots/${selectedLotId}`)
      }
    } catch (error: any) {
      console.error('Error creating freeze operation:', error)
      toast.error('Ошибка выполнения заморозки', {
        description: error?.message || 'Попробуйте ещё раз',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render: loading state
  // ---------------------------------------------------------------------------

  if (initialLoading) {
    return (
      <div className="container py-6">
        <Card className="max-w-3xl mx-auto">
          <CardContent className="pt-6 text-center">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Загрузка данных...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="container py-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Snowflake className="h-7 w-7" />
            Заморозка культуры
          </h1>
          <p className="text-muted-foreground">
            Создание клеточного банка (MCB / WCB) и криовиалов
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {STEPS.map((s, i) => {
          const stepNum = i + 1
          const isCompleted = step > stepNum
          const isCurrent = step === stepNum
          return (
            <div key={i} className="flex items-center gap-1 shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
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
                  isCurrent ? 'font-medium' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="w-6 h-0.5 bg-border mx-1" />
              )}
            </div>
          )
        })}
      </div>

      {/* ================================================================== */}
      {/* STEP 1 : SOURCE                                                    */}
      {/* ================================================================== */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Шаг 1. Источник</CardTitle>
            <CardDescription>
              Выберите лот и контейнеры для заморозки
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Lot selection */}
            <div className="space-y-2">
              <Label htmlFor="lot">Лот</Label>
              <Select value={selectedLotId} onValueChange={handleLotChange} disabled={!!searchParams.get('lot_id')}>
                <SelectTrigger id="lot">
                  <SelectValue placeholder="Выберите лот..." />
                </SelectTrigger>
                <SelectContent>
                  {lots.map((lot: any) => (
                    <SelectItem key={lot.id} value={lot.id}>
                      {lot.lot_number} &mdash;{' '}
                      {lot.culture?.name ||
                        lot.culture?.culture_type?.name ||
                        'Культура'}
                      {lot.passage_number != null && ` (P${lot.passage_number})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Lot info */}
            {selectedLot && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 bg-muted/40">
                <Badge variant="secondary">
                  {selectedLot.culture?.name || selectedLot.culture?.culture_type?.name || '---'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Пассаж: <span className="font-medium text-foreground">P{selectedLot.passage_number ?? '?'}</span>
                </span>
                {/* Bank type badge */}
                {bankType && (
                  <Badge className={bankType === 'MCB' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}>
                    {bankType}
                  </Badge>
                )}
              </div>
            )}

            {/* Container list */}
            {selectedLotId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    Контейнеры
                    {activeContainers.length > 0 && (
                      <span className="text-muted-foreground font-normal ml-1">
                        ({selectedContainerIds.length} / {activeContainers.length})
                      </span>
                    )}
                  </Label>
                  {activeContainers.length > 1 && (
                    <Button variant="outline" size="sm" onClick={toggleAll}>
                      {selectedContainerIds.length === activeContainers.length
                        ? 'Снять все'
                        : 'Выбрать все'}
                    </Button>
                  )}
                </div>

                {containersLoading ? (
                  <div className="text-center py-6 text-muted-foreground border rounded-lg">
                    <RefreshCw className="h-5 w-5 mx-auto animate-spin mb-2" />
                    <p className="text-sm">Загрузка контейнеров...</p>
                  </div>
                ) : activeContainers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p>Нет активных контейнеров в выбранном лоте</p>
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-72 overflow-y-auto border rounded-lg p-2">
                    {activeContainers.map((container: any) => {
                      const isSelected = selectedContainerIds.includes(container.id)
                      return (
                        <div
                          key={container.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleContainer(container.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleContainer(container.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">{container.code}</Badge>
                              <Badge variant="secondary" className="text-xs">
                                {container.container_type?.name || container.type?.name || 'Контейнер'}
                              </Badge>
                            </div>
                          </div>
                          {container.confluent_percent != null && (
                            <div className="text-sm text-right whitespace-nowrap">
                              <span className="text-muted-foreground">Конф.&nbsp;</span>
                              <span
                                className={
                                  container.confluent_percent >= 90
                                    ? 'text-green-600 font-medium'
                                    : container.confluent_percent >= 70
                                      ? 'text-orange-600 font-medium'
                                      : ''
                                }
                              >
                                {container.confluent_percent}%
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* STEP 2 : CELL DETACHMENT (снятие клеток, как при пассаже)         */}
      {/* ================================================================== */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Шаг 2. Снятие клеток
            </CardTitle>
            <CardDescription>
              Среды для снятия клеток и результаты подсчёта
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bank type auto-determined */}
            {bankType && (
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50">
                <span className="text-sm text-muted-foreground">Тип банка:</span>
                <Badge className={`text-base px-3 py-0.5 ${bankType === 'MCB' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' : 'bg-purple-100 text-purple-800 hover:bg-purple-100'}`}>
                  {bankType === 'MCB' ? 'MCB (Master Cell Bank)' : 'WCB (Working Cell Bank)'}
                </Badge>
              </div>
            )}
            {bankTypeLoading && (
              <div className="flex items-center gap-2 text-muted-foreground p-3 rounded-lg border">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span className="text-sm">Определение типа банка...</span>
              </div>
            )}

            {/* --- Dissociation & Wash media --- */}
            <div>
              <h3 className="font-medium mb-3">Среды для снятия клеток</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Dissociation medium */}
                <div className="space-y-2">
                  <Label>Среда диссоциации</Label>
                  <div className="grid gap-2 grid-cols-[1fr_90px]">
                    <Select value={dissociationMediumId} onValueChange={setDissociationMediumId}>
                      <SelectTrigger>
                        <SelectValue placeholder="(необязательно)" />
                      </SelectTrigger>
                      <SelectContent>
                        {dissociationOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.type === 'batch' ? '📦 ' : '🧪 '}{opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="мл"
                      value={dissociationVolume}
                      onChange={(e) => setDissociationVolume(e.target.value)}
                      disabled={!dissociationMediumId}
                    />
                  </div>
                </div>

                {/* Wash medium */}
                <div className="space-y-2">
                  <Label>Среда для промывки</Label>
                  <div className="grid gap-2 grid-cols-[1fr_90px]">
                    <Select value={washMediumId} onValueChange={setWashMediumId}>
                      <SelectTrigger>
                        <SelectValue placeholder="(необязательно)" />
                      </SelectTrigger>
                      <SelectContent>
                        {washOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.type === 'batch' ? '📦 ' : '🧪 '}{opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      step={0.1}
                      placeholder="мл"
                      value={washVolume}
                      onChange={(e) => setWashVolume(e.target.value)}
                      disabled={!washMediumId}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* --- Cell count metrics --- */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Результаты подсчёта клеток</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>
                    Концентрация (кл/мл) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step={1000}
                    placeholder="Например: 1000000"
                    value={concentration}
                    onChange={(e) => setConcentration(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Общий объём (мл) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    placeholder="Например: 10.0"
                    value={totalVolume}
                    onChange={(e) => setTotalVolume(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    Жизнеспособность (%) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    placeholder="Например: 95"
                    value={viability}
                    onChange={(e) => setViability(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Auto-calculated total cells */}
            {totalCells > 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-muted-foreground">Всего клеток</p>
                <p className="text-lg font-semibold text-green-800">
                  {formatNumber(totalCells)} ({(totalCells / 1e6).toFixed(2)} млн)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* STEP 3 : CRYOVIALS (криовиалы и расчёты)                          */}
      {/* ================================================================== */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTubes className="h-5 w-5" />
              Шаг 3. Криовиалы
            </CardTitle>
            <CardDescription>
              Количество криовиалов, объём на виал и расчёт клеток
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Batch selection from warehouse */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Партия криовиалов со склада
              </Label>
              <Select value={cryoBatchId} onValueChange={(val) => {
                setCryoBatchId(val)
                // Auto-fill volumePerVial from batch volume_per_unit
                const batch = cryoBatches.find((b) => b.id === val)
                if (batch?.volume_per_unit && !volumePerVial) {
                  setVolumePerVial(String(batch.volume_per_unit))
                }
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите партию криовиалов..." />
                </SelectTrigger>
                <SelectContent>
                  {cryoBatches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nomenclature?.name || 'Криовиалы'} — {b.batch_number} (ост. {b.quantity} шт.
                      {b.expiration_date ? `, до ${formatDate(b.expiration_date)}` : ''})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Криовиалы будут списаны со склада после заморозки. Поле необязательное.
              </p>
              {cryoBatchId && (
                <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => setCryoBatchId('')}>
                  ✕ Сбросить выбор
                </Button>
              )}
            </div>

            {/* Quantity warning */}
            {selectedCryoBatch && Number(cryoVialCount) > selectedCryoBatch.quantity && (
              <Alert className="border-red-300 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Запрошено {cryoVialCount} криовиалов, но в партии осталось только{' '}
                  <strong>{selectedCryoBatch.quantity}</strong> шт.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              {/* Number of cryovials */}
              <div className="space-y-2">
                <Label>
                  Количество криовиалов <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="Например: 10"
                  value={cryoVialCount}
                  onChange={(e) => {
                    setCryoVialCount(e.target.value)
                    // Sync individual volumes array length
                    const count = Number(e.target.value) || 0
                    setIndividualVolumes(prev => {
                      const arr = [...prev]
                      while (arr.length < count) arr.push(workingVolume || volumePerVial || '')
                      return arr.slice(0, count)
                    })
                  }}
                />
              </div>

              {/* Nominal volume per vial (auto from batch) */}
              <div className="space-y-2">
                <Label>
                  Номинальный объём пробирки, мл
                </Label>
                <Input
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="Авто из партии"
                  value={volumePerVial}
                  onChange={(e) => setVolumePerVial(e.target.value)}
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">Автозаполняется из партии</p>
              </div>
            </div>

            {/* Working volume section */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Рабочий объём</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Единый</span>
                  <Switch
                    checked={useIndividualVolume}
                    onCheckedChange={setUseIndividualVolume}
                  />
                  <span className="text-xs text-muted-foreground">Индивидуальный</span>
                </div>
              </div>

              {!useIndividualVolume ? (
                <div className="space-y-2">
                  <Label className="text-sm">
                    Рабочий объём на виал, мл
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.1"
                    placeholder={volumePerVial ? `Номинал: ${volumePerVial} мл` : 'Введите рабочий объём'}
                    value={workingVolume}
                    onChange={(e) => setWorkingVolume(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Если не указан — используется номинальный объём пробирки
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Укажите рабочий объём для каждой пробирки ({cryoVialCount || 0} шт.)
                  </p>
                  {Number(cryoVialCount) > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {Array.from({ length: Math.min(Number(cryoVialCount), 50) }, (_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-8 shrink-0">#{i + 1}</span>
                          <Input
                            type="number"
                            min={0}
                            step="0.1"
                            placeholder={volumePerVial || '1.0'}
                            value={individualVolumes[i] || ''}
                            onChange={(e) => {
                              setIndividualVolumes(prev => {
                                const arr = [...prev]
                                arr[i] = e.target.value
                                return arr
                              })
                            }}
                            className="h-8 text-sm"
                          />
                          <span className="text-xs text-muted-foreground">мл</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {Number(cryoVialCount) > 50 && (
                    <p className="text-xs text-amber-600">Показано только первые 50 виалов</p>
                  )}
                </div>
              )}
            </div>

            {/* Auto-calculated indicators */}
            {(cellsPerVial > 0 || cellsPerMl > 0) && (
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Расчётные показатели</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Всего клеток</p>
                    <p className="text-lg font-semibold">{formatNumber(totalCells)}</p>
                    <p className="text-xs text-muted-foreground">{(totalCells / 1e6).toFixed(2)} млн</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Клеток на виал</p>
                    <p className="text-lg font-semibold">{formatNumber(cellsPerVial)}</p>
                    <p className="text-xs text-muted-foreground">{(cellsPerVial / 1e6).toFixed(2)} млн</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Клеток / мл (в виале)</p>
                    <p className="text-lg font-semibold">{formatNumber(cellsPerMl)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Volume check */}
            {Number(cryoVialCount) > 0 && effectiveVolumePerVial > 0 && Number(totalVolume) > 0 && (
              <div className={`p-3 rounded-lg border ${
                Number(cryoVialCount) * effectiveVolumePerVial > Number(totalVolume)
                  ? 'bg-red-50 border-red-200'
                  : 'bg-green-50 border-green-200'
              }`}>
                <p className="text-sm">
                  <span className="text-muted-foreground">Требуемый объём: </span>
                  <span className="font-medium">
                    {(Number(cryoVialCount) * effectiveVolumePerVial).toFixed(1)} мл
                  </span>
                  <span className="text-muted-foreground"> из </span>
                  <span className="font-medium">{totalVolume} мл</span>
                  {Number(cryoVialCount) * effectiveVolumePerVial > Number(totalVolume) && (
                    <span className="text-red-600 font-medium ml-2">
                      (недостаточно объёма!)
                    </span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* STEP 4 : FREEZING (среда, метод, хранение)                       */}
      {/* ================================================================== */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Snowflake className="h-5 w-5" />
              Шаг 4. Заморозка и хранение
            </CardTitle>
            <CardDescription>
              Среда для заморозки, метод замораживания и место хранения
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Freezing medium */}
            <div className="space-y-2">
              <Label>
                Среда для заморозки <span className="text-red-500">*</span>
              </Label>
              <div className="grid gap-2 grid-cols-[1fr_100px]">
                <Select value={freezingMediumId} onValueChange={setFreezingMediumId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите среду..." />
                  </SelectTrigger>
                  <SelectContent>
                    {freezingOptions.map((opt) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.type === 'batch' ? '📦 ' : '🧪 '}{opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="мл"
                  value={freezingMediumVolume}
                  onChange={(e) => setFreezingMediumVolume(e.target.value)}
                />
              </div>
            </div>

            {/* Freezing method */}
            <div className="space-y-2">
              <Label>
                Метод заморозки <span className="text-red-500">*</span>
              </Label>
              <Select value={freezingMethod} onValueChange={setFreezingMethod}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите метод..." />
                </SelectTrigger>
                <SelectContent>
                  {FREEZING_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label>
                Место хранения <span className="text-red-500">*</span>
              </Label>
              <PositionTreeSelect
                positions={positions}
                value={positionId}
                onValueChange={setPositionId}
                placeholder="Выберите позицию в криохранилище..."
              />
            </div>

            {/* Position details */}
            {selectedPosition && (
              <div className="p-4 border rounded-lg space-y-2 bg-muted/50">
                <h4 className="font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Информация о позиции
                </h4>
                <div className="grid gap-2 text-sm">
                  {selectedPosition.equipment?.name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Оборудование:</span>
                      <span className="font-medium">{selectedPosition.equipment.name}</span>
                    </div>
                  )}
                  {selectedPosition.path && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Путь:</span>
                      <span className="font-medium">{selectedPosition.path}</span>
                    </div>
                  )}
                  {selectedPosition.capacity != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ёмкость:</span>
                      <span className="font-medium">{selectedPosition.capacity} мест</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* STEP 5 : CONFIRMATION                                              */}
      {/* ================================================================== */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ThermometerSnowflake className="h-5 w-5" />
              Шаг 5. Подтверждение заморозки
            </CardTitle>
            <CardDescription>
              Проверьте все данные перед сохранением
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Source */}
            <div className="space-y-2">
              <h3 className="font-medium">Источник</h3>
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Лот:</span>
                  <span className="font-medium">{selectedLot?.lot_number || selectedLotId}</span>
                </div>
                {selectedLot?.culture?.name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Культура:</span>
                    <span className="font-medium">{selectedLot.culture.name}</span>
                  </div>
                )}
                {selectedLot?.passage_number != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Пассаж:</span>
                    <span className="font-medium">P{selectedLot.passage_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Контейнеров:</span>
                  <span className="font-medium">{selectedContainerIds.length}</span>
                </div>
              </div>
            </div>

            {/* Cell detachment & metrics */}
            <div className="space-y-2">
              <h3 className="font-medium">Снятие клеток и метрики</h3>
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                {dissociationMediumId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Среда диссоциации:</span>
                    <span className="font-medium">
                      {dissociationOptions.find((o) => o.id === dissociationMediumId)?.label || '---'}
                      {dissociationVolume && ` (${dissociationVolume} мл)`}
                    </span>
                  </div>
                )}
                {washMediumId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Среда промывки:</span>
                    <span className="font-medium">
                      {washOptions.find((o) => o.id === washMediumId)?.label || '---'}
                      {washVolume && ` (${washVolume} мл)`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Концентрация:</span>
                  <span className="font-medium">{formatNumber(Number(concentration))} кл/мл</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Объём суспензии:</span>
                  <span className="font-medium">{totalVolume} мл</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Жизнеспособность:</span>
                  <span className="font-medium">{viability}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Всего клеток:</span>
                  <span className="font-semibold">{formatNumber(totalCells)} ({(totalCells / 1e6).toFixed(2)} млн)</span>
                </div>
              </div>
            </div>

            {/* Cryovials */}
            <div className="space-y-2">
              <h3 className="font-medium">Криовиалы</h3>
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                {selectedCryoBatch && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Партия со склада:</span>
                    <span className="font-medium">
                      {selectedCryoBatch.nomenclature?.name || 'Криовиалы'} — {selectedCryoBatch.batch_number}
                      {' '}(ост. {selectedCryoBatch.quantity} шт.)
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Криовиалов:</span>
                  <span className="font-medium">{cryoVialCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Номинальный объём:</span>
                  <span className="font-medium">{volumePerVial} мл</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Рабочий объём:</span>
                  <span className="font-medium">
                    {useIndividualVolume
                      ? `индивид. (сред. ${effectiveVolumePerVial.toFixed(1)} мл)`
                      : `${effectiveVolumePerVial.toFixed(1)} мл`
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Клеток на виал:</span>
                  <span className="font-medium">{formatNumber(cellsPerVial)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Клеток/мл в виале:</span>
                  <span className="font-medium">{formatNumber(cellsPerMl)}</span>
                </div>
              </div>
            </div>

            {/* Freezing & storage */}
            <div className="space-y-2">
              <h3 className="font-medium">Заморозка и хранение</h3>
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Тип банка:</span>
                  <Badge className={bankType === 'MCB' ? 'bg-blue-100 text-blue-800 hover:bg-blue-100' : 'bg-purple-100 text-purple-800 hover:bg-purple-100'}>
                    {bankType}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Среда заморозки:</span>
                  <span className="font-medium">
                    {freezingOptions.find((o) => o.id === freezingMediumId)?.label || '---'}
                    {freezingMediumVolume && ` (${freezingMediumVolume} мл)`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Метод:</span>
                  <span className="font-medium">
                    {FREEZING_METHODS.find((m) => m.value === freezingMethod)?.label || freezingMethod}
                  </span>
                </div>
                {selectedPosition && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Хранение:</span>
                    <span className="font-medium">
                      {selectedPosition.equipment?.name && `${selectedPosition.equipment.name} / `}
                      {selectedPosition.path || selectedPosition.name || positionId}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Дополнительная информация (необязательно)..."
                rows={3}
              />
            </div>

            {/* Info alert */}
            <Alert className="border-green-300 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Банк будет создан со статусом &laquo;QC_PENDING&raquo; и
                направлен на контроль качества. Будет создана задача QC и
                отправлено уведомление.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* NAVIGATION                                                         */}
      {/* ================================================================== */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={step === 1 ? () => router.back() : goBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 1 ? 'Отмена' : 'Назад'}
        </Button>

        {step < 5 ? (
          <Button onClick={goNext} disabled={!canProceed()}>
            Далее
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <ThermometerSnowflake className="h-4 w-4 mr-2" />
                Создать банк и заморозить
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

export default function FreezePage() {
  return (
    <Suspense fallback={<div className="container py-6 text-center text-muted-foreground">Загрузка...</div>}>
      <FreezePageInner />
    </Suspense>
  )
}
