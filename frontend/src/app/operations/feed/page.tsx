"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RefreshCw, AlertCircle, Plus, X, Beaker } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { getLots, getContainersByLot, getAvailableMediaByUsage, getAvailableMediaForFeed, getReagentBatches, buildMediaOptions, parseMediumId, createOperationFeed } from '@/lib/api'
import { NOMENCLATURE_CATEGORY_LABELS } from '@/types'

function generateRowId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function FeedPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // --- state ---
  const [lots, setLots] = useState<any[]>([])
  const [selectedLotId, setSelectedLotId] = useState<string>('')

  const [containers, setContainers] = useState<any[]>([])
  const [containersLoading, setContainersLoading] = useState(false)
  const [selectedContainers, setSelectedContainers] = useState<string[]>([])

  const [mediaOptions, setMediaOptions] = useState<{ id: string; label: string; type: 'ready_medium' | 'batch'; category?: string }[]>([])
  const [selectedMediumId, setSelectedMediumId] = useState<string>('')
  const [mediaCategoryFilter, setMediaCategoryFilter] = useState<string>('all')

  const [volumeMl, setVolumeMl] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  // Individual feeding mode: per-container media + volume
  const [individualMode, setIndividualMode] = useState(false)
  const [perContainerMedia, setPerContainerMedia] = useState<Record<string, string>>({})  // containerId -> mediumId
  const [perContainerVolume, setPerContainerVolume] = useState<Record<string, string>>({}) // containerId -> volume

  // Additional components (serum, reagent, additive) — use ALL media, not usage-filtered
  const [allMediaOptions, setAllMediaOptions] = useState<{ id: string; label: string; type: 'ready_medium' | 'batch'; category?: string }[]>([])
  const [additionalComponents, setAdditionalComponents] = useState<
    { id: string; mediumId: string; volumeMl: string; categoryFilter: string }[]
  >([])

  const [submitting, setSubmitting] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // --- derived ---
  const filteredMediaOptions = mediaCategoryFilter === 'all'
    ? mediaOptions
    : mediaOptions.filter(opt => opt.category === mediaCategoryFilter)
  const selectedMedium = mediaOptions.find((m) => m.id === selectedMediumId)
  const isFefo = selectedMediumId !== '' && mediaOptions.length > 0 && mediaOptions[0].id === selectedMediumId
  const earliestMedium = mediaOptions.length > 0 ? mediaOptions[0] : null

  // --- initial data load ---
  useEffect(() => {
    const load = async () => {
      try {
        const [lotsData, mediaResult, allRM, allReagents] = await Promise.all([
          getLots({ status: 'ACTIVE' }),
          getAvailableMediaByUsage('FEED'),
          getAvailableMediaForFeed(),   // all ready media (for additional components)
          getReagentBatches(),           // all batches (for additional components)
        ])
        // Filter out banked lots (all containers IN_BANK)
        const selectableLots = (lotsData || []).filter((lot: any) => {
          const conts = lot.containers || []
          if (conts.length === 0) return true
          return !conts.every((c: any) => c.container_status === 'IN_BANK')
        })
        setLots(selectableLots)
        setMediaOptions(buildMediaOptions(mediaResult.readyMedia, mediaResult.reagentBatches))
        setAllMediaOptions(buildMediaOptions(allRM, allReagents))

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

  // --- load containers when lot changes ---
  const loadContainers = useCallback(async (lotId: string) => {
    setContainersLoading(true)
    try {
      const data = await getContainersByLot(lotId)
      setContainers(data || [])
      setSelectedContainers([])
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
    setSelectedContainers([])
    loadContainers(lotId)
  }

  // --- container selection ---
  const toggleContainer = (containerId: string) => {
    setSelectedContainers(prev =>
      prev.includes(containerId)
        ? prev.filter(id => id !== containerId)
        : [...prev, containerId]
    )
  }

  const toggleAll = () => {
    if (selectedContainers.length === containers.length) {
      setSelectedContainers([])
    } else {
      setSelectedContainers(containers.map((c: any) => c.id))
    }
  }

  // --- format helpers ---
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '---'
    try {
      return new Date(dateStr).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  // --- submit ---
  const canSubmit = (() => {
    if (selectedLotId === '' || selectedContainers.length === 0) return false
    if (individualMode) {
      return selectedContainers.every(cid =>
        perContainerMedia[cid] && perContainerVolume[cid] && Number(perContainerVolume[cid]) > 0
      )
    }
    return selectedMediumId !== '' && volumeMl !== '' && Number(volumeMl) > 0
  })()

  const handleSubmit = async () => {
    if (!canSubmit) return

    setSubmitting(true)
    try {
      const containersPayload = selectedContainers.map(containerId => {
        const combinedId = individualMode ? perContainerMedia[containerId] : selectedMediumId
        const parsed = parseMediumId(combinedId)
        return {
          container_id: containerId,
          medium_id: parsed?.type === 'ready_medium' ? parsed.id : undefined,
          batch_id: parsed?.type === 'batch' ? parsed.id : undefined,
          volume_ml: individualMode ? Number(perContainerVolume[containerId]) : Number(volumeMl),
        }
      })

      // Build additional components for API
      const validAdditionalComponents = additionalComponents
        .filter((c: { mediumId: string; volumeMl: string }) => c.mediumId && parseFloat(c.volumeMl) > 0)
        .map((c: { mediumId: string; volumeMl: string }) => ({
          medium_id: c.mediumId,
          volume_ml: parseFloat(c.volumeMl) * selectedContainers.length,
        }))

      await createOperationFeed({
        lot_id: selectedLotId,
        containers: containersPayload,
        additional_components: validAdditionalComponents.length > 0 ? validAdditionalComponents : undefined,
        notes: notes || undefined,
      })

      toast.success('Кормление выполнено', {
        description: `Обработано контейнеров: ${selectedContainers.length}`,
      })

      // Return to culture card
      const lot = lots.find((l: any) => l.id === selectedLotId)
      const cultureId = lot?.culture_id || lot?.culture?.id
      if (cultureId) {
        router.push(`/cultures/${cultureId}`)
      } else {
        router.push(`/lots/${selectedLotId}`)
      }
    } catch (error: any) {
      console.error('Error creating feed operation:', error)
      toast.error('Ошибка выполнения операции', {
        description: error?.message || 'Попробуйте ещё раз',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // --- render ---
  if (initialLoading) {
    return (
      <div className="container py-6">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6 text-center">
            <RefreshCw className="h-8 w-8 mx-auto animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Загрузка данных...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Кормление культур</h1>
        <p className="text-muted-foreground">
          Регистрация операции замены питательной среды
        </p>
      </div>

      {/* Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Новая операция кормления
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 1. Lot selection */}
          <div className="space-y-2">
            <Label htmlFor="lot">Лот</Label>
            <Select value={selectedLotId} onValueChange={handleLotChange} disabled={!!searchParams.get('lot_id')}>
              <SelectTrigger id="lot">
                <SelectValue placeholder="Выберите лот..." />
              </SelectTrigger>
              <SelectContent>
                {lots.map((lot: any) => (
                  <SelectItem key={lot.id} value={lot.id}>
                    {lot.lot_number} &mdash; {lot.culture?.name || lot.culture?.culture_type?.name || 'Культура'}
                    {lot.passage_number != null && ` (P${lot.passage_number})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Containers */}
          {selectedLotId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>
                  Контейнеры
                  {containers.length > 0 && (
                    <span className="text-muted-foreground font-normal ml-1">
                      ({selectedContainers.length} / {containers.length})
                    </span>
                  )}
                </Label>
                {containers.length > 1 && (
                  <Button variant="outline" size="sm" onClick={toggleAll}>
                    {selectedContainers.length === containers.length
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
                <div className="grid gap-2 max-h-64 overflow-y-auto border rounded-lg p-2">
                  {containers.map((container: any) => {
                    const isSelected = selectedContainers.includes(container.id)
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
                            {container.container_type?.name && (
                              <span className="text-sm text-muted-foreground">
                                {container.container_type.name}
                              </span>
                            )}
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

          {/* 3. Feeding mode toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="individual-mode"
              checked={individualMode}
              onCheckedChange={(checked) => setIndividualMode(checked === true)}
            />
            <Label htmlFor="individual-mode" className="cursor-pointer text-sm">
              Индивидуальное кормление (разная среда/объём для каждого контейнера)
            </Label>
          </div>

          {!individualMode ? (
            <>
              {/* 3a. Shared medium selection (ready_media + batches) */}
              <div className="space-y-2">
                <Label htmlFor="medium">Среда / реагент</Label>
                <div className="flex gap-2">
                  <Select value={mediaCategoryFilter} onValueChange={setMediaCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Категория" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все категории</SelectItem>
                      {Object.entries(NOMENCLATURE_CATEGORY_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedMediumId} onValueChange={setSelectedMediumId}>
                    <SelectTrigger id="medium" className="flex-1">
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
                </div>

                {/* FEFO indicator */}
                {selectedMediumId && (
                  <div className="flex items-center gap-2 mt-1">
                    {isFefo ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        FEFO ✓
                      </Badge>
                    ) : (
                      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
                        Не FEFO ⚠
                      </Badge>
                    )}

                    {selectedMedium && (
                      <span className="text-sm text-muted-foreground">
                        {selectedMedium.label}
                      </span>
                    )}
                  </div>
                )}

                {selectedMediumId && !isFefo && earliestMedium && (
                  <Alert className="mt-2 border-yellow-300 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                      Внимание: по принципу FEFO следует использовать{' '}
                      <strong>{earliestMedium.label}</strong>.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* 4a. Shared volume per container */}
              <div className="space-y-2">
                <Label htmlFor="volume">Объём на контейнер, мл</Label>
                <Input
                  id="volume"
                  type="number"
                  min={0}
                  step="0.1"
                  placeholder="Введите объём (мл)..."
                  value={volumeMl}
                  onChange={e => setVolumeMl(e.target.value)}
                />
                {selectedContainers.length > 0 && volumeMl !== '' && Number(volumeMl) > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Итого: {(Number(volumeMl) * selectedContainers.length).toFixed(1)} мл на{' '}
                    {selectedContainers.length} контейнер(ов)
                  </p>
                )}
                {/* Volume warning removed — combined options don't carry volume info */}
              </div>
            </>
          ) : (
            /* 3b+4b. Individual per-container media + volume */
            selectedContainers.length > 0 && (
              <div className="space-y-3">
                <Label>Среда и объём для каждого контейнера</Label>
                {selectedContainers.map(cid => {
                  const container = containers.find((c: any) => c.id === cid)
                  return (
                    <div key={cid} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{container?.code || cid}</Badge>
                        {container?.container_type?.name && (
                          <span className="text-xs text-muted-foreground">{container.container_type.name}</span>
                        )}
                        {container?.confluent_percent != null && (
                          <span className="text-xs text-muted-foreground">Конф: {container.confluent_percent}%</span>
                        )}
                      </div>
                      <div className="grid gap-2 md:grid-cols-[1fr_120px]">
                        <Select
                          value={perContainerMedia[cid] || ''}
                          onValueChange={(val) => setPerContainerMedia(prev => ({ ...prev, [cid]: val }))}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Выберите среду..." />
                          </SelectTrigger>
                          <SelectContent>
                            {mediaOptions.map((opt, index) => (
                              <SelectItem key={opt.id} value={opt.id}>
                                {opt.type === 'batch' ? '📦 ' : '🧪 '}{opt.label}
                                {index === 0 && ' FEFO'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={0}
                          step="0.1"
                          placeholder="мл"
                          className="h-8 text-xs"
                          value={perContainerVolume[cid] || ''}
                          onChange={(e) => setPerContainerVolume(prev => ({ ...prev, [cid]: e.target.value }))}
                        />
                      </div>
                    </div>
                  )
                })}
                {/* Total volume summary */}
                {selectedContainers.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    Итого: {selectedContainers.reduce((sum, cid) => sum + (Number(perContainerVolume[cid]) || 0), 0).toFixed(1)} мл
                    на {selectedContainers.length} контейнер(ов)
                  </p>
                )}
              </div>
            )
          )}

          {/* 4.5. Additional components */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Beaker className="h-4 w-4" />
                Дополнительные компоненты
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">Сыворотка, реагенты, добавки — необязательно</p>

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
                {comp.volumeMl && parseFloat(comp.volumeMl) > 0 && selectedContainers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Итого: {(parseFloat(comp.volumeMl) * selectedContainers.length).toFixed(1)} мл ({selectedContainers.length} × {comp.volumeMl} мл)
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
          </div>

          {/* 5. Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Примечания</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Дополнительная информация (необязательно)..."
              rows={3}
            />
          </div>

          {/* 6. Actions */}
          <div className="flex justify-end gap-4 pt-2">
            <Button variant="outline" onClick={() => router.back()} disabled={submitting}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                'Выполнить кормление'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function FeedPage() {
  return (
    <Suspense fallback={<div className="container py-6 text-center text-muted-foreground">Загрузка...</div>}>
      <FeedPageInner />
    </Suspense>
  )
}
