"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Thermometer, 
  Save, 
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Snowflake
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
  getBanks, 
  getCryoVials, 
  getPositions,
  getContainers,
  createOperation,
  createContainer,
  createLot,
  updateCryoVial
} from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function ThawPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  
  // Данные формы
  const [selectedBank, setSelectedBank] = useState<any>(null)
  const [selectedVials, setSelectedVials] = useState<any[]>([])
  const [lotInfo, setLotInfo] = useState<any>(null)
  
  // Параметры разморозки
  const [thawParams, setThawParams] = useState({
    mediaBatch: '',
    thawMethod: 'WATER_BATH',
    thawTime: 0, // минуты
    volume_ml: 10,
  })
  
  // Результат
  const [resultParams, setResultParams] = useState({
    containerType: '2', // T-75 по умолчанию
    position: null as any,
    initialVolume: 15,
  })
  
  const [notes, setNotes] = useState('')
  
  // Данные для выбора
  const [banks, setBanks] = useState<any[]>([])
  const [vials, setVials] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [containers, setContainers] = useState<any[]>([])
  const [containerTypes, setContainerTypes] = useState<any[]>([
    { id: '1', name: 'T-25', volume_ml: 5 },
    { id: '2', name: 'T-75', volume_ml: 15 },
    { id: '3', name: 'T-175', volume_ml: 35 },
    { id: '4', name: '6-well plate', volume_ml: 2 },
  ])

  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    try {
      const [banksData, positionsData, containersData] = await Promise.all([
        getBanks({ status: 'ACTIVE' }),
        getPositions({ is_active: true }),
        getContainers({ status: 'ACTIVE' })
      ])
      setBanks(banksData || [])
      setPositions(positionsData || [])
      setContainers(containersData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }
  
  const loadVials = async (bankId: string) => {
    try {
      const vialsData = await getCryoVials({ bank_id: bankId, status: 'FROZEN' })
      setVials(vialsData || [])
    } catch (error) {
      console.error('Error loading vials:', error)
    }
  }
  
  const handleBankSelect = (bank: any) => {
    setSelectedBank(bank)
    setLotInfo({
      culture_id: bank.culture_id,
      culture: bank.culture,
      passage_number: bank.passage_number,
    })
    loadVials(bank.id)
  }
  
  const toggleVial = (vial: any) => {
    setSelectedVials(prev => {
      const exists = prev.find(v => v.id === vial.id)
      if (exists) {
        return prev.filter(v => v.id !== vial.id)
      }
      return [...prev, vial]
    })
  }
  
  const selectAllVials = () => {
    if (selectedVials.length === vials.length) {
      setSelectedVials([])
    } else {
      setSelectedVials([...vials])
    }
  }
  
  const handleSubmit = async () => {
    if (!selectedBank || selectedVials.length === 0) return
    
    setLoading(true)
    try {
      // 1. Обновляем статус криовиал
      for (const vial of selectedVials) {
        await updateCryoVial(vial.id, {
          status: 'THAWED',
          thaw_date: new Date().toISOString(),
        })
      }
      
      // 2. Создаём новый лот (если пассаж виалы > пассажа банка)
      const newPassage = selectedBank.passage_number + 1
      const newLot = await createLot({
        culture_id: lotInfo?.culture_id,
        bank_id: selectedBank.id,
        passage_number: newPassage,
        status: 'ACTIVE',
        start_date: new Date().toISOString().split('T')[0],
        notes: `Разморозка из ${selectedBank.code}. Разморожено ${selectedVials.length} виал. ${notes}`,
        split: false,
      })
      
      // 3. Создаём контейнер-результат
      const containerType = containerTypes.find(t => t.id === resultParams.containerType)
      const newContainer = await createContainer({
        lot_id: newLot.id,
        container_type_id: resultParams.containerType,
        position_id: resultParams.position?.id || null,
        status: 'ACTIVE',
        code: `${lotInfo?.culture?.code}-L${newLot.lot_number || 1}-P${newPassage}-${containerType?.name?.slice(0, 2).toUpperCase()}-THW-001`,
        confluent_percent: 10, // Начальная конфлюэнтность после разморозки
        notes: `Разморозка из ${selectedVials.length} виал(ы). Метод: ${thawParams.thawMethod}. ${notes}`,
      })
      
      // 4. Создаём операцию разморозки
      await createOperation({
        operation_type: 'THAW',
        lot_id: newLot.id,
        container_id: newContainer.id,
        notes: `Разморозка ${selectedVials.length} виал(ы) из банка ${selectedBank.code}. Метод: ${thawParams.thawMethod}. Среда: ${thawParams.mediaBatch}. ${notes}`,
        status: 'COMPLETED',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      
      router.push(`/cultures/${lotInfo?.culture_id}`)
    } catch (error) {
      console.error('Error creating thaw:', error)
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
          <h1 className="text-3xl font-bold tracking-tight">Разморозка</h1>
          <p className="text-muted-foreground">
            Извлечение клеток из криобанка для культивирования
          </p>
        </div>
      </div>
      
      {/* Progress */}
      <div className="flex items-center gap-4">
        {['Выбор банка', 'Выбор виал', 'Параметры', 'Подтверждение'].map((s, i) => (
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
      
      {/* Step 1: Select Bank */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Выберите банк</CardTitle>
            <CardDescription>
              Выберите клеточный банк для разморозки
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Поиск по коду..." className="pl-9" />
              </div>
              
              <div className="grid gap-3">
                {banks.map(bank => (
                  <div 
                    key={bank.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedBank?.id === bank.id 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:border-muted-foreground'
                    }`}
                    onClick={() => handleBankSelect(bank)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{bank.code}</Badge>
                          <Badge variant={bank.bank_type === 'MASTER' ? 'default' : 'secondary'}>
                            {bank.bank_type === 'MASTER' ? 'MCB' : 'WCB'}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm">
                          {bank.culture?.name} • {bank.culture?.culture_type?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Пассаж: P{bank.passage_number} • 
                          Виал: {bank.vials_total} шт. •
                          Дата заморозки: {formatDate(bank.freeze_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">
                          {bank.vials_total - (bank.vials_used || 0)} доступно
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {banks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Нет доступных банков для разморозки
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Step 2: Select Vials */}
      {step === 2 && selectedBank && (
        <Card>
          <CardHeader>
            <CardTitle>Выберите криовиалы</CardTitle>
            <CardDescription>
              Выберите виалы для разморозки из банка {selectedBank.code}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Доступно виал: {vials.length} из {selectedBank.vials_total}
                </p>
                <Button variant="outline" size="sm" onClick={selectAllVials}>
                  {selectedVials.length === vials.length ? 'Снять все' : 'Выбрать все'}
                </Button>
              </div>
              
              <div className="grid gap-2 max-h-80 overflow-y-auto">
                {vials.map(vial => (
                  <div 
                    key={vial.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedVials.find(v => v.id === vial.id)
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => toggleVial(vial)}
                  >
                    <Checkbox 
                      checked={!!selectedVials.find(v => v.id === vial.id)}
                      onCheckedChange={() => toggleVial(vial)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">V-{vial.vial_number}</Badge>
                        <span className="text-sm text-muted-foreground">
                          {vial.position?.path || 'Позиция не указана'}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-right">
                      <span className="text-muted-foreground">cells/vial: </span>
                      <span className="font-medium">
                        {vial.cells_count?.toLocaleString() || 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              
              {vials.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Нет доступных виал для разморозки
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Step 3: Parameters */}
      {step === 3 && selectedVials.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Параметры разморозки</CardTitle>
            <CardDescription>
              Укажите параметры процесса разморозки
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Thaw Method */}
            <div className="space-y-2">
              <Label>Метод разморозки</Label>
              <Select 
                value={thawParams.thawMethod}
                onValueChange={(v) => setThawParams({...thawParams, thawMethod: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WATER_BATH">Водяная баня (37°C)</SelectItem>
                  <SelectItem value="37C_INCUBATOR">Инкубатор (37°C)</SelectItem>
                  <SelectItem value="ROOM_TEMP">Комнатная температура</SelectItem>
                  <SelectItem value="MANUAL">Ручная разморозка</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Media */}
            <div className="space-y-2">
              <Label>Партия среды для разморозки (FEFO)</Label>
              <Select 
                value={thawParams.mediaBatch}
                onValueChange={(v) => setThawParams({...thawParams, mediaBatch: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите партию среды..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DMEM-F12-001">
                    DMEM/F12 - DMEM-001 (срок: 30.06.2026)
                  </SelectItem>
                  <SelectItem value="DMEM-F12-002">
                    DMEM/F12 - DMEM-002 (срок: 15.07.2026)
                  </SelectItem>
                  <SelectItem value="DMEM-001">
                    DMEM - DMEM-001 (срок: 20.05.2026)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Система автоматически предлагает партию с ближайшим сроком годности
              </p>
            </div>
            
            {/* Volume */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Объём среды (мл)</Label>
                <Input 
                  type="number"
                  value={thawParams.volume_ml}
                  onChange={(e) => setThawParams({...thawParams, volume_ml: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label>Время разморозки (мин)</Label>
                <Input 
                  type="number"
                  value={thawParams.thawTime}
                  onChange={(e) => setThawParams({...thawParams, thawTime: parseInt(e.target.value) || 0})}
                  placeholder="Опционально"
                />
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="font-medium mb-4">Результат</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Тип контейнера</Label>
                  <Select 
                    value={resultParams.containerType}
                    onValueChange={(v) => setResultParams({...resultParams, containerType: v})}
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
                
                <div className="space-y-2">
                  <Label>Позиция (опционально)</Label>
                  <Select 
                    value={resultParams.position?.id || ''}
                    onValueChange={(v) => {
                      const pos = positions.find(p => p.id === v)
                      setResultParams({...resultParams, position: pos})
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
            <CardTitle>Подтверждение разморозки</CardTitle>
            <CardDescription>
              Проверьте данные перед сохранением
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h3 className="font-medium">Банк</h3>
                <p><span className="text-muted-foreground">Код:</span> {selectedBank?.code}</p>
                <p><span className="text-muted-foreground">Тип:</span> {selectedBank?.bank_type}</p>
                <p><span className="text-muted-foreground">Пассаж:</span> P{selectedBank?.passage_number}</p>
                <p><span className="text-muted-foreground">Культура:</span> {lotInfo?.culture?.name}</p>
              </div>
              
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <h3 className="font-medium">Разморозка</h3>
                <p><span className="text-muted-foreground">Виал:</span> {selectedVials.length} шт.</p>
                <p><span className="text-muted-foreground">Метод:</span> {thawParams.thawMethod}</p>
                <p><span className="text-muted-foreground">Среда:</span> {thawParams.mediaBatch}</p>
                <p><span className="text-muted-foreground">Объём:</span> {thawParams.volume_ml} мл</p>
              </div>
            </div>
            
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-medium">Результат</h3>
              <p><span className="text-muted-foreground">Новый пассаж:</span> P{selectedBank?.passage_number + 1}</p>
              <p><span className="text-muted-foreground">Контейнер:</span> {containerTypes.find(t => t.id === resultParams.containerType)?.name}</p>
            </div>
            
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
              <CheckCircle2 className="h-4 w-4" />
              <p className="text-sm">
                Будет создан новый лот P{selectedBank?.passage_number + 1} с контейнером-результатом
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
              (step === 1 && !selectedBank) ||
              (step === 2 && selectedVials.length === 0) ||
              (step === 3 && !thawParams.mediaBatch)
            }
          >
            Далее
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            <Snowflake className="h-4 w-4 mr-2" />
            {loading ? 'Сохранение...' : 'Выполнить разморозку'}
          </Button>
        )}
      </div>
    </div>
  )
}
