"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  getLots,
  getContainersByLot,
  getBatches,
  getReadyMedia,
  getDisposeReasons,
  createOperationDispose,
} from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TargetType = 'container' | 'batch' | 'ready_medium'

interface DisposeReason {
  id: string
  code: string
  name: string
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

function DisposePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // ---- target type --------------------------------------------------------
  const [targetType, setTargetType] = useState<TargetType>('container')

  // ---- dispose reasons ----------------------------------------------------
  const [disposeReasons, setDisposeReasons] = useState<DisposeReason[]>([])
  const [reason, setReason] = useState<string>('')

  // ---- container flow -----------------------------------------------------
  const [lots, setLots] = useState<any[]>([])
  const [selectedLotId, setSelectedLotId] = useState<string>('')
  const [containers, setContainers] = useState<any[]>([])
  const [selectedContainerIds, setSelectedContainerIds] = useState<string[]>([])

  // ---- batch flow ---------------------------------------------------------
  const [batches, setBatches] = useState<any[]>([])
  const [selectedBatchId, setSelectedBatchId] = useState<string>('')

  // ---- ready medium flow --------------------------------------------------
  const [readyMedia, setReadyMedia] = useState<any[]>([])
  const [selectedReadyMediumId, setSelectedReadyMediumId] = useState<string>('')

  // ---- common -------------------------------------------------------------
  const [notes, setNotes] = useState<string>('')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // =========================================================================
  // Data loading
  // =========================================================================

  useEffect(() => {
    async function loadInitial() {
      try {
        const [reasonsData, lotsData, batchesData, rmData] = await Promise.all([
          getDisposeReasons(),
          getLots({ status: 'ACTIVE' }),
          getBatches({ status: 'ACTIVE' }),
          getReadyMedia({ status: 'ACTIVE' }),
        ])
        setDisposeReasons(reasonsData || [])
        setLots(lotsData || [])
        setBatches(batchesData || [])
        setReadyMedia(rmData || [])

        // Auto-bind from URL params
        const paramType = searchParams.get('type') as TargetType | null
        const paramId = searchParams.get('id')
        const paramLotId = searchParams.get('lot_id')

        if (paramType && ['container', 'batch', 'ready_medium'].includes(paramType)) {
          setTargetType(paramType)
        }

        if (paramType === 'container' && paramId) {
          // Find which lot the container belongs to, or just select it
          // The link passes ?type=container&id=X from container detail page
          // We need to find the lot and load containers
          // For now we'll just pre-select the container when its lot is found
          for (const lot of (lotsData || [])) {
            try {
              const containersData = await getContainersByLot(lot.id)
              const filtered = (containersData || []).filter((c: any) => (c.container_status || c.status) !== 'DISPOSE')
              if (filtered.some((c: any) => c.id === paramId)) {
                setSelectedLotId(lot.id)
                setContainers(filtered)
                setSelectedContainerIds([paramId])
                break
              }
            } catch (_) {
              // continue
            }
          }
        } else if (paramLotId) {
          setTargetType('container')
          setSelectedLotId(paramLotId)
          try {
            const data = await getContainersByLot(paramLotId)
            setContainers((data || []).filter((c: any) => (c.container_status || c.status) !== 'DISPOSE'))
          } catch (err) {
            console.error('Error loading containers from URL param:', err)
          }
        }
      } catch (error) {
        console.error('Error loading initial data:', error)
        toast.error('Ошибка загрузки данных')
      } finally {
        setInitialLoading(false)
      }
    }
    loadInitial()
  }, [searchParams])

  // Load containers when lot changes
  const handleLotChange = useCallback(async (lotId: string) => {
    setSelectedLotId(lotId)
    setSelectedContainerIds([])
    if (!lotId) {
      setContainers([])
      return
    }
    try {
      const data = await getContainersByLot(lotId)
      // Only show containers that are not already disposed
      setContainers((data || []).filter((c: any) => (c.container_status || c.status) !== 'DISPOSE'))
    } catch (error) {
      console.error('Error loading containers:', error)
      toast.error('Ошибка загрузки контейнеров')
    }
  }, [])

  // =========================================================================
  // Reset selections when target type changes
  // =========================================================================

  const handleTargetTypeChange = (type: TargetType) => {
    setTargetType(type)
    setSelectedLotId('')
    setContainers([])
    setSelectedContainerIds([])
    setSelectedBatchId('')
    setSelectedReadyMediumId('')
    setReason('')
    setNotes('')
    setConfirmed(false)
  }

  // =========================================================================
  // Container checkboxes
  // =========================================================================

  const toggleContainer = (id: string) => {
    setSelectedContainerIds(prev =>
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    )
  }

  const toggleSelectAll = () => {
    if (selectedContainerIds.length === containers.length) {
      setSelectedContainerIds([])
    } else {
      setSelectedContainerIds(containers.map((c: any) => c.id))
    }
  }

  const allSelected = containers.length > 0 && selectedContainerIds.length === containers.length

  // =========================================================================
  // Validation
  // =========================================================================

  const isValid = (() => {
    if (!reason || !confirmed) return false

    switch (targetType) {
      case 'container':
        return selectedLotId !== '' && selectedContainerIds.length > 0
      case 'batch':
        return selectedBatchId !== ''
      case 'ready_medium':
        return selectedReadyMediumId !== ''
      default:
        return false
    }
  })()

  // Count of items being disposed
  const disposeCount = (() => {
    switch (targetType) {
      case 'container':
        return selectedContainerIds.length
      case 'batch':
        return selectedBatchId ? 1 : 0
      case 'ready_medium':
        return selectedReadyMediumId ? 1 : 0
      default:
        return 0
    }
  })()

  // =========================================================================
  // Submit
  // =========================================================================

  const handleSubmit = async () => {
    if (!isValid) return

    setLoading(true)
    try {
      if (targetType === 'container') {
        // Dispose each selected container
        for (const containerId of selectedContainerIds) {
          await createOperationDispose({
            target_type: 'container',
            target_id: containerId,
            reason,
            notes: notes || undefined,
          })
        }
      } else if (targetType === 'batch') {
        await createOperationDispose({
          target_type: 'batch',
          target_id: selectedBatchId,
          reason,
          notes: notes || undefined,
        })
      } else if (targetType === 'ready_medium') {
        await createOperationDispose({
          target_type: 'ready_medium',
          target_id: selectedReadyMediumId,
          reason,
          notes: notes || undefined,
        })
      }

      toast.success(`Утилизация выполнена (${disposeCount} объектов)`)
      // Return to culture card if came from a lot
      if (targetType === 'container' && selectedLotId) {
        const lot = lots.find((l: any) => l.id === selectedLotId)
        const cultureId = lot?.culture_id || lot?.culture?.id
        if (cultureId) {
          router.push(`/cultures/${cultureId}`)
        } else {
          router.push(`/lots/${selectedLotId}`)
        }
      } else {
        router.push('/operations')
      }
    } catch (error) {
      console.error('Dispose error:', error)
      toast.error('Ошибка при утилизации. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  // =========================================================================
  // Render
  // =========================================================================

  if (initialLoading) {
    return (
      <div className="container py-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Утилизация</h1>
        <p className="text-muted-foreground">
          Утилизация контейнеров, партий и готовых сред
        </p>
      </div>

      {/* Warning banner */}
      <Alert variant="destructive" className="border-red-300 bg-red-50 text-red-800">
        <AlertTriangle className="h-5 w-5 !text-red-600" />
        <AlertDescription className="text-red-700">
          <span className="font-semibold">Внимание!</span> Утилизация необратима.
          После подтверждения объекты будут помечены как утилизированные и не смогут
          быть восстановлены.
        </AlertDescription>
      </Alert>

      {/* Main form card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Форма утилизации
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ============================================================= */}
          {/* Step 1: Target type (radio buttons) */}
          {/* ============================================================= */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Тип объекта</Label>
            <div className="flex flex-wrap gap-4">
              {([
                { value: 'container' as TargetType, label: 'Контейнер' },
                { value: 'batch' as TargetType, label: 'Партия (Batch)' },
                { value: 'ready_medium' as TargetType, label: 'Готовая среда (RM)' },
              ]).map(option => (
                <label
                  key={option.value}
                  className={`flex items-center gap-2 cursor-pointer rounded-lg border px-4 py-2.5 transition-colors ${
                    targetType === option.value
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="target_type"
                    value={option.value}
                    checked={targetType === option.value}
                    onChange={() => handleTargetTypeChange(option.value)}
                    className="accent-red-600"
                  />
                  <span className="text-sm font-medium">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ============================================================= */}
          {/* Step 2: Target selection (depends on type) */}
          {/* ============================================================= */}

          {/* ---- Container flow ----------------------------------------- */}
          {targetType === 'container' && (
            <>
              {/* Lot selector */}
              <div className="space-y-2">
                <Label>Лот культуры</Label>
                <Select value={selectedLotId} onValueChange={handleLotChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите лот..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lots.map((lot: any) => (
                      <SelectItem key={lot.id} value={lot.id}>
                        {lot.lot_number} &mdash; {lot.culture?.name || lot.culture?.culture_type?.name || ''}
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
                      Контейнеры{' '}
                      {containers.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {selectedContainerIds.length} / {containers.length}
                        </Badge>
                      )}
                    </Label>

                    {containers.length > 0 && (
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-sm text-red-600 hover:underline"
                      >
                        {allSelected ? 'Снять все' : 'Выбрать все'}
                      </button>
                    )}
                  </div>

                  {containers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground border rounded-lg">
                      <Trash2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                      <p>Нет доступных контейнеров в выбранном лоте</p>
                    </div>
                  ) : (
                    <div className="grid gap-2 max-h-72 overflow-y-auto rounded-lg border p-2">
                      {containers.map((container: any) => {
                        const isSelected = selectedContainerIds.includes(container.id)
                        return (
                          <div
                            key={container.id}
                            className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                              isSelected
                                ? 'border-red-500 bg-red-50'
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
                                  <span className="text-sm text-muted-foreground truncate">
                                    {container.container_type.name}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-right shrink-0">
                              <span className="text-muted-foreground">Статус: </span>
                              <Badge variant="outline" className="text-xs">
                                {container.status}
                              </Badge>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ---- Batch flow --------------------------------------------- */}
          {targetType === 'batch' && (
            <div className="space-y-2">
              <Label>Партия (Batch)</Label>
              <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите партию..." />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((batch: any) => (
                    <SelectItem key={batch.id} value={batch.id}>
                      {batch.batch_number || batch.code || batch.id} &mdash;{' '}
                      {batch.nomenclature?.name || ''}{' '}
                      {batch.expiration_date
                        ? `(годен до ${new Date(batch.expiration_date).toLocaleDateString('ru-RU')})`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {batches.length === 0 && (
                <p className="text-sm text-muted-foreground">Нет активных партий</p>
              )}
            </div>
          )}

          {/* ---- Ready Medium flow -------------------------------------- */}
          {targetType === 'ready_medium' && (
            <div className="space-y-2">
              <Label>Готовая среда (Ready Medium)</Label>
              <Select value={selectedReadyMediumId} onValueChange={setSelectedReadyMediumId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите готовую среду..." />
                </SelectTrigger>
                <SelectContent>
                  {readyMedia.map((rm: any) => (
                    <SelectItem key={rm.id} value={rm.id}>
                      {rm.code || rm.id} &mdash; {rm.name || ''}{' '}
                      {rm.expiration_date
                        ? `(годен до ${new Date(rm.expiration_date).toLocaleDateString('ru-RU')})`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {readyMedia.length === 0 && (
                <p className="text-sm text-muted-foreground">Нет активных готовых сред</p>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* Step 3: Reason */}
          {/* ============================================================= */}
          <div className="space-y-2">
            <Label>Причина утилизации</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите причину..." />
              </SelectTrigger>
              <SelectContent>
                {disposeReasons.map((r) => (
                  <SelectItem key={r.id} value={r.code || r.name}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ============================================================= */}
          {/* Step 4: Notes */}
          {/* ============================================================= */}
          <div className="space-y-2">
            <Label>Примечания</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация (необязательно)..."
              rows={3}
            />
          </div>

          {/* ============================================================= */}
          {/* Step 5: Confirmation */}
          {/* ============================================================= */}
          <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-300 rounded-lg">
            <Checkbox
              id="confirm-dispose"
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(v as boolean)}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor="confirm-dispose" className="cursor-pointer text-red-800 font-medium">
                Я подтверждаю утилизацию выбранных объектов
              </Label>
              {disposeCount > 0 && (
                <p className="text-sm text-red-600 mt-1">
                  Будет утилизировано: <strong>{disposeCount}</strong>{' '}
                  {targetType === 'container'
                    ? declOfContainers(disposeCount)
                    : targetType === 'batch'
                    ? declOfBatches(disposeCount)
                    : declOfMedia(disposeCount)}
                </p>
              )}
            </div>
          </div>

          {/* ============================================================= */}
          {/* Step 6: Actions */}
          {/* ============================================================= */}
          <div className="flex justify-end gap-4 pt-2">
            <Button variant="outline" onClick={() => router.back()} disabled={loading}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={!isValid || loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Утилизация...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Утилизировать
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function DisposePage() {
  return (
    <Suspense fallback={<div className="container py-6 text-center text-muted-foreground">Загрузка...</div>}>
      <DisposePageInner />
    </Suspense>
  )
}

// ---------------------------------------------------------------------------
// Helpers: Russian declension for counts
// ---------------------------------------------------------------------------

function declOfContainers(n: number): string {
  const abs = Math.abs(n) % 100
  const n1 = abs % 10
  if (abs > 10 && abs < 20) return 'контейнеров'
  if (n1 > 1 && n1 < 5) return 'контейнера'
  if (n1 === 1) return 'контейнер'
  return 'контейнеров'
}

function declOfBatches(n: number): string {
  const abs = Math.abs(n) % 100
  const n1 = abs % 10
  if (abs > 10 && abs < 20) return 'партий'
  if (n1 > 1 && n1 < 5) return 'партии'
  if (n1 === 1) return 'партия'
  return 'партий'
}

function declOfMedia(n: number): string {
  const abs = Math.abs(n) % 100
  const n1 = abs % 10
  if (abs > 10 && abs < 20) return 'сред'
  if (n1 > 1 && n1 < 5) return 'среды'
  if (n1 === 1) return 'среда'
  return 'сред'
}
