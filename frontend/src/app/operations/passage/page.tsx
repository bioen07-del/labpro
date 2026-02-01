"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  FlaskConical, 
  Save, 
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Calculator
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
  getLots, 
  getPositions,
  createOperation,
  createContainer,
  createLot,
  updateContainer
} from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function PassagePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  
  // Данные формы
  const [selectedContainer, setSelectedContainer] = useState<any>(null)
  const [lotInfo, setLotInfo] = useState<any>(null)
  
  // Метрики
  const [metrics, setMetrics] = useState({
    concentration: 0,
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
  
  // Расход материалов
  const [materials, setMaterials] = useState<any[]>([])
  
  const [notes, setNotes] = useState('')
  
  // Данные для выбора
  const [containers, setContainers] = useState<any[]>([])
  const [lots, setLots] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [containerTypes, setContainerTypes] = useState<any[]>([
    { id: '1', name: 'T-25', volume_ml: 5 },
    { id: '2', name: 'T-75', volume_ml: 15 },
    { id: '3', name: 'T-175', volume_ml: 35 },
    { id: '4', name: '6-well plate', volume_ml: 2 },
    { id: '5', name: '12-well plate', volume_ml: 1 },
  ])

  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    try {
      const [containersData, lotsData, positionsData] = await Promise.all([
        getContainers({ status: 'ACTIVE' }),
        getLots({ status: 'ACTIVE' }),
        getPositions({ is_active: true })
      ])
      setContainers(containersData || [])
      setLots(lotsData || [])
      setPositions(positionsData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }
  
  const handleContainerSelect = (container: any) => {
    setSelectedContainer(container)
    if (container.lot) {
      setLotInfo(container.lot)
      setPassageResult(prev => ({
        ...prev,
        newPassageNumber: (container.lot.passage_number || 0) + 1
      }))
      // Автоматически заполняем морфологию
      if (container.morphology) {
        setMetrics(prev => ({ ...prev, morphology: container.morphology }))
      }
    }
  }
  
  // Расчёт количества целевых контейнеров
  const calculateTargets = (ratio: string) => {
    const ratioMap: Record<string, number> = {
      '1:1': 1, '1:2': 2, '1:3': 3, '1:4': 4, '1:5': 5, '1:6': 6
    }
    const count = ratioMap[ratio] || 2
    setPassageResult(prev => ({ ...prev, splitRatio: ratio, newContainers: count }))
    
    // Создаём массив целевых контейнеров
    const newTargets = Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      position: null,
      containerType: '2', // T-75 по умолчанию
    }))
    setTargetContainers(newTargets)
  }
  
  const addTargetContainer = () => {
    setTargetContainers([...targetContainers, {
      id: targetContainers.length + 1,
      position: null,
      containerType: '2',
    }])
    setPassageResult(prev => ({ ...prev, newContainers: targetContainers.length + 1 }))
  }
  
  const removeTargetContainer = (id: number) => {
    setTargetContainers(targetContainers.filter(t => t.id !== id))
    setPassageResult(prev => ({ ...prev, newContainers: targetContainers.length - 1 }))
  }
  
  const addMaterial = () => {
    setMaterials([...materials, { id: materials.length + 1, type: '', batch: '', quantity: 1 }])
  }
  
  const removeMaterial = (id: number) => {
    setMaterials(materials.filter(m => m.id !== id))
  }
  
  const handleSubmit = async () => {
    if (!selectedContainer || targetContainers.length === 0) return
    
    setLoading(true)
    try {
      // 1. Обновляем статус исходного контейнера
      await updateContainer(selectedContainer.id, {
        status: 'HARVESTED',
        morphology: metrics.morphology,
        confluent_percent: metrics.concentration > 0 ? Math.min(100, metrics.concentration / 10000) : 0,
      })
      
      // 2. Создаём новый лот (если split - больше контейнеров чем источников)
      const isSplit = targetContainers.length > 1
      const newLot = await createLot({
        culture_id: lotInfo?.culture_id,
        parent_lot_id: lotInfo?.id,
        passage_number: passageResult.newPassageNumber,
        status: 'ACTIVE',
        start_date: new Date().toISOString().split('T')[0],
        notes: `Пассаж из ${selectedContainer.code}. Split: ${isSplit ? 'Да' : 'Нет'}. ${notes}`,
        split: isSplit,
      })
      
      // 3. Создаём целевые контейнеры
      for (const target of targetContainers) {
        const containerType = containerTypes.find(t => t.id === target.containerType)
        await createContainer({
          lot_id: newLot.id,
          container_type_id: target.containerType,
          position_id: target.position?.id || null,
          status: 'ACTIVE',
          code: `${lotInfo?.culture?.code}-L${lotInfo?.lot_number || 1}-P${passageResult.newPassageNumber}-${containerType?.name?.slice(0, 2).toUpperCase()}-${String(target.id).padStart(3, '0')}`,
          confluent_percent: 10, // Начальная конфлюэнтность после пассажа
          morphology: metrics.morphology,
        })
      }
      
      // 4. Создаём операцию
      await createOperation({
        operation_type: 'PASSAGE',
        lot_id: lotInfo?.id,
        container_id: selectedContainer.id,
        notes: `Пассаж P${lotInfo?.passage_number} → P${passageResult.newPassageNumber}. Split ${passageResult.splitRatio}. Создано ${targetContainers.length} контейнеров. ${notes}`,
        status: 'COMPLETED',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      
      router.push(`/cultures/${lotInfo?.culture_id}`)
    } catch (error) {
      console.error('Error creating passage:', error)
    } finally {
      setLoading(false)
    }
  }
  
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
        {['Выбор культуры', 'Метрики', 'Результат', 'Подтверждение'].map((s, i) => (
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
      
      {/* Step 1: Select Container */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Выберите контейнер-донор</CardTitle>
            <CardDescription>
              Выберите контейнер с культурой для пассажирования
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Поиск по коду..." className="pl-9" />
              </div>
              
              <div className="grid gap-3">
                {containers
                  .filter(c => c.status === 'ACTIVE' && (c.confluent_percent || 0) >= 70)
                  .map(container => (
                    <div 
                      key={container.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedContainer?.id === container.id 
                          ? 'border-primary bg-primary/5' 
                          : 'hover:border-muted-foreground'
                      }`}
                      onClick={() => handleContainerSelect(container)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{container.code}</Badge>
                            <Badge variant="secondary">
                              P{container.lot?.passage_number || 0}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm">
                            {container.lot?.culture?.name} • {container.lot?.culture?.culture_type?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Конфлюэнтность: {container.confluent_percent}% • 
                            Морфология: {container.morphology || 'не указана'}
                          </p>
                        </div>
                        <Badge variant={container.confluent_percent >= 80 ? 'default' : 'secondary'}>
                          Готов к пассажу
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
              
              {containers.filter(c => c.status === 'ACTIVE' && (c.confluent_percent || 0) >= 70).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Нет готовых к пассажу контейнеров (минимум 70% конфлюэнтности)
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Step 2: Metrics */}
      {step === 2 && selectedContainer && (
        <Card>
          <CardHeader>
            <CardTitle>Метрики культуры</CardTitle>
            <CardDescription>
              Введите измеренные параметры культуры
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
                <Label>Жизнеспособность (%)</Label>
                <Input 
                  type="number"
                  min="0"
                  max="100"
                  value={metrics.viability_percent}
                  onChange={(e) => setMetrics({...metrics, viability_percent: parseInt(e.target.value) || 0})}
                />
              </div>
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
              <AlertTriangle className="h-4 w-4 text-red-600" />
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
                Будет создан лот P{passageResult.newPassageNumber}
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
                <h3 className="font-medium">Исходный контейнер</h3>
                <p><span className="text-muted-foreground">Код:</span> {selectedContainer?.code}</p>
                <p><span className="text-muted-foreground">Лот:</span> P{lotInfo?.passage_number}</p>
                <p><span className="text-muted-foreground">Конфлюэнтность:</span> {selectedContainer?.confluent_percent}%</p>
              </div>
              
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h3 className="font-medium">Результат</h3>
                <p><span className="text-muted-foreground">Новый пассаж:</span> P{passageResult.newPassageNumber}</p>
                <p><span className="text-muted-foreground">Split:</span> {passageResult.splitRatio}</p>
                <p><span className="text-muted-foreground">Контейнеров:</span> {targetContainers.length}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm">
                После подтверждения исходный контейнер будет помечен как использованный
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
            onClick={() => setStep(s => Math.min(4, s + 1))}
            disabled={
              (step === 1 && !selectedContainer) ||
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
