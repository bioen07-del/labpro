"use client"

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { RefreshCw, AlertCircle } from 'lucide-react'
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
import { getLots, getContainersByLot, getAvailableMediaForFeed, createOperationFeed } from '@/lib/api'

function FeedPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // --- state ---
  const [lots, setLots] = useState<any[]>([])
  const [selectedLotId, setSelectedLotId] = useState<string>('')

  const [containers, setContainers] = useState<any[]>([])
  const [containersLoading, setContainersLoading] = useState(false)
  const [selectedContainers, setSelectedContainers] = useState<string[]>([])

  const [media, setMedia] = useState<any[]>([])
  const [selectedMediumId, setSelectedMediumId] = useState<string>('')

  const [volumeMl, setVolumeMl] = useState<string>('')
  const [notes, setNotes] = useState<string>('')

  const [submitting, setSubmitting] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // --- derived ---
  const selectedMedium = media.find((m: any) => m.id === selectedMediumId)
  const isFefo = selectedMediumId !== '' && media.length > 0 && media[0].id === selectedMediumId
  const earliestMedium = media.length > 0 ? media[0] : null

  // --- initial data load ---
  useEffect(() => {
    const load = async () => {
      try {
        const [lotsData, mediaData] = await Promise.all([
          getLots({ status: 'ACTIVE' }),
          getAvailableMediaForFeed(),
        ])
        setLots(lotsData || [])
        setMedia(mediaData || [])

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
  const canSubmit =
    selectedLotId !== '' &&
    selectedContainers.length > 0 &&
    selectedMediumId !== '' &&
    volumeMl !== '' &&
    Number(volumeMl) > 0

  const handleSubmit = async () => {
    if (!canSubmit) return

    setSubmitting(true)
    try {
      const containersPayload = selectedContainers.map(containerId => ({
        container_id: containerId,
        medium_id: selectedMediumId,
        volume_ml: Number(volumeMl),
      }))

      await createOperationFeed({
        lot_id: selectedLotId,
        containers: containersPayload,
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

          {/* 3. Ready medium selection */}
          <div className="space-y-2">
            <Label htmlFor="medium">Готовая среда</Label>
            <Select value={selectedMediumId} onValueChange={setSelectedMediumId}>
              <SelectTrigger id="medium">
                <SelectValue placeholder="Выберите среду..." />
              </SelectTrigger>
              <SelectContent>
                {media.map((m: any, index: number) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.code || m.name}
                    {m.expiration_date && ` | до ${formatDate(m.expiration_date)}`}
                    {m.current_volume_ml != null && ` | ${m.current_volume_ml} мл`}
                    {index === 0 && ' (FEFO)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* FEFO indicator / warning */}
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
                    {selectedMedium.name || selectedMedium.code}
                    {selectedMedium.expiration_date &&
                      ` | Годен до: ${formatDate(selectedMedium.expiration_date)}`}
                    {selectedMedium.current_volume_ml != null &&
                      ` | Остаток: ${selectedMedium.current_volume_ml} мл`}
                  </span>
                )}
              </div>
            )}

            {selectedMediumId && !isFefo && earliestMedium && (
              <Alert className="mt-2 border-yellow-300 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Внимание: по принципу FEFO следует использовать среду{' '}
                  <strong>{earliestMedium.code || earliestMedium.name}</strong> (годна до{' '}
                  {formatDate(earliestMedium.expiration_date)}).
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* 4. Volume per container */}
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
            {selectedMedium &&
              selectedContainers.length > 0 &&
              volumeMl !== '' &&
              Number(volumeMl) > 0 &&
              Number(volumeMl) * selectedContainers.length >
                (selectedMedium.current_volume_ml ?? 0) && (
                <Alert className="border-red-300 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Недостаточно среды. Требуется{' '}
                    {(Number(volumeMl) * selectedContainers.length).toFixed(1)} мл, доступно{' '}
                    {selectedMedium.current_volume_ml ?? 0} мл.
                  </AlertDescription>
                </Alert>
              )}
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
