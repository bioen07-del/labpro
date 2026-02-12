"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import {
  ArrowLeft,
  CheckCircle2,
  Snowflake,
  RefreshCw,
  AlertCircle,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  getBanks,
  getCryoVials,
  getAvailableMediaByUsage,
  getAvailableMediaForFeed,
  getReagentBatches,
  buildMediaOptions,
  parseMediumId,
  getContainerTypes,
  getPositions,
  createOperationThaw,
  getAllConsumableBatches,
} from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { NOMENCLATURE_CATEGORY_LABELS } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BankItem {
  id: string
  code: string
  bank_type: string // MCB | WCB
  status: string
  passage_number: number
  vials_total?: number
  vials_used?: number
  freeze_date?: string
  culture_id?: string
  culture?: {
    id: string
    name: string
    culture_type?: { name: string }
  }
  [key: string]: unknown
}

interface VialItem {
  id: string
  code: string
  vial_number: string
  cells_count?: number
  status: string
  position?: { path?: string; [key: string]: unknown }
  [key: string]: unknown
}

interface ContainerTypeItem {
  id: string
  name: string
  is_cryo?: boolean
  category?: string
  [key: string]: unknown
}

interface PositionItem {
  id: string
  path: string
  is_active?: boolean
  equipment?: { name?: string }
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = [
  'Выбор банка',
  'Выбор виал',
  'Параметры',
  'Подтверждение',
] as const

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

function ThawPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // -- wizard step --
  const [step, setStep] = useState(1)

  // -- loading states --
  const [initialLoading, setInitialLoading] = useState(true)
  const [vialsLoading, setVialsLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // -- reference data --
  const [banks, setBanks] = useState<BankItem[]>([])
  const [vials, setVials] = useState<VialItem[]>([])
  const [mediaOptions, setMediaOptions] = useState<{ id: string; label: string; type: 'ready_medium' | 'batch'; category?: string }[]>([])
  const [containerTypes, setContainerTypes] = useState<ContainerTypeItem[]>([])
  const [positions, setPositions] = useState<PositionItem[]>([])

  // -- form data --
  const [selectedBank, setSelectedBank] = useState<BankItem | null>(null)
  const [selectedVials, setSelectedVials] = useState<VialItem[]>([])
  const [thawMediumId, setThawMediumId] = useState('')
  const [thawMediumVolume, setThawMediumVolume] = useState('')
  const [containerTypeId, setContainerTypeId] = useState('')
  const [positionId, setPositionId] = useState('')
  const [viabilityPercent, setViabilityPercent] = useState('')
  const [notes, setNotes] = useState('')
  const [mediaCategoryFilter, setMediaCategoryFilter] = useState('all')
  const [consumableBatches, setConsumableBatches] = useState<any[]>([])
  const [consumableBatchId, setConsumableBatchId] = useState('')
  // Additional components — use ALL media, not usage-filtered
  const [allMediaOptions, setAllMediaOptions] = useState<{ id: string; label: string; type: 'ready_medium' | 'batch'; category?: string }[]>([])
  const [additionalComponents, setAdditionalComponents] = useState<
    { id: string; mediumId: string; volumeMl: string; categoryFilter: string }[]
  >([])

  // -- derived --
  const filteredMediaOptions = mediaCategoryFilter === 'all'
    ? mediaOptions
    : mediaOptions.filter(opt => opt.category === mediaCategoryFilter)

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  useEffect(() => {
    const load = async () => {
      try {
        const [banksData, mediaResult, ctData, posData, consumables, allRM, allReagents] = await Promise.all([
          getBanks({ status: 'APPROVED' }),
          getAvailableMediaByUsage('THAW'),
          getContainerTypes(),
          getPositions({ is_active: true }),
          getAllConsumableBatches(),
          getAvailableMediaForFeed(),   // all ready media (for additional components)
          getReagentBatches(),           // all batches (for additional components)
        ])
        setBanks(banksData || [])
        setMediaOptions(buildMediaOptions(mediaResult.readyMedia, mediaResult.reagentBatches))
        setConsumableBatches(consumables || [])
        setAllMediaOptions(buildMediaOptions(allRM, allReagents))
        // Filter out cryo container types
        const nonCryo = (ctData || []).filter(
          (ct: ContainerTypeItem) =>
            !ct.is_cryo &&
            ct.category !== 'CRYO' &&
            !ct.name?.toLowerCase().includes('cryo') &&
            !ct.name?.toLowerCase().includes('криовиал')
        )
        setContainerTypes(nonCryo)
        setPositions(posData || [])

        // Auto-bind from URL params
        const paramBankId = searchParams.get('bank_id')
        if (paramBankId && banksData) {
          const bank = banksData.find((b: BankItem) => b.id === paramBankId)
          if (bank) {
            setSelectedBank(bank)
            // Load vials for selected bank
            setVialsLoading(true)
            try {
              const vialsData = await getCryoVials({ bank_id: paramBankId, status: 'IN_STOCK' })
              setVials(vialsData || [])
            } catch (err) {
              console.error('Error loading vials from URL param:', err)
            } finally {
              setVialsLoading(false)
            }
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

  const loadVials = useCallback(async (bankId: string) => {
    setVialsLoading(true)
    try {
      const data = await getCryoVials({ bank_id: bankId, status: 'IN_STOCK' })
      setVials(data || [])
      setSelectedVials([])
    } catch (error) {
      console.error('Error loading vials:', error)
      toast.error('Ошибка загрузки криовиал')
      setVials([])
    } finally {
      setVialsLoading(false)
    }
  }, [])

  // -----------------------------------------------------------------------
  // Bank selection
  // -----------------------------------------------------------------------

  const handleBankSelect = (bank: BankItem) => {
    setSelectedBank(bank)
    setSelectedVials([])
    loadVials(bank.id)
  }

  // Count available vials for a bank
  const availableVialsCount = (bank: BankItem) => {
    const total = bank.vials_total ?? 0
    const used = bank.vials_used ?? 0
    return total - used
  }

  // -----------------------------------------------------------------------
  // Vial selection
  // -----------------------------------------------------------------------

  const toggleVial = (vial: VialItem) => {
    setSelectedVials((prev) => {
      const exists = prev.find((v) => v.id === vial.id)
      if (exists) return prev.filter((v) => v.id !== vial.id)
      return [...prev, vial]
    })
  }

  const toggleAllVials = () => {
    if (selectedVials.length === vials.length) {
      setSelectedVials([])
    } else {
      setSelectedVials([...vials])
    }
  }

  // -----------------------------------------------------------------------
  // Validation helpers
  // -----------------------------------------------------------------------

  const canGoNext = (): boolean => {
    switch (step) {
      case 1:
        return selectedBank !== null
      case 2:
        return selectedVials.length > 0
      case 3:
        return thawMediumId !== '' && containerTypeId !== ''
      default:
        return true
    }
  }

  // -----------------------------------------------------------------------
  // Submit
  // -----------------------------------------------------------------------

  const handleSubmit = async () => {
    if (!selectedBank || selectedVials.length === 0 || !thawMediumId || !containerTypeId) return

    setSubmitting(true)
    try {
      const parsed = parseMediumId(thawMediumId)
      // Build additional components for API
      const validAdditionalComponents = additionalComponents
        .filter(c => c.mediumId && parseFloat(c.volumeMl) > 0)
        .map(c => ({ medium_id: c.mediumId, volume_ml: parseFloat(c.volumeMl) }))

      for (const vial of selectedVials) {
        await createOperationThaw({
          cryo_vial_id: vial.id,
          container_type_id: containerTypeId,
          position_id: positionId,
          thaw_medium_id: parsed?.type === 'ready_medium' ? parsed.id : undefined,
          thaw_batch_id: parsed?.type === 'batch' ? parsed.id : undefined,
          thaw_medium_volume_ml: thawMediumVolume ? Number(thawMediumVolume) : undefined,
          consumable_batch_id: (consumableBatchId && consumableBatchId !== 'none') ? consumableBatchId : undefined,
          additional_components: validAdditionalComponents.length > 0 ? validAdditionalComponents : undefined,
          viability_percent: viabilityPercent ? Number(viabilityPercent) : undefined,
          notes: notes || undefined,
        })
      }

      toast.success('Разморозка выполнена', {
        description: `Разморожено виал: ${selectedVials.length}`,
      })

      // Return to culture card
      const cultureId = selectedBank?.culture_id
      if (cultureId) {
        router.push(`/cultures/${cultureId}`)
      } else {
        router.push('/operations')
      }
    } catch (error: any) {
      console.error('Error creating thaw operation:', error)
      toast.error('Ошибка выполнения разморозки', {
        description: error?.message || 'Попробуйте ещё раз',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // -----------------------------------------------------------------------
  // Helpers for display
  // -----------------------------------------------------------------------

  const bankTypeBadge = (bankType: string) => {
    if (bankType === 'MCB' || bankType === 'MASTER') {
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
          MCB
        </Badge>
      )
    }
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
        WCB
      </Badge>
    )
  }

  const selectedMedium = mediaOptions.find((m) => m.id === thawMediumId)
  const selectedContainerType = containerTypes.find((ct) => ct.id === containerTypeId)
  const selectedPosition = positions.find((p) => p.id === positionId)

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

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

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="container py-6 space-y-6 max-w-4xl">
      {/* ---- Header ---- */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Snowflake className="h-7 w-7" />
            Разморозка
          </h1>
          <p className="text-muted-foreground">
            Извлечение клеток из криобанка для культивирования
          </p>
        </div>
      </div>

      {/* ---- Step indicator ---- */}
      <div className="flex items-center gap-2 flex-wrap">
        {STEPS.map((label, i) => {
          const stepNum = i + 1
          const isCompleted = step > stepNum
          const isCurrent = step === stepNum
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  transition-colors
                  ${isCompleted
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }
                `}
              >
                {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : stepNum}
              </div>
              <span
                className={`text-sm ${
                  isCompleted || isCurrent ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 ${
                    isCompleted ? 'bg-primary' : 'bg-border'
                  }`}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* ==================================================================
          STEP 1: SELECT BANK
         ================================================================== */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Выберите банк</CardTitle>
            <CardDescription>
              Выберите одобренный клеточный банк для разморозки
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {banks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>Нет одобренных банков для разморозки</p>
                  <p className="text-sm mt-1">Банки должны иметь статус APPROVED</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {banks.map((bank) => {
                    const isSelected = selectedBank?.id === bank.id
                    const available = availableVialsCount(bank)
                    return (
                      <div
                        key={bank.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary'
                            : 'hover:border-muted-foreground/50'
                        }`}
                        onClick={() => handleBankSelect(bank)}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="font-mono">
                                {bank.code}
                              </Badge>
                              {bankTypeBadge(bank.bank_type)}
                            </div>
                            <p className="text-sm">
                              {bank.culture?.name || 'Культура'}
                              {bank.culture?.culture_type?.name &&
                                ` / ${bank.culture.culture_type.name}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Пассаж: P{bank.passage_number ?? '-'}
                              {bank.freeze_date &&
                                ` | Дата заморозки: ${formatDate(bank.freeze_date)}`}
                            </p>
                          </div>
                          <Badge variant="secondary" className="whitespace-nowrap">
                            {available} виал доступно
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================================================================
          STEP 2: SELECT VIALS
         ================================================================== */}
      {step === 2 && selectedBank && (
        <Card>
          <CardHeader>
            <CardTitle>Выберите криовиалы</CardTitle>
            <CardDescription>
              Банк: <strong>{selectedBank.code}</strong>{' '}
              {bankTypeBadge(selectedBank.bank_type)}
              {' '}&mdash; выберите виалы для разморозки
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vialsLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2" />
                  <p>Загрузка криовиал...</p>
                </div>
              ) : vials.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>Нет доступных виал (IN_STOCK) в этом банке</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Выбрано: {selectedVials.length} из {vials.length}
                    </p>
                    <Button variant="outline" size="sm" onClick={toggleAllVials}>
                      {selectedVials.length === vials.length ? 'Снять все' : 'Выбрать все'}
                    </Button>
                  </div>

                  <div className="grid gap-2 max-h-96 overflow-y-auto border rounded-lg p-2">
                    {vials.map((vial) => {
                      const isSelected = !!selectedVials.find((v) => v.id === vial.id)
                      return (
                        <div
                          key={vial.id}
                          className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleVial(vial)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleVial(vial)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="font-mono">
                                {vial.code || `V-${vial.vial_number}`}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                #{vial.vial_number}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {vial.position?.path || 'Позиция не указана'}
                            </p>
                          </div>
                          <div className="text-sm text-right whitespace-nowrap">
                            <span className="text-muted-foreground">Клеток: </span>
                            <span className="font-medium">
                              {vial.cells_count?.toLocaleString('ru-RU') || 'N/A'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================================================================
          STEP 3: PARAMETERS
         ================================================================== */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Параметры разморозки</CardTitle>
            <CardDescription>
              Укажите среду, контейнер и дополнительные параметры
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Category filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Фильтр по категории</Label>
              <Select value={mediaCategoryFilter} onValueChange={setMediaCategoryFilter}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Все категории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {Object.entries(NOMENCLATURE_CATEGORY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Thaw medium (required) */}
            <div className="space-y-2">
              <Label htmlFor="thaw-medium">
                Среда для разморозки <span className="text-destructive">*</span>
              </Label>
              <div className="grid gap-2 grid-cols-[1fr_100px]">
                <Select value={thawMediumId} onValueChange={setThawMediumId}>
                  <SelectTrigger id="thaw-medium">
                    <SelectValue placeholder="Выберите среду..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredMediaOptions.map((opt, index) => (
                      <SelectItem key={opt.id} value={opt.id}>
                        {opt.type === 'batch' ? '📦 ' : '🧪 '}{opt.label}
                        {index === 0 && ' (FEFO)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  placeholder="мл"
                  value={thawMediumVolume}
                  onChange={(e) => setThawMediumVolume(e.target.value)}
                />
              </div>
              {mediaOptions.length === 0 && (
                <p className="text-sm text-destructive">
                  Нет доступных сред. Сначала подготовьте среду.
                </p>
              )}
            </div>

            {/* Container type (required, no cryo) */}
            <div className="space-y-2">
              <Label htmlFor="container-type">
                Тип контейнера для результата <span className="text-destructive">*</span>
              </Label>
              <Select value={containerTypeId} onValueChange={setContainerTypeId}>
                <SelectTrigger id="container-type">
                  <SelectValue placeholder="Выберите тип контейнера..." />
                </SelectTrigger>
                <SelectContent>
                  {containerTypes.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      {ct.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Position (optional) */}
            <div className="space-y-2">
              <Label htmlFor="position">Позиция размещения</Label>
              <PositionTreeSelect
                positions={positions}
                value={positionId}
                onValueChange={setPositionId}
                placeholder="Авторазмещение (необязательно)"
                equipmentTypeFilter="INCUBATOR"
              />
            </div>

            {/* Viability (optional) */}
            <div className="space-y-2">
              <Label htmlFor="viability">Жизнеспособность после разморозки (%)</Label>
              <Input
                id="viability"
                type="number"
                min={0}
                max={100}
                step={0.1}
                placeholder="Необязательно"
                value={viabilityPercent}
                onChange={(e) => setViabilityPercent(e.target.value)}
              />
            </div>

            {/* Consumable batch (container from warehouse) */}
            {consumableBatches.length > 0 && (
              <div className="space-y-2">
                <Label>Контейнер со склада</Label>
                <p className="text-xs text-muted-foreground">Списать расходный контейнер из складских запасов</p>
                <Select value={consumableBatchId} onValueChange={setConsumableBatchId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Не списывать (необязательно)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не списывать</SelectItem>
                    {consumableBatches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.nomenclature?.name || b.batch_number} ({b.quantity} шт.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Additional components (serum, reagent, additive) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Beaker className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Дополнительные компоненты</Label>
              </div>
              <p className="text-xs text-muted-foreground">Сыворотка, добавки — необязательно</p>
              {additionalComponents.map((comp, idx) => {
                const compOptions = comp.categoryFilter === 'all'
                  ? allMediaOptions
                  : allMediaOptions.filter(o => o.category === comp.categoryFilter)
                return (
                <div key={comp.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Компонент {idx + 1}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => setAdditionalComponents(prev => prev.filter(c => c.id !== comp.id))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid gap-2 md:grid-cols-[auto_1fr_100px]">
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
                    <Select value={comp.mediumId}
                      onValueChange={(val) => setAdditionalComponents(prev =>
                        prev.map(c => c.id === comp.id ? { ...c, mediumId: val } : c))}>
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
                    <Input type="number" min={0} step={0.1} className="h-8 text-xs" placeholder="мл"
                      value={comp.volumeMl}
                      onChange={(e) => setAdditionalComponents(prev =>
                        prev.map(c => c.id === comp.id ? { ...c, volumeMl: e.target.value } : c))} />
                  </div>
                </div>
                )
              })}
              <Button type="button" variant="outline" size="sm" className="w-full"
                onClick={() => setAdditionalComponents(prev => [...prev, { id: Math.random().toString(36).substring(2, 9), mediumId: '', volumeMl: '', categoryFilter: 'all' }])}>
                <Plus className="h-4 w-4 mr-2" /> Добавить компонент
              </Button>
            </div>

            {/* Notes (optional) */}
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
          </CardContent>
        </Card>
      )}

      {/* ==================================================================
          STEP 4: CONFIRMATION
         ================================================================== */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Подтверждение разморозки</CardTitle>
            <CardDescription>
              Проверьте данные перед выполнением операции
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Bank info */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                Банк
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Код:</span>
                <span className="font-medium">{selectedBank?.code}</span>

                <span className="text-muted-foreground">Тип:</span>
                <span>{bankTypeBadge(selectedBank?.bank_type || '')}</span>

                <span className="text-muted-foreground">Культура:</span>
                <span>
                  {selectedBank?.culture?.name || '-'}
                  {selectedBank?.culture?.culture_type?.name &&
                    ` / ${selectedBank.culture.culture_type.name}`}
                </span>

                <span className="text-muted-foreground">Пассаж:</span>
                <span>P{selectedBank?.passage_number ?? '-'}</span>
              </div>
            </div>

            {/* Selected vials */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                Криовиалы ({selectedVials.length} шт.)
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedVials.map((vial) => (
                  <Badge key={vial.id} variant="outline" className="font-mono">
                    {vial.code || `V-${vial.vial_number}`}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Parameters */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-medium text-sm uppercase tracking-wide text-muted-foreground">
                Параметры
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-muted-foreground">Среда:</span>
                <span className="font-medium">
                  {selectedMedium?.label || thawMediumId}
                </span>

                <span className="text-muted-foreground">Контейнер:</span>
                <span className="font-medium">
                  {selectedContainerType?.name || containerTypeId}
                </span>

                <span className="text-muted-foreground">Позиция:</span>
                <span>
                  {selectedPosition?.path || 'Авторазмещение'}
                </span>

                {viabilityPercent && (
                  <>
                    <span className="text-muted-foreground">Жизнеспособность:</span>
                    <span>{viabilityPercent}%</span>
                  </>
                )}

                {notes && (
                  <>
                    <span className="text-muted-foreground">Примечания:</span>
                    <span className="whitespace-pre-wrap">{notes}</span>
                  </>
                )}
              </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-2 p-3 bg-green-50 text-green-800 rounded-lg border border-green-200">
              <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium">
                  Будет выполнена разморозка {selectedVials.length}{' '}
                  {selectedVials.length === 1 ? 'виалы' : 'виал'}
                </p>
                <p className="text-green-700 mt-0.5">
                  Для каждой виалы будет создан новый лот с контейнером-результатом.
                  Криовиалы получат статус THAWED.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ==================================================================
          NAVIGATION
         ================================================================== */}
      <div className="flex justify-between pt-2">
        <Button
          variant="outline"
          onClick={() => {
            if (step === 1) {
              router.back()
            } else {
              setStep((s) => s - 1)
            }
          }}
          disabled={submitting}
        >
          {step === 1 ? 'Отмена' : 'Назад'}
        </Button>

        {step < 4 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext()}
          >
            Далее
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Выполнение...
              </>
            ) : (
              <>
                <Snowflake className="h-4 w-4 mr-2" />
                Выполнить разморозку
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

export default function ThawPage() {
  return (
    <Suspense fallback={<div className="container py-6 text-center text-muted-foreground">Загрузка...</div>}>
      <ThawPageInner />
    </Suspense>
  )
}
