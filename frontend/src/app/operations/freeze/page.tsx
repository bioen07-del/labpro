"use client"

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  ThermometerSnowflake,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  Snowflake,
  MapPin,
} from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  getLots,
  getContainersByLot,
  getAvailableMediaForFeed,
  getPositions,
  getBanks,
  createOperationFreeze,
} from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepDef {
  label: string
  shortLabel: string
}

const STEPS: StepDef[] = [
  { label: 'Источник', shortLabel: 'Источник' },
  { label: 'Параметры', shortLabel: 'Параметры' },
  { label: 'Среды и метрики', shortLabel: 'Среды' },
  { label: 'Размещение', shortLabel: 'Размещение' },
  { label: 'Подтверждение', shortLabel: 'Итого' },
]

const FREEZING_METHODS = [
  { value: 'PROGRAMMED', label: 'Программное замораживание' },
  { value: 'MANUAL_80', label: 'Ручное (-80 C)' },
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
  const [media, setMedia] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])

  // --- loading flags ---
  const [initialLoading, setInitialLoading] = useState(true)
  const [containersLoading, setContainersLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // --- Step 1: Source ---
  const [selectedLotId, setSelectedLotId] = useState('')
  const [selectedContainerIds, setSelectedContainerIds] = useState<string[]>([])

  // --- Step 2: Parameters ---
  const [bankType, setBankType] = useState<'MCB' | 'WCB' | null>(null)
  const [bankTypeLoading, setBankTypeLoading] = useState(false)
  const [freezingMethod, setFreezingMethod] = useState('')
  const [volumePerVial, setVolumePerVial] = useState('')
  const [cryoVialCount, setCryoVialCount] = useState('')

  // --- Step 3: Media & Metrics ---
  const [freezingMediumId, setFreezingMediumId] = useState('')
  const [dissociationMediumId, setDissociationMediumId] = useState('')
  const [washMediumId, setWashMediumId] = useState('')
  const [concentration, setConcentration] = useState('')
  const [totalVolume, setTotalVolume] = useState('')
  const [viability, setViability] = useState('')

  // --- Step 4: Placement ---
  const [positionId, setPositionId] = useState('')

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

  // ---------------------------------------------------------------------------
  // Initial data load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const load = async () => {
      try {
        const [lotsData, mediaData, positionsData] = await Promise.all([
          getLots({ status: 'ACTIVE' }),
          getAvailableMediaForFeed(),
          getPositions({ is_active: true }),
        ])
        setLots(lotsData || [])
        setMedia(mediaData || [])
        setPositions(positionsData || [])

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
  // Determine MCB / WCB when lot is selected and user proceeds to step 2
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

  const toggleContainer = (id: string) => {
    setSelectedContainerIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id],
    )
  }

  const toggleAll = () => {
    if (selectedContainerIds.length === containers.length) {
      setSelectedContainerIds([])
    } else {
      setSelectedContainerIds(containers.map((c: any) => c.id))
    }
  }

  // ---------------------------------------------------------------------------
  // Step validation
  // ---------------------------------------------------------------------------

  const isStep1Valid =
    selectedLotId !== '' && selectedContainerIds.length > 0

  const isStep2Valid =
    bankType !== null &&
    freezingMethod !== '' &&
    volumePerVial !== '' &&
    Number(volumePerVial) > 0 &&
    cryoVialCount !== '' &&
    Number(cryoVialCount) >= 1

  const isStep3Valid =
    freezingMediumId !== '' &&
    concentration !== '' &&
    Number(concentration) > 0 &&
    totalVolume !== '' &&
    Number(totalVolume) > 0 &&
    viability !== '' &&
    Number(viability) >= 0 &&
    Number(viability) <= 100

  const isStep4Valid = positionId !== ''

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
      const result = await createOperationFreeze({
        lot_id: selectedLotId,
        container_ids: selectedContainerIds,
        cryo_vial_count: Number(cryoVialCount),
        freezer_position_id: positionId,
        cells_per_vial: cellsPerVial,
        total_cells: totalCells,
        freezing_medium: freezingMediumId,
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
        <Button variant="ghost" size="icon" asChild>
          <Link href="/operations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
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

            {/* Container list */}
            {selectedLotId && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    Контейнеры
                    {containers.length > 0 && (
                      <span className="text-muted-foreground font-normal ml-1">
                        ({selectedContainerIds.length} / {containers.length})
                      </span>
                    )}
                  </Label>
                  {containers.length > 1 && (
                    <Button variant="outline" size="sm" onClick={toggleAll}>
                      {selectedContainerIds.length === containers.length
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
                ) : containers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p>Нет контейнеров в выбранном лоте</p>
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-72 overflow-y-auto border rounded-lg p-2">
                    {containers.map((container: any) => {
                      const isSelected = selectedContainerIds.includes(
                        container.id,
                      )
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
                              {container.status && (
                                <Badge variant="secondary">
                                  {container.status}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {container.confluent_percent != null && (
                            <div className="text-sm text-right whitespace-nowrap">
                              <span className="text-muted-foreground">
                                Конф.&nbsp;
                              </span>
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
      {/* STEP 2 : PARAMETERS                                                */}
      {/* ================================================================== */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Шаг 2. Параметры заморозки</CardTitle>
            <CardDescription>
              Укажите метод замораживания и количество криовиалов
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bank type badge (auto-determined) */}
            <div className="space-y-2">
              <Label>Тип банка (определяется автоматически)</Label>
              <div className="flex items-center gap-3">
                {bankTypeLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Определение типа...</span>
                  </div>
                ) : bankType === 'MCB' ? (
                  <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 text-base px-4 py-1">
                    MCB (Master Cell Bank)
                  </Badge>
                ) : bankType === 'WCB' ? (
                  <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-base px-4 py-1">
                    WCB (Working Cell Bank)
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Тип будет определен после выбора лота
                  </span>
                )}
              </div>
              {bankType && (
                <p className="text-xs text-muted-foreground">
                  {bankType === 'MCB'
                    ? 'Первая заморозка для этой культуры - создается Master Cell Bank'
                    : 'У культуры уже есть банк - создается Working Cell Bank'}
                </p>
              )}
            </div>

            {/* Freezing method */}
            <div className="space-y-2">
              <Label htmlFor="freezingMethod">Метод заморозки</Label>
              <Select value={freezingMethod} onValueChange={setFreezingMethod}>
                <SelectTrigger id="freezingMethod">
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

            {/* Volume per vial */}
            <div className="space-y-2">
              <Label htmlFor="volumePerVial">Объем на криовиал, мл</Label>
              <Input
                id="volumePerVial"
                type="number"
                min={0}
                step="0.1"
                placeholder="Например: 1.0"
                value={volumePerVial}
                onChange={(e) => setVolumePerVial(e.target.value)}
              />
            </div>

            {/* Number of cryovials */}
            <div className="space-y-2">
              <Label htmlFor="cryoVialCount">Количество криовиалов</Label>
              <Input
                id="cryoVialCount"
                type="number"
                min={1}
                step={1}
                placeholder="Например: 10"
                value={cryoVialCount}
                onChange={(e) => setCryoVialCount(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* STEP 3 : MEDIA & METRICS                                           */}
      {/* ================================================================== */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Шаг 3. Среды и метрики</CardTitle>
            <CardDescription>
              Укажите использованные среды и показатели подсчета клеток
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* --- Media --- */}
            <div className="grid gap-4 md:grid-cols-3">
              {/* Freezing medium (required) */}
              <div className="space-y-2">
                <Label htmlFor="freezingMedium">
                  Среда для заморозки <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={freezingMediumId}
                  onValueChange={setFreezingMediumId}
                >
                  <SelectTrigger id="freezingMedium">
                    <SelectValue placeholder="Выберите..." />
                  </SelectTrigger>
                  <SelectContent>
                    {media.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.code || m.name}
                        {m.expiration_date &&
                          ` | до ${formatDate(m.expiration_date)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dissociation medium (optional) */}
              <div className="space-y-2">
                <Label htmlFor="dissociationMedium">
                  Среда диссоциации
                </Label>
                <Select
                  value={dissociationMediumId}
                  onValueChange={setDissociationMediumId}
                >
                  <SelectTrigger id="dissociationMedium">
                    <SelectValue placeholder="(необязательно)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Не выбрано --</SelectItem>
                    {media.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.code || m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Wash medium (optional) */}
              <div className="space-y-2">
                <Label htmlFor="washMedium">Среда для промывки</Label>
                <Select value={washMediumId} onValueChange={setWashMediumId}>
                  <SelectTrigger id="washMedium">
                    <SelectValue placeholder="(необязательно)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">-- Не выбрано --</SelectItem>
                    {media.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.code || m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* --- Metrics --- */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-4">Метрики подсчета клеток</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="concentration">
                    Концентрация (клеток/мл){' '}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="concentration"
                    type="number"
                    min={0}
                    step={1000}
                    placeholder="Например: 1000000"
                    value={concentration}
                    onChange={(e) => setConcentration(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalVolume">
                    Общий объем (мл) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="totalVolume"
                    type="number"
                    min={0}
                    step="0.1"
                    placeholder="Например: 10.0"
                    value={totalVolume}
                    onChange={(e) => setTotalVolume(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="viability">
                    Жизнеспособность (%) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="viability"
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

            {/* Auto-calculated */}
            {(totalCells > 0 || cellsPerVial > 0) && (
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Расчетные показатели</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Всего клеток
                    </p>
                    <p className="text-lg font-semibold">
                      {formatNumber(totalCells)}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Клеток на криовиал
                    </p>
                    <p className="text-lg font-semibold">
                      {cellsPerVial > 0 ? formatNumber(cellsPerVial) : '---'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ================================================================== */}
      {/* STEP 4 : PLACEMENT                                                 */}
      {/* ================================================================== */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Шаг 4. Размещение в криохранилище
            </CardTitle>
            <CardDescription>
              Выберите позицию для хранения криовиалов
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="position">
                Позиция <span className="text-red-500">*</span>
              </Label>
              <Select value={positionId} onValueChange={setPositionId}>
                <SelectTrigger id="position">
                  <SelectValue placeholder="Выберите позицию..." />
                </SelectTrigger>
                <SelectContent>
                  {positions.map((pos: any) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      {pos.equipment?.name ? `${pos.equipment.name} / ` : ''}
                      {pos.path || pos.name || pos.id}
                      {pos.capacity != null && ` [${pos.capacity} мест]`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position details */}
            {selectedPosition && (
              <div className="p-4 border rounded-lg space-y-2 bg-muted/50">
                <h4 className="font-medium">Информация о позиции</h4>
                <div className="grid gap-2 text-sm">
                  {selectedPosition.equipment?.name && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Оборудование:</span>
                      <span className="font-medium">
                        {selectedPosition.equipment.name}
                      </span>
                    </div>
                  )}
                  {selectedPosition.path && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Путь:</span>
                      <span className="font-medium">
                        {selectedPosition.path}
                      </span>
                    </div>
                  )}
                  {selectedPosition.capacity != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ёмкость:</span>
                      <span className="font-medium">
                        {selectedPosition.capacity} мест
                      </span>
                    </div>
                  )}
                  {selectedPosition.equipment?.current_temperature != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Температура:
                      </span>
                      <span className="font-medium">
                        {selectedPosition.equipment.current_temperature}&#176;C
                      </span>
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
                  <span className="font-medium">
                    {selectedLot?.lot_number || selectedLotId}
                  </span>
                </div>
                {selectedLot?.culture?.name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Культура:</span>
                    <span className="font-medium">
                      {selectedLot.culture.name}
                    </span>
                  </div>
                )}
                {selectedLot?.passage_number != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Пассаж:</span>
                    <span className="font-medium">
                      P{selectedLot.passage_number}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Контейнеров:</span>
                  <span className="font-medium">
                    {selectedContainerIds.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Parameters */}
            <div className="space-y-2">
              <h3 className="font-medium">Параметры</h3>
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Тип банка:</span>
                  {bankType === 'MCB' ? (
                    <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                      MCB
                    </Badge>
                  ) : (
                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                      WCB
                    </Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Метод заморозки:</span>
                  <span className="font-medium">
                    {FREEZING_METHODS.find((m) => m.value === freezingMethod)
                      ?.label || freezingMethod}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Объем на виал:
                  </span>
                  <span className="font-medium">{volumePerVial} мл</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Криовиалов:</span>
                  <span className="font-medium">{cryoVialCount}</span>
                </div>
              </div>
            </div>

            {/* Media & Metrics */}
            <div className="space-y-2">
              <h3 className="font-medium">Среды и метрики</h3>
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Среда для заморозки:
                  </span>
                  <span className="font-medium">
                    {media.find((m: any) => m.id === freezingMediumId)?.code ||
                      media.find((m: any) => m.id === freezingMediumId)?.name ||
                      '---'}
                  </span>
                </div>
                {dissociationMediumId &&
                  dissociationMediumId !== '__none__' && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Среда диссоциации:
                      </span>
                      <span className="font-medium">
                        {media.find(
                          (m: any) => m.id === dissociationMediumId,
                        )?.code ||
                          media.find(
                            (m: any) => m.id === dissociationMediumId,
                          )?.name ||
                          '---'}
                      </span>
                    </div>
                  )}
                {washMediumId && washMediumId !== '__none__' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Среда для промывки:
                    </span>
                    <span className="font-medium">
                      {media.find((m: any) => m.id === washMediumId)?.code ||
                        media.find((m: any) => m.id === washMediumId)?.name ||
                        '---'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Концентрация:</span>
                  <span className="font-medium">
                    {formatNumber(Number(concentration))} клеток/мл
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Общий объем:</span>
                  <span className="font-medium">{totalVolume} мл</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Жизнеспособность:
                  </span>
                  <span className="font-medium">{viability}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Всего клеток:</span>
                  <span className="font-medium">
                    {formatNumber(totalCells)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Клеток на виал:
                  </span>
                  <span className="font-medium">
                    {formatNumber(cellsPerVial)}
                  </span>
                </div>
              </div>
            </div>

            {/* Placement */}
            <div className="space-y-2">
              <h3 className="font-medium">Размещение</h3>
              <div className="p-3 bg-muted rounded-lg text-sm space-y-1">
                {selectedPosition?.equipment?.name && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Оборудование:
                    </span>
                    <span className="font-medium">
                      {selectedPosition.equipment.name}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Позиция:</span>
                  <span className="font-medium">
                    {selectedPosition?.path ||
                      selectedPosition?.name ||
                      positionId}
                  </span>
                </div>
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
        <Button variant="outline" onClick={goBack} disabled={step === 1}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
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
