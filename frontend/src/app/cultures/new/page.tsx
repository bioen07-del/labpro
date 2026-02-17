"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Beaker, CheckCircle2, FlaskConical, TestTubes, Package, AlertTriangle, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'

import { PositionTreeSelect } from '@/components/position-tree-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import {
  getDonations,
  getCultureTypesByTissueType,
  getCultureTypes,
  getContainerTypes,
  getPositions,
  getAvailableMediaByUsage,
  getAvailableMediaForFeed,
  getReagentBatches,
  buildMediaOptions,
  parseMediumId,
  getAllConsumableBatches,
  getContainerStockByType,
  createCultureFromDonation,
} from '@/lib/api'

// ---- extraction method options ----
const EXTRACTION_METHODS = [
  { value: 'ENZYMATIC', label: 'Ферментативный' },
  { value: 'EXPLANT', label: 'Эксплантный' },
  { value: 'MECHANICAL', label: 'Механический' },
  { value: 'OTHER', label: 'Другой' },
] as const

// ---- types ----
interface Donation {
  id: string
  code: string
  donor_id: string
  tissue_type_id: string
  status: string
  donor?: { code?: string; last_name?: string; first_name?: string; middle_name?: string } | null
  tissue_type?: { id: string; name?: string } | null
  [key: string]: unknown
}

interface CultureTypeOption {
  id: string
  code: string
  name: string
  is_primary?: boolean
}

interface ContainerType {
  id: string
  name: string
  code?: string
  category?: string
  [key: string]: unknown
}

interface Position {
  id: string
  path: string
  equipment?: { name?: string } | null
  [key: string]: unknown
}

interface ReadyMediumOption {
  id: string
  code: string
  name: string
  current_volume_ml?: number
  volume_ml?: number
  expiration_date?: string
  [key: string]: unknown
}

interface ConsumableBatch {
  id: string
  batch_number: string
  quantity: number
  nomenclature?: { name?: string; container_type_id?: string } | null
  expiration_date?: string
  [key: string]: unknown
}

// Строка выбора контейнера — напрямую со склада
interface ContainerRow {
  id: string // unique row key
  stockBatchId: string       // batch from stock → determines container type + write-off
  containerTypeId: string    // derived from stockBatchId
  count: number
  positionId: string
}

interface CreatedResult {
  culture: { id: string; name: string; [key: string]: unknown }
  lot: { id: string; lot_number: string; [key: string]: unknown }
  containers: { id: string; code: string; [key: string]: unknown }[]
}

// ---- helpers ----
function donorDisplayName(donor: Donation['donor']): string {
  if (!donor) return ''
  return [donor.last_name, donor.first_name, donor.middle_name].filter(Boolean).join(' ') || 'ФИО не указано'
}

function donationLabel(d: Donation): string {
  const parts = [d.code]
  if (d.donor) parts.push(donorDisplayName(d.donor))
  if (d.tissue_type?.name) parts.push(d.tissue_type.name)
  if (d.status === 'QUARANTINE') parts.push('(карантин)')
  return parts.join(' — ')
}

function generateRowId(): string {
  return Math.random().toString(36).substring(2, 9)
}

// ====================================================================
// Inner component that uses useSearchParams (must be inside Suspense)
// ====================================================================
function NewCultureForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlDonorId = searchParams.get('donor_id')
  const urlDonationId = searchParams.get('donation_id')

  // ---------- reference data ----------
  const [donations, setDonations] = useState<Donation[]>([])
  const [cultureTypeOptions, setCultureTypeOptions] = useState<CultureTypeOption[]>([])
  const [containerTypes, setContainerTypes] = useState<ContainerType[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [mediaOptions, setMediaOptions] = useState<{ id: string; label: string; type: 'ready_medium' | 'batch'; category?: string }[]>([])
  const [allMediaOptions, setAllMediaOptions] = useState<{ id: string; label: string; type: 'ready_medium' | 'batch'; category?: string }[]>([])
  const [allConsumableBatches, setAllConsumableBatches] = useState<ConsumableBatch[]>([])

  // ---------- form state ----------
  const [donationId, setDonationId] = useState('')
  const [cultureTypeId, setCultureTypeId] = useState('')
  const [extractionMethod, setExtractionMethod] = useState('')
  const [notes, setNotes] = useState('')
  const [mediaCategoryFilter, setMediaCategoryFilter] = useState('all')

  // Multiple container rows
  const [containerRows, setContainerRows] = useState<ContainerRow[]>([
    { id: generateRowId(), stockBatchId: '', containerTypeId: '', count: 1, positionId: '' }
  ])

  // Per-container media mode
  const [perContainerMediaMode, setPerContainerMediaMode] = useState(false)
  const [perRowMedia, setPerRowMedia] = useState<Record<string, string>>({})
  const [perRowVolume, setPerRowVolume] = useState<Record<string, string>>({})

  // Additional components (serum, reagent, additive) — with per-component categoryFilter
  const [additionalComponents, setAdditionalComponents] = useState<
    { id: string; mediumId: string; volumeMl: string; categoryFilter: string }[]
  >([])

  // Media write-off
  const [readyMediumId, setReadyMediumId] = useState('')
  const [mediumVolumePerContainer, setMediumVolumePerContainer] = useState(0)

  // ---------- UI state ----------
  const [initialLoading, setInitialLoading] = useState(true)
  const [cultureTypesLoading, setCultureTypesLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CreatedResult | null>(null)

  // ---------- load reference data on mount ----------
  useEffect(() => {
    async function load() {
      try {
        const donationFilters: { statuses: string[]; donor_id?: string } = { statuses: ['APPROVED', 'QUARANTINE'] }
        if (urlDonorId) donationFilters.donor_id = urlDonorId
        const [donationsData, containerTypesData, positionsData, seedMediaResult, allRM, allReagents, batchesData] = await Promise.all([
          getDonations(donationFilters),
          getContainerTypes(),
          getPositions(),
          getAvailableMediaByUsage('SEED'),
          getAvailableMediaForFeed(),
          getReagentBatches(),
          getContainerStockByType(),
        ])
        setDonations((donationsData || []) as Donation[])
        // Filter out cryo container types
        const nonCryo = ((containerTypesData || []) as ContainerType[]).filter(
          (ct) => !(ct.category?.toUpperCase().includes('CRYO') || ct.name?.toUpperCase().includes('CRYO'))
        )
        setContainerTypes(nonCryo)
        setPositions((positionsData || []) as Position[])
        // Media: SEED-filtered for main + ALL for additional components
        setMediaOptions(buildMediaOptions(seedMediaResult.readyMedia, seedMediaResult.reagentBatches))
        setAllMediaOptions(buildMediaOptions(allRM, allReagents))
        setAllConsumableBatches((batchesData || []) as ConsumableBatch[])

        // Auto-select donation from URL params
        if (urlDonationId && donationsData) {
          const found = (donationsData as Donation[]).find((d) => d.id === urlDonationId)
          if (found) {
            setDonationId(urlDonationId)
          }
        }
      } catch (err) {
        console.error('Failed to load reference data:', err)
        toast.error('Ошибка загрузки справочных данных')
      } finally {
        setInitialLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- when donation changes, load culture types for its tissue type ----------
  const handleDonationChange = useCallback(async (newDonationId: string) => {
    setDonationId(newDonationId)
    setCultureTypeId('')
    setCultureTypeOptions([])

    if (!newDonationId) return

    const selectedDonation = donations.find((d) => d.id === newDonationId)
    const tissueTypeId = selectedDonation?.tissue_type_id || selectedDonation?.tissue_type?.id
    if (!tissueTypeId) {
      toast.warning('У выбранной донации не указан тип ткани')
      return
    }

    setCultureTypesLoading(true)
    try {
      const links = await getCultureTypesByTissueType(tissueTypeId)
      const mapped = ((links || []) as any[]).map((l) => ({
        id: l.culture_type.id,
        code: l.culture_type.code,
        name: l.culture_type.name,
        is_primary: l.is_primary,
      }))

      if (mapped.length === 0) {
        // Fallback: load ALL active culture types for manual selection
        toast.info('Нет привязки типа клеток к типу ткани — показаны все типы')
        try {
          const allTypes = await getCultureTypes()
          const fallback = ((allTypes || []) as any[]).map((ct) => ({
            id: ct.id,
            code: ct.code,
            name: ct.name,
            is_primary: false,
          }))
          setCultureTypeOptions(fallback)
        } catch {
          setCultureTypeOptions([])
        }
      } else {
        setCultureTypeOptions(mapped)
        // Auto-select primary or single option
        const primary = mapped.find((m) => m.is_primary)
        if (primary) {
          setCultureTypeId(primary.id)
        } else if (mapped.length === 1) {
          setCultureTypeId(mapped[0].id)
        }
      }
    } catch (err) {
      console.error('Failed to load culture types for tissue type:', err)
      toast.error('Ошибка загрузки типов клеток')
    } finally {
      setCultureTypesLoading(false)
    }
  }, [donations])

  // When donationId set from URL (after donations loaded), trigger culture type loading
  useEffect(() => {
    if (donationId && donations.length > 0 && cultureTypeOptions.length === 0 && !cultureTypesLoading) {
      handleDonationChange(donationId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [donationId, donations])

  // ---------- container rows management ----------
  const updateContainerRow = (rowId: string, updates: Partial<ContainerRow>) => {
    setContainerRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, ...updates } : row
      )
    )
  }

  const addContainerRow = () => {
    setContainerRows((prev) => [
      ...prev,
      { id: generateRowId(), stockBatchId: '', containerTypeId: '', count: 1, positionId: '' }
    ])
  }

  const removeContainerRow = (rowId: string) => {
    setContainerRows((prev) => {
      if (prev.length <= 1) return prev // Keep at least one
      return prev.filter((row) => row.id !== rowId)
    })
  }

  // ---------- derived ----------
  const selectedDonation = donations.find((d) => d.id === donationId)
  const filteredMediaOptions = mediaCategoryFilter === 'all'
    ? mediaOptions
    : mediaOptions.filter(opt => opt.category === mediaCategoryFilter)
  const selectedMediumOpt = mediaOptions.find((m) => m.id === readyMediumId)
  const totalContainerCount = containerRows.reduce((sum, row) => sum + (row.count || 0), 0)
  const totalMediumVolume = mediumVolumePerContainer * totalContainerCount
  const mediumOverflow = false // Volume overflow checked at API level now

  // Stock batches for container selection — non-cryo
  const containerStockOptions = allConsumableBatches.filter((b: any) => {
    if (!b.nomenclature?.container_type_id) return false
    const name = (b.nomenclature?.name || '').toUpperCase()
    return !name.includes('CRYO')
  })

  // Check consumable overflow for any row
  const hasConsumableOverflow = containerRows.some((row) => {
    if (!row.stockBatchId) return false
    const batch = allConsumableBatches.find((b) => b.id === row.stockBatchId)
    return batch != null && row.count > batch.quantity
  })

  // All rows have stock batch selected
  const allRowsValid = containerRows.every((row) => row.stockBatchId && row.count >= 1)

  const canSubmit =
    donationId &&
    cultureTypeId &&
    extractionMethod &&
    allRowsValid &&
    totalContainerCount >= 1 &&
    !submitting &&
    !hasConsumableOverflow

  // ---------- submit ----------
  const handleSubmit = async () => {
    if (!canSubmit) return

    setSubmitting(true)
    try {
      const containersList = containerRows.map((row) => ({
        container_type_id: row.containerTypeId,
        count: row.count,
        position_id: row.positionId || undefined,
        consumable_batch_id: row.stockBatchId || undefined,
      }))

      // Parse main medium (rm:uuid or batch:uuid)
      let parsedMainMedium: { ready_medium_id?: string; batch_id?: string } = {}
      if (readyMediumId) {
        const parsed = parseMediumId(readyMediumId)
        if (parsed && parsed.type === 'ready_medium') {
          parsedMainMedium.ready_medium_id = parsed.id
        } else if (parsed) {
          parsedMainMedium.batch_id = parsed.id
        }
      }

      // Собрать дополнительные компоненты для списания (с поддержкой rm:/batch:)
      const validComponents = additionalComponents
        .filter(c => c.mediumId && c.volumeMl && parseFloat(c.volumeMl) > 0)
        .map(c => ({
          medium_id: c.mediumId,
          volume_ml: parseFloat(c.volumeMl) * totalContainerCount,
        }))

      const res = await createCultureFromDonation({
        donation_id: donationId,
        culture_type_id: cultureTypeId,
        extraction_method: extractionMethod,
        containers_list: containersList,
        notes: notes || undefined,
        ...parsedMainMedium,
        medium_volume_ml: readyMediumId && totalMediumVolume > 0 ? totalMediumVolume : undefined,
        additional_components: validComponents.length > 0 ? validComponents : undefined,
      })

      setResult(res as CreatedResult)
      toast.success('Культура успешно создана')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
      console.error('createCultureFromDonation error:', err)
      toast.error(`Ошибка создания культуры: ${message}`)
    } finally {
      setSubmitting(false)
    }
  }

  // ======================== loading state ========================
  if (initialLoading) {
    return (
      <div className="container py-6 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ======================== success result ========================
  if (result) {
    return (
      <div className="container py-6 max-w-lg mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center pb-2">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <CardTitle>Культура создана</CardTitle>
            <CardDescription>Все объекты успешно созданы в системе</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Код культуры</span>
              <Badge variant="secondary" className="text-base">{result.culture.name}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Номер лота</span>
              <Badge variant="outline">{result.lot.lot_number}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Контейнеров создано</span>
              <Badge variant="outline">{result.containers.length}</Badge>
            </div>

            <div className="pt-4 flex gap-3">
              <Button className="flex-1" onClick={() => router.push(`/cultures/${result.culture.id}`)}>
                Открыть культуру
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => router.push('/cultures')}>
                К списку
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ======================== form ========================
  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/cultures"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Создание первичной культуры</h1>
          <p className="text-muted-foreground">Выделение клеточной культуры из биоматериала донации</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* -------- Main form -------- */}
        <div className="lg:col-span-2 space-y-6">

          {/* 1. Donation */}
          <Card>
            <CardHeader>
              <CardTitle>Донация</CardTitle>
              <CardDescription>Выберите донацию для выделения культуры</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="donation">Донация *</Label>
                {donations.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">
                    Нет доступных донаций. Сначала создайте донацию.
                  </p>
                ) : (
                  <Select value={donationId} onValueChange={handleDonationChange}>
                    <SelectTrigger id="donation">
                      <SelectValue placeholder="Выберите донацию" />
                    </SelectTrigger>
                    <SelectContent>
                      {donations.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {donationLabel(d)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedDonation?.tissue_type?.name && (
                <div className="mt-3 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Тип ткани:</span>
                  <Badge variant="secondary">{selectedDonation.tissue_type.name}</Badge>
                  {selectedDonation.status === 'QUARANTINE' && (
                    <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 ml-2">Карантин</Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2-3. Culture type + extraction method */}
          <Card>
            <CardHeader>
              <CardTitle>Параметры выделения</CardTitle>
              <CardDescription>Тип клеток определяется типом ткани донации</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Culture type */}
                <div className="space-y-2">
                  <Label htmlFor="cultureType">Тип клеток *</Label>
                  {cultureTypesLoading ? (
                    <div className="flex items-center gap-2 h-10 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Загрузка...
                    </div>
                  ) : (
                    <Select
                      value={cultureTypeId}
                      onValueChange={setCultureTypeId}
                      disabled={!donationId || cultureTypeOptions.length === 0}
                    >
                      <SelectTrigger id="cultureType">
                        <SelectValue placeholder={
                          !donationId
                            ? 'Сначала выберите донацию'
                            : cultureTypeOptions.length === 0
                              ? 'Нет доступных типов'
                              : 'Выберите тип клеток'
                        } />
                      </SelectTrigger>
                      <SelectContent>
                        {cultureTypeOptions.map((ct) => (
                          <SelectItem key={ct.id} value={ct.id}>
                            {ct.name} ({ct.code})
                            {ct.is_primary ? ' — основной' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Extraction method */}
                <div className="space-y-2">
                  <Label htmlFor="extractionMethod">Способ выделения *</Label>
                  <Select value={extractionMethod} onValueChange={setExtractionMethod}>
                    <SelectTrigger id="extractionMethod">
                      <SelectValue placeholder="Выберите способ" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXTRACTION_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 4. Container selection — MULTIPLE ROWS */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Контейнеры</span>
                <Badge variant="outline" className="text-base">
                  Всего: {totalContainerCount} шт.
                </Badge>
              </CardTitle>
              <CardDescription>Выберите типы контейнеров и количество. Можно добавить несколько типов.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {containerRows.map((row, index) => {
                const selectedBatch = allConsumableBatches.find((b) => b.id === row.stockBatchId)
                const rowOverflow = selectedBatch && row.count > selectedBatch.quantity

                return (
                  <div
                    key={row.id}
                    className="border rounded-lg p-4 space-y-3 relative"
                  >
                    {/* Row header with remove button */}
                    {containerRows.length > 1 && (
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-muted-foreground">
                          Контейнер {index + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeContainerRow(row.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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
                            const batch = allConsumableBatches.find((b) => b.id === val)
                            updateContainerRow(row.id, {
                              stockBatchId: val,
                              containerTypeId: (batch?.nomenclature as any)?.container_type_id || '',
                            })
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите со склада..." />
                          </SelectTrigger>
                          <SelectContent>
                            {containerStockOptions.map((b: any) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.nomenclature?.name ?? b.batch_number}
                                {' — '}{b.quantity} шт.
                                {b.expiration_date ? ` (до ${b.expiration_date})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Кол-во *</Label>
                        <Input
                          type="number"
                          min={1}
                          value={row.count}
                          onChange={(e) => updateContainerRow(row.id, { count: Math.max(1, parseInt(e.target.value) || 1) })}
                        />
                      </div>
                    </div>

                    {/* Stock info + write-off summary */}
                    {selectedBatch && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          Списание: <strong className={rowOverflow ? 'text-destructive' : 'text-foreground'}>{row.count}</strong> из {selectedBatch.quantity} шт.
                        </span>
                        {rowOverflow && (
                          <span className="flex items-center gap-1 text-destructive">
                            <AlertTriangle className="h-3 w-3" />
                            Недостаточно
                          </span>
                        )}
                      </div>
                    )}

                    {/* Position for this row */}
                    {positions.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t">
                        <Label className="text-xs">Позиция размещения</Label>
                        <PositionTreeSelect
                          positions={positions}
                          value={row.positionId}
                          onValueChange={(val) => updateContainerRow(row.id, { positionId: val })}
                          placeholder="Не выбрано"
                          equipmentTypeFilter="INCUBATOR"
                          triggerClassName="h-8 text-xs"
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add row button */}
              <Button
                variant="outline"
                size="sm"
                onClick={addContainerRow}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить тип контейнера
              </Button>
            </CardContent>
          </Card>

          {/* 5. Питательная среда */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTubes className="h-5 w-5" />
                Питательная среда
              </CardTitle>
              <CardDescription>Среда для первичного посева (необязательно)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mode toggle — скрыт: per-container data не обрабатывается при submit (DON-04) */}
              <div className="flex items-center space-x-2 hidden">
                <Checkbox
                  id="per-container-media-culture"
                  checked={perContainerMediaMode}
                  onCheckedChange={(checked) => setPerContainerMediaMode(checked === true)}
                />
                <Label htmlFor="per-container-media-culture" className="text-sm cursor-pointer">
                  Индивидуальная среда для каждого типа контейнера
                </Label>
              </div>

              {!perContainerMediaMode ? (
                <>
                  <div className="grid gap-4 md:grid-cols-[auto_1fr_140px]">
                    {/* Category filter */}
                    <div className="space-y-2">
                      <Label>Категория</Label>
                      <Select value={mediaCategoryFilter} onValueChange={(val) => { setMediaCategoryFilter(val); setReadyMediumId('') }}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все</SelectItem>
                          <SelectItem value="MEDIUM">Среды</SelectItem>
                          <SelectItem value="SERUM">Сыворотки</SelectItem>
                          <SelectItem value="SUPPLEMENT">Добавки</SelectItem>
                          <SelectItem value="BUFFER">Буферы</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Среда для посева</Label>
                      <Select value={readyMediumId} onValueChange={setReadyMediumId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Не выбрано" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredMediaOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.type === 'batch' ? '📦 ' : '🧪 '}{opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>мл / конт.</Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.5}
                        value={mediumVolumePerContainer || ''}
                        onChange={(e) => setMediumVolumePerContainer(parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  {readyMediumId && mediumVolumePerContainer > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Итого: <strong>{totalMediumVolume.toFixed(1)} мл</strong> ({totalContainerCount} шт. × {mediumVolumePerContainer} мл)
                    </p>
                  )}
                </>
              ) : (
                /* Per container type media */
                <div className="space-y-3">
                  {containerRows.map((row) => {
                    const batch = allConsumableBatches.find((b) => b.id === row.stockBatchId)
                    const batchName = batch?.nomenclature?.name ?? batch?.batch_number ?? '—'
                    if (!row.stockBatchId) return null
                    const rowVol = parseFloat(perRowVolume[row.id] || '') || 0
                    const rowTotal = rowVol * row.count
                    return (
                      <div key={row.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{batchName}</Badge>
                          <span className="text-xs text-muted-foreground">× {row.count}</span>
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
                              {filteredMediaOptions.map((opt) => (
                                <SelectItem key={opt.id} value={opt.id}>
                                  {opt.type === 'batch' ? '📦 ' : '🧪 '}{opt.label}
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
                            Итого: {rowTotal.toFixed(1)} мл ({row.count} × {rowVol} мл)
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5b. Additional components (serum, reagent, additive) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Дополнительные компоненты
              </CardTitle>
              <CardDescription>Сыворотка, реагенты, добавки — необязательно</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {additionalComponents.map((comp, idx) => {
                const compOptions = comp.categoryFilter === 'all'
                  ? allMediaOptions
                  : allMediaOptions.filter(o => o.category === comp.categoryFilter)
                return (
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
                  <div className="grid gap-2 md:grid-cols-[auto_1fr_120px]">
                    <Select
                      value={comp.categoryFilter}
                      onValueChange={(val) => setAdditionalComponents(prev =>
                        prev.map(c => c.id === comp.id ? { ...c, categoryFilter: val, mediumId: '' } : c)
                      )}
                    >
                      <SelectTrigger className="h-8 text-xs w-[140px]">
                        <SelectValue placeholder="Категория" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="SERUM">Сыворотки</SelectItem>
                        <SelectItem value="SUPPLEMENT">Добавки</SelectItem>
                        <SelectItem value="BUFFER">Буферы</SelectItem>
                        <SelectItem value="ENZYME">Ферменты</SelectItem>
                        <SelectItem value="REAGENT">Реагенты</SelectItem>
                        <SelectItem value="MEDIUM">Среды</SelectItem>
                      </SelectContent>
                    </Select>
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
                        {compOptions.map((opt) => (
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
                      Итого: {(parseFloat(comp.volumeMl) * totalContainerCount).toFixed(1)} мл ({totalContainerCount} × {comp.volumeMl} мл)
                    </p>
                  )}
                </div>
                )
              })}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setAdditionalComponents(prev => [...prev, { id: generateRowId(), mediumId: '', volumeMl: '', categoryFilter: 'all' }])}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить компонент
              </Button>
            </CardContent>
          </Card>

          {/* 6. Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Примечания</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="notes"
                placeholder="Дополнительная информация, условия выделения..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* -------- Sidebar summary -------- */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Сводка</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Донация</span>
                <span className="font-medium text-right max-w-[160px] truncate">
                  {selectedDonation?.code || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Донор</span>
                <span className="font-medium text-right max-w-[160px] truncate">
                  {selectedDonation?.donor?.code || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Тип ткани</span>
                <Badge variant="outline">
                  {selectedDonation?.tissue_type?.name || '—'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Тип клеток</span>
                <Badge variant="outline">
                  {cultureTypeOptions.find((ct) => ct.id === cultureTypeId)?.code || '—'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Выделение</span>
                <span className="font-medium">
                  {EXTRACTION_METHODS.find((m) => m.value === extractionMethod)?.label || '—'}
                </span>
              </div>

              {/* Container summary */}
              <div className="border-t pt-2 space-y-1">
                <span className="text-sm text-muted-foreground">Контейнеры:</span>
                {containerRows.map((row) => {
                  const batch = allConsumableBatches.find((b) => b.id === row.stockBatchId)
                  const batchName = batch?.nomenclature?.name ?? '—'
                  if (!row.stockBatchId) return null
                  return (
                    <div key={row.id} className="flex justify-between text-sm">
                      <span className="truncate max-w-[130px]">{batchName}</span>
                      <span className="font-medium">{row.count} шт.</span>
                    </div>
                  )
                })}
                <div className="flex justify-between font-medium text-sm border-t pt-1">
                  <span>Итого</span>
                  <span>{totalContainerCount} шт.</span>
                </div>
              </div>

              {readyMediumId && totalMediumVolume > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Среда</span>
                  <span className="font-medium">{totalMediumVolume.toFixed(1)} мл</span>
                </div>
              )}
              {containerRows.some((r) => r.stockBatchId) && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Списание</span>
                  <span className="font-medium">
                    {containerRows
                      .filter((r) => r.stockBatchId)
                      .reduce((sum, r) => sum + r.count, 0)} шт.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Создание...</>
                ) : (
                  <><Beaker className="mr-2 h-4 w-4" />Создать культуру</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// ====================================================================
// Wrapper with Suspense (required for useSearchParams in Next.js)
// ====================================================================
export default function NewCulturePage() {
  return (
    <Suspense fallback={
      <div className="container py-6 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <NewCultureForm />
    </Suspense>
  )
}
