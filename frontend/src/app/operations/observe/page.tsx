"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { Eye } from 'lucide-react'
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
import {
  getLots,
  getContainersByLot,
  getMorphologyTypes,
  createOperationObserve,
} from '@/lib/api'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

// ---------- types ----------

interface ContainerObservation {
  confluent_percent: number
  morphology: string
  contaminated: boolean
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
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

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
        setLots(lotsData || [])
        setMorphologyTypes(morphData || [])

        // Auto-bind from URL params
        const paramLotId = searchParams.get('lot_id')
        const paramContainerId = searchParams.get('container_id')
        if (paramLotId) {
          setSelectedLotId(paramLotId)
          const containersData = await getContainersByLot(paramLotId)
          setContainers(containersData || [])
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
      setContainers(data || [])
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

  const toggleContainer = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      // initialise observation entry when selecting
      if (!observations[id] && !prev.includes(id)) {
        const container = containers.find((c) => c.id === id)
        setObservations((o) => ({
          ...o,
          [id]: {
            confluent_percent: container?.confluent_percent ?? 0,
            morphology: container?.morphology ?? '',
            contaminated: container?.contaminated ?? false,
          },
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
          newObs[c.id] = {
            confluent_percent: c.confluent_percent ?? 0,
            morphology: c.morphology ?? '',
            contaminated: c.contaminated ?? false,
          }
        }
      }
      setObservations(newObs)
    }
  }

  const updateObservation = (
    id: string,
    field: keyof ContainerObservation,
    value: number | string | boolean,
  ) => {
    setObservations((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
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

      await createOperationObserve({
        lot_id: selectedLotId,
        containers: containerPayloads,
        notes: notes || undefined,
      })

      toast.success('Наблюдение зарегистрировано', {
        description: `Данные сохранены для ${selectedIds.length} контейнеров`,
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
                          <div className="border-t px-3 pb-3 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
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

          {/* ===== 4. Photo upload placeholder ===== */}
          <div className="space-y-2">
            <Label>Фото (необязательно)</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
            />
            {photoFile && (
              <p className="text-xs text-muted-foreground">
                Выбрано: {photoFile.name}
              </p>
            )}
          </div>

          {/* ===== 5. Actions ===== */}
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
