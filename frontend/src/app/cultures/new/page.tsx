"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Beaker, CheckCircle2, FlaskConical, TestTubes, Package, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

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
  getContainerTypes,
  getPositions,
  getAvailableMediaForFeed,
  getConsumableBatchesForContainerType,
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
  nomenclature?: { name?: string } | null
  expiration_date?: string
  [key: string]: unknown
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
  const [availableMedia, setAvailableMedia] = useState<ReadyMediumOption[]>([])
  const [consumableBatches, setConsumableBatches] = useState<ConsumableBatch[]>([])

  // ---------- form state ----------
  const [donationId, setDonationId] = useState('')
  const [cultureTypeId, setCultureTypeId] = useState('')
  const [extractionMethod, setExtractionMethod] = useState('')
  const [containerTypeId, setContainerTypeId] = useState('')
  const [containerCount, setContainerCount] = useState(1)
  const [positionId, setPositionId] = useState('')
  const [notes, setNotes] = useState('')

  // Media write-off
  const [readyMediumId, setReadyMediumId] = useState('')
  const [mediumVolumePerContainer, setMediumVolumePerContainer] = useState(0)

  // Consumable write-off
  const [writeOffConsumables, setWriteOffConsumables] = useState(false)
  const [consumableBatchId, setConsumableBatchId] = useState('')

  // ---------- UI state ----------
  const [initialLoading, setInitialLoading] = useState(true)
  const [cultureTypesLoading, setCultureTypesLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CreatedResult | null>(null)

  // ---------- load reference data on mount ----------
  useEffect(() => {
    async function load() {
      try {
        const [donationsData, containerTypesData, positionsData, mediaData] = await Promise.all([
          getDonations({ statuses: ['APPROVED', 'QUARANTINE'] }),
          getContainerTypes(),
          getPositions(),
          getAvailableMediaForFeed(),
        ])
        setDonations((donationsData || []) as Donation[])
        // Filter out cryo container types
        const nonCryo = ((containerTypesData || []) as ContainerType[]).filter(
          (ct) => !(ct.category?.toUpperCase().includes('CRYO') || ct.name?.toUpperCase().includes('CRYO'))
        )
        setContainerTypes(nonCryo)
        setPositions((positionsData || []) as Position[])
        setAvailableMedia((mediaData || []) as ReadyMediumOption[])

        // Auto-select donation from URL params
        if (urlDonationId && donationsData) {
          const found = (donationsData as Donation[]).find((d) => d.id === urlDonationId)
          if (found) {
            // Will trigger handleDonationChange via the effect below
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
        toast.warning('Для данного типа ткани не определены типы клеток. Обратитесь к администратору.')
        setCultureTypeOptions([])
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

  // Load consumable batches when container type changes
  useEffect(() => {
    if (!containerTypeId) {
      setConsumableBatches([])
      return
    }
    const ct = containerTypes.find((c) => c.id === containerTypeId)
    if (!ct) return

    getConsumableBatchesForContainerType(ct.name).then((batches) => {
      setConsumableBatches((batches || []) as ConsumableBatch[])
    }).catch(() => {
      setConsumableBatches([])
    })
  }, [containerTypeId, containerTypes])

  // ---------- derived ----------
  const selectedDonation = donations.find((d) => d.id === donationId)
  const selectedMedium = availableMedia.find((m) => m.id === readyMediumId)
  const totalMediumVolume = mediumVolumePerContainer * containerCount
  const mediumAvailable = selectedMedium?.current_volume_ml ?? selectedMedium?.volume_ml ?? 0
  const mediumOverflow = selectedMedium && totalMediumVolume > mediumAvailable

  const selectedConsumable = consumableBatches.find((b) => b.id === consumableBatchId)
  const consumableOverflow = selectedConsumable && containerCount > selectedConsumable.quantity

  const canSubmit =
    donationId &&
    cultureTypeId &&
    extractionMethod &&
    containerTypeId &&
    containerCount >= 1 &&
    !submitting &&
    !consumableOverflow

  // ---------- submit ----------
  const handleSubmit = async () => {
    if (!canSubmit) return

    setSubmitting(true)
    try {
      const res = await createCultureFromDonation({
        donation_id: donationId,
        culture_type_id: cultureTypeId,
        extraction_method: extractionMethod,
        container_type_id: containerTypeId,
        container_count: containerCount,
        position_id: positionId || undefined,
        notes: notes || undefined,
        ready_medium_id: readyMediumId || undefined,
        medium_volume_ml: readyMediumId && totalMediumVolume > 0 ? totalMediumVolume : undefined,
        consumable_batch_id: writeOffConsumables && consumableBatchId ? consumableBatchId : undefined,
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

          {/* 4-6. Container type, count, position */}
          <Card>
            <CardHeader>
              <CardTitle>Контейнеры</CardTitle>
              <CardDescription>Параметры первичных контейнеров культуры</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {/* Container type */}
                <div className="space-y-2">
                  <Label htmlFor="containerType">Тип контейнера *</Label>
                  <Select value={containerTypeId} onValueChange={setContainerTypeId}>
                    <SelectTrigger id="containerType">
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                    <SelectContent>
                      {containerTypes.map((ct) => (
                        <SelectItem key={ct.id} value={ct.id}>
                          {ct.name}{ct.code ? ` (${ct.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Container count */}
                <div className="space-y-2">
                  <Label htmlFor="containerCount">Количество контейнеров *</Label>
                  <Input
                    id="containerCount"
                    type="number"
                    min={1}
                    value={containerCount}
                    onChange={(e) => setContainerCount(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>
              </div>

              {/* Position */}
              <div className="space-y-2">
                <Label htmlFor="position">Позиция размещения</Label>
                <Select value={positionId} onValueChange={setPositionId}>
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Не выбрано" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((pos) => (
                      <SelectItem key={pos.id} value={pos.id}>
                        {pos.path}{pos.equipment?.name ? ` (${pos.equipment.name})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* 7. Питательная среда */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTubes className="h-5 w-5" />
                Питательная среда
              </CardTitle>
              <CardDescription>Среда для первичного посева (необязательно)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Готовая среда</Label>
                  <Select value={readyMediumId} onValueChange={setReadyMediumId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Не выбрано" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMedia.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} ({m.code}) — {m.current_volume_ml ?? m.volume_ml} мл
                          {m.expiration_date ? ` (до ${m.expiration_date})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Объём на контейнер (мл)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={mediumVolumePerContainer || ''}
                    onChange={(e) => setMediumVolumePerContainer(parseFloat(e.target.value) || 0)}
                    disabled={!readyMediumId}
                    placeholder="0"
                  />
                </div>
              </div>

              {readyMediumId && mediumVolumePerContainer > 0 && (
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-muted-foreground">
                    Итого: <strong>{totalMediumVolume.toFixed(1)} мл</strong> ({containerCount} шт. × {mediumVolumePerContainer} мл)
                  </span>
                  {mediumOverflow && (
                    <span className="flex items-center gap-1 text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      Превышает остаток ({mediumAvailable} мл)
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 8. Расходные материалы */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Расходные материалы
              </CardTitle>
              <CardDescription>Списание контейнеров со склада (необязательно)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="writeOff"
                  checked={writeOffConsumables}
                  onCheckedChange={(checked) => {
                    setWriteOffConsumables(checked === true)
                    if (!checked) setConsumableBatchId('')
                  }}
                  disabled={consumableBatches.length === 0}
                />
                <Label htmlFor="writeOff" className="cursor-pointer">
                  Списать контейнеры со склада
                </Label>
              </div>

              {consumableBatches.length === 0 && containerTypeId && (
                <p className="text-sm text-muted-foreground">
                  Нет подходящих расходников на складе для выбранного типа контейнера
                </p>
              )}

              {writeOffConsumables && consumableBatches.length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label>Партия расходников</Label>
                    <Select value={consumableBatchId} onValueChange={setConsumableBatchId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите партию" />
                      </SelectTrigger>
                      <SelectContent>
                        {consumableBatches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.nomenclature?.name ?? b.batch_number} — {b.quantity} шт.
                            {b.expiration_date ? ` (до ${b.expiration_date})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {consumableBatchId && selectedConsumable && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        Будет списано: <strong>{containerCount} шт.</strong> из {selectedConsumable.quantity} шт.
                      </span>
                      {consumableOverflow && (
                        <span className="flex items-center gap-1 text-destructive mt-1">
                          <AlertTriangle className="h-4 w-4" />
                          Недостаточно на складе
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* 9. Notes */}
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
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Контейнер</span>
                <span className="font-medium text-right max-w-[160px] truncate">
                  {containerTypes.find((ct) => ct.id === containerTypeId)?.name || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Кол-во</span>
                <span className="font-medium">{containerCount}</span>
              </div>
              {readyMediumId && totalMediumVolume > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Среда</span>
                  <span className="font-medium">{totalMediumVolume.toFixed(1)} мл</span>
                </div>
              )}
              {writeOffConsumables && consumableBatchId && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Списание</span>
                  <span className="font-medium">{containerCount} шт.</span>
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
