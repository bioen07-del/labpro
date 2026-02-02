"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  ThermometerSnowflake, 
  Save, 
  Plus,
  Trash2,
  Search,
  Beaker,
  AlertTriangle,
  CheckCircle2
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
  getBanks,
  getPositions,
  createBank,
  createCryoVial,
  createOperation,
  updateContainer
} from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function FreezePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  
  // Данные формы
  const [selectedContainer, setSelectedContainer] = useState<any>(null)
  const [lotInfo, setLotInfo] = useState<any>(null)
  
  // Параметры заморозки
  const [freezeParams, setFreezeParams] = useState({
    passage_number: 0,
    population_doubling: 0,
    vials_count: 1,
    cells_per_vial: 1000000,
    cryoprotectant: 'DMSO_10',
    freezingRate: '1',
    finalVolume: 1.0,
  })
  
  // QC параметры
  const [qcData, setQcData] = useState({
    viability_before: 0,
    morphology: '',
    mycoplasma: 'PENDING',
    sterility: 'PENDING',
    contamination: false,
  })
  
  // Целевой банк
  const [targetBank, setTargetBank] = useState<any>(null)
  const [vials, setVials] = useState<any[]>([])
  const [notes, setNotes] = useState('')
  
  // Данные для выбора
  const [containers, setContainers] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    try {
      const [containersData, positionsData, banksData] = await Promise.all([
        getContainers({ status: 'IN_CULTURE' }),
        getPositions({ is_active: true }),
        getBanks()
      ])
      setContainers(containersData || [])
      setPositions(positionsData || [])
      setBanks(banksData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }
  
  const handleContainerSelect = (container: any) => {
    setSelectedContainer(container)
    if (container.lot) {
      setLotInfo(container.lot)
      setFreezeParams(prev => ({
        ...prev,
        passage_number: (container.lot.passage_number || 0) + 1,
        population_doubling: container.lot.population_doubling || 0,
      }))
    }
    // Загружаем QC данные из последнего наблюдения
    if (container.morphology) {
      setQcData(prev => ({ ...prev, morphology: container.morphology }))
    }
  }
  
  const addVial = () => {
    setVials([...vials, { id: vials.length + 1, position: null, label: '' }])
  }
  
  const removeVial = (id: number) => {
    setVials(vials.filter(v => v.id !== id))
  }
  
  const handleSubmit = async () => {
    setLoading(true)
    try {
      // Автоопределение MCB/WCB: первая заморозка культуры = MCB, последующие = WCB
      let bankType = 'MCB'
      if (lotInfo?.culture_id) {
        const existingBanks = await getBanks({ culture_id: lotInfo.culture_id })
        if (existingBanks && existingBanks.length > 0) {
          bankType = 'WCB'
        }
      }

      // Создаем банк с правильным статусом QUARANTINE
      const bankData = {
        culture_id: lotInfo?.culture_id,
        lot_id: lotInfo?.id,
        bank_type: bankType, // MCB (первая заморозка) или WCB (последующие)
        cryo_vials_count: freezeParams.vials_count,
        cells_per_vial: freezeParams.cells_per_vial,
        total_cells: freezeParams.cells_per_vial * freezeParams.vials_count,
        status: 'QUARANTINE', // Банк создается на карантине до QC
        freezing_date: new Date().toISOString().split('T')[0],
        notes: `Криопротектор: ${freezeParams.cryoprotectant}. ${notes}`,
      }
      
      const bank = await createBank(bankData)
      
      // Создаем криопробирки
      for (let i = 0; i < freezeParams.vials_count; i++) {
        const vialData = {
          bank_id: bank.id,
          lot_id: lotInfo?.id,
          position_id: vials[i]?.position?.id || null,
          cells_count: freezeParams.cells_per_vial,
          freezing_date: new Date().toISOString().split('T')[0],
          status: 'IN_STOCK',
        }
        await createCryoVial(vialData)
      }
      
      // Создаем операцию заморозки
      const operationData = {
        lot_id: lotInfo?.id,
        operation_type: 'FREEZE',
        status: 'COMPLETED',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        notes: `Заморозка ${freezeParams.vials_count} пробирок. Криопротектор: ${freezeParams.cryoprotectant}`,
      }
      
      await createOperation(operationData)
      
      // Обновляем статус контейнера-донора на DISPOSE (использован для заморозки)
      if (selectedContainer) {
        await updateContainer(selectedContainer.id, { status: 'DISPOSE' })
      }
      
      router.push(`/banks/${bank.id}`)
    } catch (error) {
      console.error('Error creating freeze:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const updateContainerStatus = async (id: string, status: string) => {
    await updateContainer(id, { status })
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
          <h1 className="text-3xl font-bold tracking-tight">Заморозка культуры</h1>
          <p className="text-muted-foreground">
            Создание клеточного банка (Master/Working Bank)
          </p>
        </div>
      </div>
      
      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        {['Выбор культуры', 'Параметры заморозки', 'Маркировка', 'Подтверждение'].map((s, i) => (
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
            <CardTitle>Выберите контейнер для заморозки</CardTitle>
            <CardDescription>
              Выберите контейнер с культурой, которую необходимо заморозить
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Поиск по коду контейнера..." className="pl-9" />
              </div>
              
              <div className="grid gap-3">
                {containers
                  .filter(c => c.status === 'ACTIVE' && c.confluent_percent >= 70)
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
                        {container.viability_percent && (
                          <Badge variant={container.viability_percent >= 80 ? 'default' : 'destructive'}>
                            {container.viability_percent}% жизнеспособность
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
              
              {containers.filter(c => c.status === 'ACTIVE' && c.confluent_percent >= 70).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Нет подходящих контейнеров для заморозки (минимум 70% конфлюэнтности)
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Step 2: Freeze Parameters */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Параметры заморозки</CardTitle>
            <CardDescription>
              Укажите параметры криоконсервации культуры
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Номер пассажа</Label>
                <Input 
                  type="number" 
                  value={freezeParams.passage_number}
                  onChange={(e) => setFreezeParams({...freezeParams, passage_number: parseInt(e.target.value) || 0})}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Будет создан пассаж P{lotInfo?.passage_number + 1}</p>
              </div>
              <div className="space-y-2">
                <Label>Population Doubling</Label>
                <Input 
                  type="number" 
                  value={freezeParams.population_doubling}
                  onChange={(e) => setFreezeParams({...freezeParams, population_doubling: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Количество пробирок</Label>
                <Input 
                  type="number" 
                  min="1"
                  max="20"
                  value={freezeParams.vials_count}
                  onChange={(e) => setFreezeParams({...freezeParams, vials_count: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>
            
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Клеток на пробирку</Label>
                <Input 
                  type="number"
                  value={freezeParams.cells_per_vial}
                  onChange={(e) => setFreezeParams({...freezeParams, cells_per_vial: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Криопротектор</Label>
                <Select 
                  value={freezeParams.cryoprotectant}
                  onValueChange={(v) => setFreezeParams({...freezeParams, cryoprotectant: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DMSO_10">10% DMSO (стандарт)</SelectItem>
                    <SelectItem value="DMSO_5">5% DMSO</SelectItem>
                    <SelectItem value="Glycerol_10">10% Glycerol</SelectItem>
                    <SelectItem value="PROH_1">1M PROH</SelectItem>
                    <SelectItem value="Custom">Другое</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Скорость охлаждения</Label>
                <Select 
                  value={freezeParams.freezingRate}
                  onValueChange={(v) => setFreezeParams({...freezeParams, freezingRate: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1°C/мин (стандарт)</SelectItem>
                    <SelectItem value="0.5">0.5°C/мин</SelectItem>
                    <SelectItem value="2">2°C/мин</SelectItem>
                    <SelectItem value="controlled">Контролируемое охлаждение</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="font-medium mb-4">QC показатели</h3>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Жизнеспособность (%)</Label>
                  <Input 
                    type="number"
                    value={qcData.viability_before}
                    onChange={(e) => setQcData({...qcData, viability_before: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Морфология</Label>
                  <Select 
                    value={qcData.morphology}
                    onValueChange={(v) => setQcData({...qcData, morphology: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spindle">Веретенообразная</SelectItem>
                      <SelectItem value="Cobblestone">Булыжная</SelectItem>
                      <SelectItem value="Fibroblast">Фибробластоподобная</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Микоплазма</Label>
                  <Select 
                    value={qcData.mycoplasma}
                    onValueChange={(v) => setQcData({...qcData, mycoplasma: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASSED">Отрицательно</SelectItem>
                      <SelectItem value="PENDING">В ожидании</SelectItem>
                      <SelectItem value="FAILED">Положительно</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Стерильность</Label>
                  <Select 
                    value={qcData.sterility}
                    onValueChange={(v) => setQcData({...qcData, sterility: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASSED">Стерильно</SelectItem>
                      <SelectItem value="PENDING">В ожидании</SelectItem>
                      <SelectItem value="FAILED">Контаминация</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-4">
                <input 
                  type="checkbox" 
                  id="contamination"
                  checked={qcData.contamination}
                  onChange={(e) => setQcData({...qcData, contamination: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="contamination" className="text-red-600">
                  Есть признаки контаминации
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Step 3: Vial Labeling */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Маркировка пробирок</CardTitle>
            <CardDescription>
              Укажите позиции для хранения пробирок в криобоксе
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Всего пробирок: {freezeParams.vials_count}
              </p>
              <Button variant="outline" size="sm" onClick={() => {
                setVials(Array.from({ length: freezeParams.vials_count }, (_, i) => ({
                  id: i + 1,
                  position: null,
                  label: ''
                })))
              }}>
                Автозаполнить
              </Button>
            </div>
            
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: freezeParams.vials_count }, (_, i) => (
                <div key={i} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Пробирка #{i + 1}</Label>
                    <Badge variant="outline">MB-{lotInfo?.passage_number + 1}-{String(i + 1).padStart(2, '0')}</Badge>
                  </div>
                  <Select 
                    value={vials[i]?.position?.id || ''}
                    onValueChange={(v) => {
                      const updated = [...vials]
                      const pos = positions.find(p => p.id === v)
                      updated[i] = { ...updated[i], position: pos }
                      setVials(updated)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Позиция..." />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.filter(p => p.equipment?.type === 'CRYO_BOX' && p.is_active).map(pos => (
                        <SelectItem key={pos.id} value={pos.id}>
                          {pos.path}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            
            {freezeParams.vials_count > 12 && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg">
                <AlertTriangle className="h-4 w-4" />
                <p className="text-sm">Внимание: количество пробирок превышает стандартный криобокс (12 шт.)</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Step 4: Confirmation */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Подтверждение заморозки</CardTitle>
            <CardDescription>
              Проверьте данные перед сохранением
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <h3 className="font-medium">Исходная культура</h3>
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <p><span className="text-muted-foreground">Контейнер:</span> {selectedContainer?.code}</p>
                  <p><span className="text-muted-foreground">Культура:</span> {lotInfo?.culture?.name}</p>
                  <p><span className="text-muted-foreground">Пассаж:</span> P{lotInfo?.passage_number} → P{freezeParams.passage_number}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <h3 className="font-medium">Параметры заморозки</h3>
                <div className="p-3 bg-muted rounded-lg space-y-2">
                  <p><span className="text-muted-foreground">Пробирок:</span> {freezeParams.vials_count}</p>
                  <p><span className="text-muted-foreground">Криопротектор:</span> {freezeParams.cryoprotectant}</p>
                  <p><span className="text-muted-foreground">Клеток/пробирка:</span> {freezeParams.cells_per_vial.toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Примечания</Label>
              <Textarea 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Дополнительные заметки..."
              />
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm">
                Банк будет создан со статусом "ACTIVE" и направлен на QC тестирование
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}>
          Назад
        </Button>
        {step < 4 ? (
          <Button onClick={() => setStep(s => Math.min(4, s + 1))} disabled={step === 1 && !selectedContainer}>
            Далее
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            <ThermometerSnowflake className="h-4 w-4 mr-2" />
            {loading ? 'Сохранение...' : 'Создать банк'}
          </Button>
        )}
      </div>
    </div>
  )
}
