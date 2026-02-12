"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { Eye, Camera, X, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  getLots,
  getContainersByLot,
  getMorphologyTypes,
  createOperationObserve,
  uploadContainerPhoto,
} from '@/lib/api'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

// ---------- types ----------

interface ContainerObservation {
  confluent_percent: number
  morphology: string
  contaminated: boolean
  photos: File[]
}

// ---------- component ----------

function ObservePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // reference data
  const [lots, setLots] = useState<any[]>([])
  const [morphologyTypes, setMorphologyTypes] = useState<any[]>([])

  // form state
  const [selectedLotId, setSelectedLotId] = useState<string>('')
  const [containers, setContainers] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [observations, setObservations] = useState<Record<string, ContainerObservation>>({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  // Unified input mode
  const [unifiedMode, setUnifiedMode] = useState(false)
  const [unifiedValues, setUnifiedValues] = useState<{
    confluent_percent: number
    morphology: string
    contaminated: boolean
  }>({ confluent_percent: 0, morphology: '', contaminated: false })

  // derived
  const selectedLot = lots.find((l) => l.id === selectedLotId)
  const allSelected = containers.length > 0 && selectedIds.length === containers.length

  // ---- data loading ----

  useEffect(() => {
    ;(async () => {
      try {
        const [lotsData, morphData] = await Promise.all([
          getLots({ status: 'ACTIVE' }),
          getMorphologyTypes(),
        ])
        // Filter out banked lots (all containers IN_BANK)
        const selectableLots = (lotsData || []).filter((lot: any) => {
          const conts = lot.containers || []
          if (conts.length === 0) return true
          return !conts.every((c: any) => c.container_status === 'IN_BANK')
        })
        setLots(selectableLots)
        setMorphologyTypes(morphData || [])

        // Auto-bind from URL params
        const paramLotId = searchParams.get('lot_id')
        const paramContainerId = searchParams.get('container_id')
        if (paramLotId) {
          setSelectedLotId(paramLotId)
          const containersData = await getContainersByLot(paramLotId)
          // Filter out DISPOSE/USED containers
          const activeContainers = (containersData || []).filter((c: any) => {
            const st = c.container_status || c.status
            return st !== 'DISPOSE' && st !== 'USED'
          })
          setContainers(activeContainers)
          // If a specific container_id was passed, auto-select it
          if (paramContainerId && containersData?.some((c: any) => c.id === paramContainerId)) {
            setSelectedIds([paramContainerId])
            const container = containersData.find((c: any) => c.id === paramContainerId)
            if (container) {
              setObservations({
                [paramContainerId]: {
                  confluent_percent: container.confluent_percent ?? 0,
                  morphology: container.morphology ?? '',
                  contaminated: container.contaminated ?? false,
                  photos: [],
                },
              })
            }
          }
        }
      } catch (err) {
        console.error('Error loading reference data:', err)
        toast.error('Не удалось загрузить справочные данные')
      }
    })()
  }, [searchParams])

  const loadContainers = useCallback(async (lotId: string) => {
    try {
      const data = await getContainersByLot(lotId)
      // Filter out DISPOSE/USED containers — no further operations possible
      const active = (data || []).filter((c: any) => {
        const st = c.container_status || c.status
        return st !== 'DISPOSE' && st !== 'USED'
      })
      setContainers(active)
      setSelectedIds([])
      setObservations({})
    } catch (err) {
      console.error('Error loading containers:', err)
      toast.error('Не удалось загрузить контейнеры')
    }
  }, [])

  // ---- handlers ----

  const handleLotChange = (lotId: string) => {
    setSelectedLotId(lotId)
    loadContainers(lotId)
  }

  const initObservation = (container: any): ContainerObservation => ({
    confluent_percent: container?.confluent_percent ?? 0,
    morphology: container?.morphology ?? '',
    contaminated: container?.contaminated ?? false,
    photos: [],
  })

  const toggleContainer = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      // initialise observation entry when selecting
      if (!observations[id] && !prev.includes(id)) {
        const container = containers.find((c) => c.id === id)
        setObservations((o) => ({
          ...o,
          [id]: initObservation(container),
        }))
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      const allIds = containers.map((c) => c.id)
      setSelectedIds(allIds)
      // init observations for every container that doesn't have one yet
      const newObs = { ...observations }
      for (const c of containers) {
        if (!newObs[c.id]) {
          newObs[c.id] = initObservation(c)
        }
      }
      setObservations(newObs)
    }
  }

  const updateObservation = (
    id: string,
    field: keyof ContainerObservation,
    value: number | string | boolean | File[],
  ) => {
    setObservations((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }))
  }

  // Apply unified values to all selected containers
  const applyUnifiedToAll = () => {
    const newObs = { ...observations }
    for (const id of selectedIds) {
      newObs[id] = {
        ...newObs[id],
        confluent_percent: unifiedValues.confluent_percent,
        morphology: unifiedValues.morphology,
        contaminated: unifiedValues.contaminated,
      }
    }
    setObservations(newObs)
  }

  // When unified mode is toggled on, propagate values
  const handleUnifiedModeChange = (checked: boolean) => {
    setUnifiedMode(checked)
    if (checked && selectedIds.length > 0) {
      // Take values from first selected container as default
      const firstObs = observations[selectedIds[0]]
      if (firstObs) {
        setUnifiedValues({
          confluent_percent: firstObs.confluent_percent,
          morphology: firstObs.morphology,
          contaminated: firstObs.contaminated,
        })
      }
    }
  }

  // When unified values change, apply to all
  const updateUnifiedValue = (field: keyof typeof unifiedValues, value: number | string | boolean) => {
    const newUnified = { ...unifiedValues, [field]: value }
    setUnifiedValues(newUnified)
    // Apply to all selected containers immediately
    const newObs = { ...observations }
    for (const id of selectedIds) {
      if (newObs[id]) {
        newObs[id] = { ...newObs[id], [field]: value }
      }
    }
    setObservations(newObs)
  }

  // Photo handlers
  const addPhoto = (containerId: string, file: File) => {
    setObservations((prev) => ({
      ...prev,
      [containerId]: {
        ...prev[containerId],
        photos: [...(prev[containerId]?.photos || []), file],
      },
    }))
  }

  const removePhoto = (containerId: string, index: number) => {
    setObservations((prev) => ({
      ...prev,
      [containerId]: {
        ...prev[containerId],
        photos: prev[containerId].photos.filter((_, i) => i !== index),
      },
    }))
  }

  // ---- submit ----

  const canSubmit =
    selectedLotId &&
    selectedIds.length > 0 &&
    selectedIds.every((id) => {
      const obs = observations[id]
      return obs && obs.morphology !== ''
    })

  const handleSubmit = async () => {
    if (!canSubmit) return

    setLoading(true)
    try {
      const containerPayloads = selectedIds.map((id) => ({
        container_id: id,
        confluent_percent: observations[id].confluent_percent,
        morphology: observations[id].morphology,
        contaminated: observations[id].contaminated,
      }))

      const operation = await createOperationObserve({
        lot_id: selectedLotId,
        containers: containerPayloads,
        notes: notes || undefined,
      })

      // Upload photos per container
      let photoCount = 0
      for (const id of selectedIds) {
        const obs = observations[id]
        if (obs?.photos?.length > 0) {
          for (const photo of obs.photos) {
            try {
              await uploadContainerPhoto(id, operation.id, photo)
              photoCount++
            } catch (err) {
              console.error('Failed to upload photo:', err)
            }
          }
        }
      }

      toast.success('Наблюдение зарегистрировано', {
        description: `Данные сохранены для ${selectedIds.length} контейнеров${photoCount > 0 ? `, ${photoCount} фото загружено` : ''}`,
      })

      // Return to culture card
      const cultureId = selectedLot?.culture_id || selectedLot?.culture?.id
      if (cultureId) {
        router.push(`/cultures/${cultureId}`)
      } else {
        router.push(`/lots/${selectedLotId}`)
      }
    } catch (err) {
      console.error('Error creating observation:', err)
      toast.error('Ошибка при сохранении наблюдения')
    } finally {
      setLoading(false)
    }
  }

  // ---- render ----

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Наблюдение</h1>
        <p className="text-muted-foreground">
          Регистрация наблюдения за контейнерами в лоте
        </p>
      </div>

      {/* Main form card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Новое наблюдение
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ===== 1. Lot selection ===== */}
          <div className="space-y-2">
            <Label>Лот</Label>
            <Select value={selectedLotId} onValueChange={handleLotChange} disabled={!!searchParams.get('lot_id')}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите лот..." />
              </SelectTrigger>
              <SelectContent>
                {lots.map((lot) => (
                  <SelectItem key={lot.id} value={lot.id}>
                    {lot.lot_number} &mdash;{' '}
                    {lot.culture?.name || lot.culture?.culture_type?.name || 'Культура'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ===== Lot info ===== */}
          {selectedLot && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3 bg-muted/40">
              <Badge variant="secondary">
                {selectedLot.culture?.name || selectedLot.culture?.culture_type?.name || '---'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Пассаж:{' '}
                <span className="font-medium text-foreground">
                  P{selectedLot.passage_number ?? '?'}
                </span>
              </span>
              <span className="text-sm text-muted-foreground">
                Контейнеров в лоте:{' '}
                <span className="font-medium text-foreground">{containers.length}</span>
              </span>
            </div>
          )}

          {/* ===== 2. Container selection ===== */}
          {selectedLotId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Контейнеры ({containers.length})</Label>
                <div className="flex items-center gap-4">
                  {containers.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                      />
                      Выбрать все
                    </button>
                  )}
                </div>
              </div>

              {/* ===== Unified mode toggle ===== */}
              {selectedIds.length > 1 && (
                <div className="flex items-center gap-3 p-3 rounded-lg border bg-blue-50/50 border-blue-200">
                  <Switch
                    checked={unifiedMode}
                    onCheckedChange={handleUnifiedModeChange}
                  />
                  <div className="flex-1">
                    <Label className="text-sm font-medium cursor-pointer" onClick={() => handleUnifiedModeChange(!unifiedMode)}>
                      Единые показатели для всех контейнеров
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Одно значение конфлюэнтности, морфологии и контаминации для {selectedIds.length} контейнеров
                    </p>
                  </div>
                  {unifiedMode && (
                    <Badge variant="secondary" className="text-xs">
                      <Copy className="h-3 w-3 mr-1" />
                      {selectedIds.length} шт.
                    </Badge>
                  )}
                </div>
              )}

              {/* ===== Unified inputs ===== */}
              {unifiedMode && selectedIds.length > 1 && (
                <div className="p-4 rounded-lg border-2 border-blue-300 bg-blue-50/30 space-y-4">
                  <p className="text-sm font-medium text-blue-800">
                    Общие показатели (применяются ко всем {selectedIds.length} контейнерам)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Confluence */}
                    <div className="space-y-1">
                      <Label className="text-xs">Конфлюэнтность, %</Label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={unifiedValues.confluent_percent}
                        onChange={(e) =>
                          updateUnifiedValue(
                            'confluent_percent',
                            Math.min(100, Math.max(0, Number(e.target.value))),
                          )
                        }
                      />
                    </div>

                    {/* Morphology */}
                    <div className="space-y-1">
                      <Label className="text-xs">Морфология</Label>
                      <Select
                        value={unifiedValues.morphology}
                        onValueChange={(v) => updateUnifiedValue('morphology', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите..." />
                        </SelectTrigger>
                        <SelectContent>
                          {morphologyTypes.map((mt) => (
                            <SelectItem key={mt.id} value={mt.code || mt.name}>
                              {mt.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Contamination */}
                    <div className="flex items-end pb-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="contam-unified"
                          checked={unifiedValues.contaminated}
                          onCheckedChange={(v) =>
                            updateUnifiedValue('contaminated', v as boolean)
                          }
                        />
                        <Label
                          htmlFor="contam-unified"
                          className="text-xs cursor-pointer text-red-600"
                        >
                          Контаминация
                        </Label>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {containers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <Eye className="h-8 w-8 mx-auto mb-2 opacity-20" />
                  <p>Нет контейнеров в выбранном лоте</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {containers.map((container) => {
                    const isSelected = selectedIds.includes(container.id)
                    const obs = observations[container.id]

                    return (
                      <div
                        key={container.id}
                        className={`border rounded-lg transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                      >
                        {/* Row: checkbox + basic info */}
                        <div
                          className="flex items-center gap-3 p-3 cursor-pointer"
                          onClick={() => toggleContainer(container.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleContainer(container.id)}
                          />
                          <div className="flex-1 flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{container.code}</Badge>
                            {container.morphology && (
                              <Badge variant="secondary" className="text-xs">
                                {container.morphology}
                              </Badge>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground whitespace-nowrap">
                            Конфлюэнтность:{' '}
                            <span
                              className={
                                (container.confluent_percent || 0) >= 90
                                  ? 'text-green-600 font-medium'
                                  : (container.confluent_percent || 0) >= 70
                                    ? 'text-orange-600 font-medium'
                                    : ''
                              }
                            >
                              {container.confluent_percent ?? 0}%
                            </span>
                          </span>
                        </div>

                        {/* Expanded: per-container inputs */}
                        {isSelected && obs && (
                          <div className="border-t px-3 pb-3 pt-3 space-y-3">
                            {/* Metrics inputs — shown only in individual mode */}
                            {!unifiedMode && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {/* Confluence */}
                                <div className="space-y-1">
                                  <Label className="text-xs">Конфлюэнтность, %</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={100}
                                    value={obs.confluent_percent}
                                    onChange={(e) =>
                                      updateObservation(
                                        container.id,
                                        'confluent_percent',
                                        Math.min(100, Math.max(0, Number(e.target.value))),
                                      )
                                    }
                                  />
                                </div>

                                {/* Morphology */}
                                <div className="space-y-1">
                                  <Label className="text-xs">Морфология</Label>
                                  <Select
                                    value={obs.morphology}
                                    onValueChange={(v) =>
                                      updateObservation(container.id, 'morphology', v)
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Выберите..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {morphologyTypes.map((mt) => (
                                        <SelectItem key={mt.id} value={mt.code || mt.name}>
                                          {mt.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {/* Contamination */}
                                <div className="flex items-end pb-1">
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`contam-${container.id}`}
                                      checked={obs.contaminated}
                                      onCheckedChange={(v) =>
                                        updateObservation(container.id, 'contaminated', v as boolean)
                                      }
                                    />
                                    <Label
                                      htmlFor={`contam-${container.id}`}
                                      className="text-xs cursor-pointer text-red-600"
                                    >
                                      Контаминация
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* In unified mode, show a summary instead */}
                            {unifiedMode && (
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <Badge variant="outline" className="text-xs bg-blue-50">
                                  Конфл.: {obs.confluent_percent}%
                                </Badge>
                                <Badge variant="outline" className="text-xs bg-blue-50">
                                  {obs.morphology || '—'}
                                </Badge>
                                {obs.contaminated && (
                                  <Badge variant="destructive" className="text-xs">
                                    Контаминация
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* ===== Per-container photo upload ===== */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Camera className="h-3.5 w-3.5 text-muted-foreground" />
                                <Label className="text-xs text-muted-foreground">
                                  Фото контейнера {container.code}
                                </Label>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {obs.photos.map((file, idx) => (
                                  <div
                                    key={idx}
                                    className="relative group border rounded-md p-1 bg-muted/50"
                                  >
                                    <span className="text-xs truncate max-w-[120px] block px-1">
                                      {file.name}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removePhoto(container.id, idx)}
                                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                ))}
                                <label className="cursor-pointer flex items-center gap-1 text-xs text-primary hover:text-primary/80 border border-dashed rounded-md px-2 py-1">
                                  <Camera className="h-3.5 w-3.5" />
                                  Добавить фото
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        addPhoto(container.id, file)
                                        e.target.value = '' // reset for re-upload
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== 3. Notes ===== */}
          <div className="space-y-2">
            <Label>Примечания</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительные наблюдения..."
              rows={3}
            />
          </div>

          {/* ===== 4. Actions ===== */}
          <div className="flex justify-end gap-4 pt-2">
            <Button variant="outline" onClick={() => router.back()}>
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
              {loading ? 'Сохранение...' : 'Зарегистрировать наблюдение'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ObservePage() {
  return (
    <Suspense fallback={<div className="container py-6 text-center text-muted-foreground">Загрузка...</div>}>
      <ObservePageInner />
    </Suspense>
  )
}
