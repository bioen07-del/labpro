"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  FlaskConical, 
  Thermometer, 
  Save, 
  Camera,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  getContainers, 
  getLots, 
  getCultureTypes, 
  getPositions,
  createOperation 
} from '@/lib/api'
import { formatDate } from '@/lib/utils'

// Типы операций согласно ТЗ
type OperationType = 'PASSAGE' | 'FEED' | 'OBSERVE' | 'FREEZE' | 'THAW' | 'DISPOSE'

const OPERATION_CONFIG: Record<OperationType, { title: string; description: string; icon: any }> = {
  PASSAGE: { 
    title: 'Пассажирование', 
    description: 'Пересев культуры в новые контейнеры с увеличением пассажа',
    icon: FlaskConical 
  },
  FEED: { 
    title: 'Кормление', 
    description: 'Замена питательной среды в контейнерах',
    icon: Thermometer 
  },
  OBSERVE: { 
    title: 'Наблюдение', 
    description: 'Оценка состояния культуры, конфлюэнтности и морфологии',
    icon: Camera 
  },
  FREEZE: { 
    title: 'Заморозка', 
    description: 'Создание клеточного банка из культуры',
    icon: Thermometer 
  },
  THAW: { 
    title: 'Разморозка', 
    description: 'Извлечение клеток из банка для культивирования',
    icon: Thermometer 
  },
  DISPOSE: { 
    title: 'Утилизация', 
    description: 'Утилизация культуры, среды или партии',
    icon: Trash2 
  },
}

// Компонент с логикой (содержит useSearchParams)
function NewOperationContent({ initialType }: { initialType: OperationType }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<OperationType>(initialType)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  
  // Данные формы
  const [selectedContainer, setSelectedContainer] = useState<any>(null)
  const [selectedLot, setSelectedLot] = useState<any>(null)
  const [targetPositions, setTargetPositions] = useState<any[]>([])
  const [splitRatio, setSplitRatio] = useState<string>('1:2')
  const [metrics, setMetrics] = useState({
    confluent_percent: 0,
    viability_percent: 0,
    morphology: '',
    contaminated: false,
  })
  const [mediaUsage, setMediaUsage] = useState<any[]>([])
  const [notes, setNotes] = useState('')
  
  // Данные для выбора
  const [containers, setContainers] = useState<any[]>([])
  const [lots, setLots] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [cultureTypes, setCultureTypes] = useState<any[]>([])
  
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    try {
      const [containersData, lotsData, positionsData, typesData] = await Promise.all([
        getContainers({ status: 'IN_CULTURE' }),
        getLots({ status: 'ACTIVE' }),
        getPositions(),
        getCultureTypes()
      ])
      setContainers(containersData || [])
      setLots(lotsData || [])
      setPositions(positionsData || [])
      setCultureTypes(typesData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }
  
  const handleContainerSelect = (container: any) => {
    setSelectedContainer(container)
    if (container.lot) {
      setSelectedLot(container.lot)
    }
    // Устанавливаем текущую конфлюэнтность
    if (container.confluent_percent) {
      setMetrics(prev => ({ ...prev, confluent_percent: container.confluent_percent }))
    }
  }
  
  const addTargetPosition = () => {
    setTargetPositions([...targetPositions, { position: null, containerType: '1' }])
  }
  
  const removeTargetPosition = (index: number) => {
    setTargetPositions(targetPositions.filter((_, i) => i !== index))
  }
  
  const addMediaUsage = () => {
    setMediaUsage([...mediaUsage, { batch: null, volume_ml: 0 }])
  }
  
  const removeMediaUsage = (index: number) => {
    setMediaUsage(mediaUsage.filter((_, i) => i !== index))
  }
  
  const handleSubmit = async () => {
    setLoading(true)
    try {
      const operationData = {
        type: activeTab,
        lot_id: selectedLot?.id,
        containers: [
          {
            container_id: selectedContainer?.id,
            role: 'SOURCE',
            confluent_percent: metrics.confluent_percent,
            morphology: metrics.morphology,
            contaminated: metrics.contaminated,
          }
        ],
        target_containers: targetPositions.map(t => ({
          position_id: t.position?.id,
          container_type_id: t.containerType,
        })),
        media: mediaUsage.map(m => ({
          batch_id: m.batch?.id,
          volume_ml: m.volume_ml,
        })),
        metrics: {
          split_ratio: splitRatio,
          viability_percent: metrics.viability_percent,
        },
        notes,
      }
      
      await createOperation(operationData)
      router.push('/operations')
    } catch (error) {
      console.error('Error creating operation:', error)
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
          <h1 className="text-3xl font-bold tracking-tight">Новая операция</h1>
          <p className="text-muted-foreground">
            Выберите тип операции и заполните данные
          </p>
        </div>
      </div>
      
      {/* Выбор типа операции */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as OperationType)}>
        <TabsList className="grid grid-cols-6 w-full">
          {Object.entries(OPERATION_CONFIG).map(([type, config]) => {
            const Icon = config.icon
            return (
              <TabsTrigger key={type} value={type} className="flex flex-col items-center gap-1 py-3">
                <Icon className="h-4 w-4" />
                <span className="text-xs">{config.title}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>
        
        {/* PASSAGE */}
        <TabsContent value="PASSAGE" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{OPERATION_CONFIG.PASSAGE.title}</CardTitle>
              <CardDescription>{OPERATION_CONFIG.PASSAGE.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Выбор контейнера-донора */}
              <div className="space-y-4">
                <Label>Контейнер-донор</Label>
                <div className="border rounded-lg p-4 space-y-2">
                  {selectedContainer ? (
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{selectedContainer.code}</p>
                        <p className="text-sm text-muted-foreground">
                          Лот P{selectedContainer.lot?.passage_number} • 
                          Конфлюэнтность: {selectedContainer.confluent_percent}%
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedContainer(null)}>
                        Изменить
                      </Button>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {containers.filter(c => c.status === 'IN_CULTURE').map(container => (
                        <div 
                          key={container.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent cursor-pointer"
                          onClick={() => handleContainerSelect(container)}
                        >
                          <div>
                            <p className="font-medium">{container.code}</p>
                            <p className="text-sm text-muted-foreground">
                              {container.type?.name} • Лот P{container.lot?.passage_number}
                            </p>
                          </div>
                          <Badge variant={container.confluent_percent >= 80 ? 'default' : 'secondary'}>
                            {container.confluent_percent}% конфлюэнтности
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Метрики */}
              {selectedContainer && (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Текущая конфлюэнтность (%)</Label>
                      <Input 
                        type="number" 
                        value={metrics.confluent_percent}
                        onChange={(e) => setMetrics({...metrics, confluent_percent: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Жизнеспособность (%)</Label>
                      <Input 
                        type="number" 
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
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      id="contaminated"
                      checked={metrics.contaminated}
                      onChange={(e) => setMetrics({...metrics, contaminated: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="contaminated">Есть признаки контаминации</Label>
                  </div>
                  
                  {/* Split ratio */}
                  <div className="space-y-2">
                    <Label>Соотношение split</Label>
                    <Select value={splitRatio} onValueChange={setSplitRatio}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1:2">1:2</SelectItem>
                        <SelectItem value="1:3">1:3</SelectItem>
                        <SelectItem value="1:4">1:4</SelectItem>
                        <SelectItem value="1:5">1:5</SelectItem>
                        <SelectItem value="1:6">1:6</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Целевые контейнеры */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Целевые контейнеры</Label>
                      <Button variant="outline" size="sm" onClick={addTargetPosition}>
                        <Plus className="h-4 w-4 mr-1" />
                        Добавить
                      </Button>
                    </div>
                    {targetPositions.map((tp, index) => (
                      <div key={index} className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                          <Label>Позиция</Label>
                          <Select 
                            value={tp.position?.id || ''} 
                            onValueChange={(v) => {
                              const pos = positions.find(p => p.id === v)
                              const updated = [...targetPositions]
                              updated[index].position = pos
                              setTargetPositions(updated)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите позицию..." />
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
                        <div className="w-48 space-y-2">
                          <Label>Тип</Label>
                          <Select 
                            value={tp.containerType} 
                            onValueChange={(v) => {
                              const updated = [...targetPositions]
                              updated[index].containerType = v
                              setTargetPositions(updated)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">T-75</SelectItem>
                              <SelectItem value="2">T-175</SelectItem>
                              <SelectItem value="4">Планшет 6-луночный</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeTargetPosition(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Расход сред */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Расход сред (FEFO)</Label>
                      <Button variant="outline" size="sm" onClick={addMediaUsage}>
                        <Plus className="h-4 w-4 mr-1" />
                        Добавить
                      </Button>
                    </div>
                    {mediaUsage.map((mu, index) => (
                      <div key={index} className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                          <Label>Партия</Label>
                          <Select 
                            value={mu.batch?.id || ''} 
                            onValueChange={(v) => {
                              const batch = containers.find(b => b.id === v)
                              const updated = [...mediaUsage]
                              updated[index].batch = batch
                              setMediaUsage(updated)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Выберите партию (FEFO)..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">DMEM/F12 - DMEM-001 (истекает 30.06)</SelectItem>
                              <SelectItem value="2">DMEM/F12 - DMEM-002 (истекает 15.07)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="w-32 space-y-2">
                          <Label>Объём (мл)</Label>
                          <Input 
                            type="number"
                            value={mu.volume_ml}
                            onChange={(e) => {
                              const updated = [...mediaUsage]
                              updated[index].volume_ml = parseInt(e.target.value) || 0
                              setMediaUsage(updated)
                            }}
                          />
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeMediaUsage(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Примечания</Label>
                    <Textarea 
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Дополнительные заметки..."
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* FEED */}
        <TabsContent value="FEED" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{OPERATION_CONFIG.FEED.title}</CardTitle>
              <CardDescription>{OPERATION_CONFIG.FEED.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">Переход на специализированную форму кормления...</p>
              <Button onClick={() => router.push('/operations/feed')}>
                Перейти к форме кормления
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* OBSERVE */}
        <TabsContent value="OBSERVE" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{OPERATION_CONFIG.OBSERVE.title}</CardTitle>
              <CardDescription>{OPERATION_CONFIG.OBSERVE.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">Переход на специализированную форму наблюдения...</p>
              <Button onClick={() => router.push('/operations/observe')}>
                Перейти к форме наблюдения
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* FREEZE */}
        <TabsContent value="FREEZE" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{OPERATION_CONFIG.FREEZE.title}</CardTitle>
              <CardDescription>{OPERATION_CONFIG.FREEZE.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">Переход на специализированную форму заморозки...</p>
              <Button onClick={() => router.push('/operations/freeze')}>
                Перейти к форме заморозки
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* THAW */}
        <TabsContent value="THAW" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{OPERATION_CONFIG.THAW.title}</CardTitle>
              <CardDescription>{OPERATION_CONFIG.THAW.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">Переход на специализированную форму разморозки...</p>
              <Button onClick={() => router.push('/operations/thaw')}>
                Перейти к форме разморозки
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* DISPOSE */}
        <TabsContent value="DISPOSE" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{OPERATION_CONFIG.DISPOSE.title}</CardTitle>
              <CardDescription>{OPERATION_CONFIG.DISPOSE.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground mb-4">Переход на специализированную форму утилизации...</p>
              <Button onClick={() => router.push('/operations/dispose')}>
                Перейти к форме утилизации
                <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Отмена
        </Button>
        <Button onClick={handleSubmit} disabled={loading || !selectedContainer}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Сохранение...' : 'Сохранить операцию'}
        </Button>
      </div>
    </div>
  )
}

// Компонент-обёртка для получения searchParams
function NewOperationWrapper() {
  const searchParams = useSearchParams()
  const initialType = (searchParams.get('type')?.toUpperCase() as OperationType) || 'PASSAGE'
  
  return <NewOperationContent initialType={initialType} />
}

// Главный экспорт с Suspense
export default function NewOperationPage() {
  return (
    <Suspense fallback={
      <div className="container py-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    }>
      <NewOperationWrapper />
    </Suspense>
  )
}
