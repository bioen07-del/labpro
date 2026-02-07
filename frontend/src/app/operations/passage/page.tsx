"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FlaskConical,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  getContainers,
  getPositions,
  getContainerTypes,
  createOperationPassage
} from '@/lib/api'

export default function PassagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  // Множественный выбор контейнеров-источников
  const [selectedContainers, setSelectedContainers] = useState<any[]>([])
  const [lotInfo, setLotInfo] = useState<any>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Метрики
  const [metrics, setMetrics] = useState({
    concentration: 0,
    volume_ml: 0,
    viability_percent: 0,
    morphology: '',
    contaminated: false,
  })

  // Результат пассажа
  const [passageResult, setPassageResult] = useState({
    splitRatio: '1:2',
    newContainers: 2,
    newPassageNumber: 1,
  })

  // Целевые контейнеры
  const [targetContainers, setTargetContainers] = useState<any[]>([])

  const [notes, setNotes] = useState('')

  // Данные для выбора
  const [containers, setContainers] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [containerTypes, setContainerTypes] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [containersData, positionsData, containerTypesData] = await Promise.all([
        getContainers({ status: 'IN_CULTURE' }),
        getPositions({ is_active: true }),
        getContainerTypes()
      ])
      setContainers(containersData || [])
      setPositions(positionsData || [])
      setContainerTypes(containerTypesData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const toggleContainerSelection = (container: any) => {
    const isSelected = selectedContainers.some(c => c.id === container.id)

    if (isSelected) {
      const updated = selectedContainers.filter(c => c.id !== container.id)
      setSelectedContainers(updated)
      if (updated.length === 0) {
        setLotInfo(null)
      }
    } else {
      // All selected containers must be from the same lot
      if (selectedContainers.length > 0 && container.lot_id !== selectedContainers[0].lot_id) {
        return // ignore — different lot
      }
      setSelectedContainers([...selectedContainers, container])
      if (container.lot) {
        setLotInfo(container.lot)
        setPassageResult(prev => ({
          ...prev,
          newPassageNumber: (container.lot.passage_number || 0) + 1
        }))
      }
    }
  }

  // Расчёт количества целевых контейнеров
  const calculateTargets = (ratio: string) => {
    const ratioMap: Record<string, number> = {
      '1:1': 1, '1:2': 2, '1:3': 3, '1:4': 4, '1:5': 5, '1:6': 6
    }
    const count = (ratioMap[ratio] || 2) * selectedContainers.length
    setPassageResult(prev => ({ ...prev, splitRatio: ratio, newContainers: count }))

    const newTargets = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      position: null,
      containerType: containerTypes[0]?.id || '',
    }))
    setTargetContainers(newTargets)
  }

  const addTargetContainer = () => {
    setTargetContainers([...targetContainers, {
      id: Date.now(),
      position: null,
      containerType: containerTypes[0]?.id || '',
    }])
    setPassageResult(prev => ({ ...prev, newContainers: targetContainers.length + 1 }))
  }

  const removeTargetContainer = (id: number) => {
    if (targetContainers.length <= 1) return
    setTargetContainers(targetContainers.filter(t => t.id !== id))
    setPassageResult(prev => ({ ...prev, newContainers: targetContainers.length - 1 }))
  }

  const handleSubmit = async () => {
    if (selectedContainers.length === 0 || targetContainers.length === 0) return

    setLoading(true)
    try {
      await createOperationPassage({
        source_lot_id: lotInfo.id,
        source_containers: selectedContainers.map(c => ({
          container_id: c.id,
          split_ratio: 1,
          confluent_percent: c.confluent_percent || 0,
          viability_percent: metrics.viability_percent,
          concentration: metrics.concentration,
          volume_ml: metrics.volume_ml,
        })),
        result: {
          container_type_id: targetContainers[0].containerType,
          target_count: targetContainers.length,
          position_id: targetContainers[0].position?.id || '',
        },
        metrics: {
          concentration: metrics.concentration,
          volume_ml: metrics.volume_ml,
          viability_percent: metrics.viability_percent,
        },
        media: {},
        split_mode: targetContainers.length > selectedContainers.length ? 'full' : 'partial',
        notes: `Пассаж P${lotInfo?.passage_number} → P${passageResult.newPassageNumber}. Split ${passageResult.splitRatio}. Из ${selectedContainers.length} конт. → ${targetContainers.length} конт. ${notes}`,
      })

      router.push(`/cultures/${lotInfo?.culture_id}`)
    } catch (error) {
      console.error('Error creating passage:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter containers by search and confluence >= 70%
  const readyContainers = containers
    .filter(c => c.container_status === 'IN_CULTURE' && (c.confluent_percent || 0) >= 70)
    .filter(c => !searchQuery || c.code?.toLowerCase().includes(searchQuery.toLowerCase()))

  // Group by lot for display
  const containersByLot = readyContainers.reduce((acc: Record<string, any[]>, c) => {
    const lotId = c.lot_id || 'unknown'
    if (!acc[lotId]) acc[lotId] = []
    acc[lotId].push(c)
    return acc
  }, {})

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/operations">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Пассажирование</h1>
          <p className="text-muted-foreground">
            Пересев культуры в новые контейнеры с увеличением пассажа
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-4">
        {['Выбор контейнеров', 'Метрики', 'Результат', 'Подтверждение'].map((s, i) => (
          <div key={i} className={`flex items-center gap-2 ${step > i ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step > i ? 'bg-primary text-primary-foreground' : step === i + 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}>
              {step > i ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            <span className="text-sm">{s}</span>
            {i < 3 && <div className="w-8 h-0.5 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Containers (multiple) */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Выберите контейнеры-источники</CardTitle>
            <CardDescription>
              Выберите один или несколько контейнеров из одного лота для пассажирования (мин. 70% конфлюэнтности)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Поиск по коду..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {selectedContainers.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-800">
                    Выбрано: {selectedContainers.length} контейнер(ов) из лота P{lotInfo?.passage_number}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedContainers.map(c => (
                      <Badge key={c.id} variant="secondary">{c.code}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-3">
                {Object.entries(containersByLot).map(([lotId, lotContainers]) => (
                  <div key={lotId} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Лот: {lotContainers[0]?.lot?.culture?.name} — P{lotContainers[0]?.lot?.passage_number}
                    </p>
                    {lotContainers.map((container: any) => {
                      const isSelected = selectedContainers.some(c => c.id === container.id)
                      const isDifferentLot = selectedContainers.length > 0 && container.lot_id !== selectedContainers[0].lot_id
                      return (
                        <div
                          key={container.id}
                          className={`p-4 border rounded-lg transition-colors ${
                            isDifferentLot
                              ? 'opacity-40 cursor-not-allowed'
                              : isSelected
                                ? 'border-primary bg-primary/5 cursor-pointer'
                                : 'hover:border-muted-foreground cursor-pointer'
                          }`}
                          onClick={() => !isDifferentLot && toggleContainerSelection(container)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <Checkbox checked={isSelected} disabled={isDifferentLot} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{container.code}</Badge>
                                  <Badge variant="secondary">
                                    P{container.lot?.passage_number || 0}
                                  </Badge>
                                </div>
                                <p className="mt-1 text-sm">
                                  {container.lot?.culture?.name} &bull; {container.container_type?.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Конфлюэнтность: {container.confluent_percent}% &bull;
                                  Морфология: {container.morphology || 'не указана'}
                                </p>
                              </div>
                            </div>
                            <Badge variant={container.confluent_percent >= 80 ? 'default' : 'secondary'}>
                              {container.confluent_percent}%
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>

              {readyContainers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Нет готовых к пассажу контейнеров (минимум 70% конфлюэнтности)
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Metrics */}
      {step === 2 && selectedContainers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Метрики культуры</CardTitle>
            <CardDescription>
              Введите измеренные параметры культуры (суммарно по {selectedContainers.length} контейнерам)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Концентрация (клеток/мл)</Label>
                <Input
                  type="number"
                  value={metrics.concentration}
                  onChange={(e) => setMetrics({...metrics, concentration: parseInt(e.target.value) || 0})}
                  placeholder="Например: 50000"
                />
              </div>
              <div className="space-y-2">
                <Label>Объём (мл)</Label>
                <Input
                  type="number"
                  value={metrics.volume_ml}
                  onChange={(e) => setMetrics({...metrics, volume_ml: parseFloat(e.target.value) || 0})}
                  placeholder="Например: 10"
                />
              </div>
              <div className="space-y-2">
                <Label>Жизнеспособность (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={metrics.viability_percent}
                  onChange={(e) => setMetrics({...metrics, viability_percent: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            {metrics.concentration > 0 && metrics.volume_ml > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                Всего клеток: <span className="font-medium">{(metrics.concentration * metrics.volume_ml).toLocaleString()}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Морфология</Label>
              <Select
                value={metrics.morphology}
                onValueChange={(v) => setMetrics({...metrics, morphology: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Spindle">Веретенообразная</SelectItem>
                  <SelectItem value="Cobblestone">Булыжная</SelectItem>
                  <SelectItem value="Fibroblast">Фибробластоподобная</SelectItem>
                  <SelectItem value="Epithelial">Эпителиоподобная</SelectItem>
                  <SelectItem value="Mixed">Смешанная</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Checkbox
                id="contaminated"
                checked={metrics.contaminated}
                onCheckedChange={(v) => setMetrics({...metrics, contaminated: v as boolean})}
              />
              <Label htmlFor="contaminated" className="text-yellow-800 cursor-pointer">
                Есть признаки контаминации
              </Label>
            </div>

            {metrics.contaminated && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">Обнаружена контаминация — рекомендуется утилизация</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Result */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Результат пассажа</CardTitle>
            <CardDescription>
              Укажите параметры создаваемых контейнеров
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Split Ratio */}
            <div className="space-y-2">
              <Label>Соотношение split</Label>
              <Select
                value={passageResult.splitRatio}
                onValueChange={(v) => calculateTargets(v)}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1">1:1 (без увеличения)</SelectItem>
                  <SelectItem value="1:2">1:2</SelectItem>
                  <SelectItem value="1:3">1:3</SelectItem>
                  <SelectItem value="1:4">1:4</SelectItem>
                  <SelectItem value="1:5">1:5</SelectItem>
                  <SelectItem value="1:6">1:6</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Из {selectedContainers.length} конт. будет создан лот P{passageResult.newPassageNumber} с {targetContainers.length} контейнерами
              </p>
            </div>

            {/* Target Containers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Целевые контейнеры ({targetContainers.length})</Label>
                <Button variant="outline" size="sm" onClick={addTargetContainer}>
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить
                </Button>
              </div>

              <div className="grid gap-3">
                {targetContainers.map((target, index) => (
                  <div key={target.id} className="flex gap-4 items-end p-3 border rounded-lg">
                    <div className="w-16 text-sm font-medium">
                      #{index + 1}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Тип контейнера</Label>
                      <Select
                        value={target.containerType}
                        onValueChange={(v) => {
                          const updated = [...targetContainers]
                          updated[index].containerType = v
                          setTargetContainers(updated)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {containerTypes.map(type => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-xs">Позиция (опционально)</Label>
                      <Select
                        value={target.position?.id || ''}
                        onValueChange={(v) => {
                          const pos = positions.find(p => p.id === v)
                          const updated = [...targetContainers]
                          updated[index].position = pos
                          setTargetContainers(updated)
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Авторазмещение" />
                        </SelectTrigger>
                        <SelectContent>
                          {positions.filter(p => p.is_active).map(pos => (
                            <SelectItem key={pos.id} value={pos.id}>
                              {pos.path}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTargetContainer(target.id)}
                      disabled={targetContainers.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Примечания</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Дополнительные заметки..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Подтверждение</CardTitle>
            <CardDescription>
              Проверьте данные перед сохранением
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h3 className="font-medium">Исходные контейнеры ({selectedContainers.length})</h3>
                {selectedContainers.map(c => (
                  <p key={c.id}>
                    <span className="text-muted-foreground">Код:</span> {c.code} ({c.confluent_percent}%)
                  </p>
                ))}
                <p><span className="text-muted-foreground">Лот:</span> P{lotInfo?.passage_number}</p>
              </div>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h3 className="font-medium">Результат</h3>
                <p><span className="text-muted-foreground">Новый пассаж:</span> P{passageResult.newPassageNumber}</p>
                <p><span className="text-muted-foreground">Split:</span> {passageResult.splitRatio}</p>
                <p><span className="text-muted-foreground">Контейнеров:</span> {targetContainers.length}</p>
                {metrics.concentration > 0 && metrics.volume_ml > 0 && (
                  <p><span className="text-muted-foreground">Всего клеток:</span> {(metrics.concentration * metrics.volume_ml).toLocaleString()}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm">
                {selectedContainers.length} исходных контейнеров будут помечены как DISPOSED
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(s => Math.max(1, s - 1))}
          disabled={step === 1}
        >
          Назад
        </Button>
        {step < 4 ? (
          <Button
            onClick={() => {
              if (step === 1 && targetContainers.length === 0) {
                calculateTargets('1:2')
              }
              setStep(s => Math.min(4, s + 1))
            }}
            disabled={
              (step === 1 && selectedContainers.length === 0) ||
              (step === 2 && !metrics.morphology)
            }
          >
            Далее
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            <FlaskConical className="h-4 w-4 mr-2" />
            {loading ? 'Сохранение...' : 'Выполнить пассаж'}
          </Button>
        )}
      </div>
    </div>
  )
}
