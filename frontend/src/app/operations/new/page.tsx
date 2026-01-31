"use client"

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ThermometerSnowflake,
  Beaker,
  Activity,
  FileText,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getContainers, createOperation, getLots } from '@/lib/api'
import { formatDate, getOperationTypeLabel } from '@/lib/utils'

const OPERATION_TYPES = [
  { value: 'THAW', label: 'Размораживание', icon: ThermometerSnowflake },
  { value: 'FEEDING', label: 'Кормление', icon: Activity },
  { value: 'PASSAGE', label: 'Пассирование', icon: Beaker },
  { value: 'FREEZE', label: 'Заморозка', icon: ThermometerSnowflake },
  { value: 'OBSERVE', label: 'Наблюдение', icon: Eye },
  { value: 'QC', label: 'QC контроль', icon: FileText },
]

export default function NewOperationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type') || 'FEEDING'
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [operationType, setOperationType] = useState(initialType)
  const [containers, setContainers] = useState<any[]>([])
  const [lots, setLots] = useState<any[]>([])
  const [selectedContainerId, setSelectedContainerId] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [parameters, setParameters] = useState<Record<string, string>>({})
  const [selectedContainer, setSelectedContainer] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [containersData, lotsData] = await Promise.all([
        getContainers({ status: 'IN_CULTURE' }),
        getLots({ status: 'ACTIVE' })
      ])
      setContainers(containersData || [])
      setLots(lotsData || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleContainerSelect = (containerId: string) => {
    setSelectedContainerId(containerId)
    const container = containers.find(c => c.id === containerId)
    setSelectedContainer(container)
  }

  const handleSubmit = async () => {
    if (!selectedContainerId) {
      setError('Выберите контейнер')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const operation = {
        type: operationType,
        container_id: selectedContainerId,
        status: 'IN_PROGRESS',
        started_at: new Date().toISOString(),
        notes: notes,
        parameters: parameters,
      }

      await createOperation(operation)
      setSuccess(true)
      
      setTimeout(() => {
        router.push('/operations')
      }, 2000)
    } catch (err: any) {
      console.error('Error creating operation:', err)
      setError(err.message || 'Ошибка создания операции')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-6 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (success) {
    return (
      <div className="container py-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Операция создана</h2>
              <p className="text-muted-foreground">
                Операция "{getOperationTypeLabel(operationType)}" успешно начата
              </p>
              <p className="text-sm text-muted-foreground mt-4">
                Перенаправление в список операций...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
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
          <h1 className="text-2xl font-bold tracking-tight">Новая операция</h1>
          <p className="text-muted-foreground">
            Запуск операции с клеточной культурой
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Operation Type */}
          <Card>
            <CardHeader>
              <CardTitle>Тип операции</CardTitle>
              <CardDescription>
                Выберите тип выполняемой операции
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                {OPERATION_TYPES.map((type) => {
                  const Icon = type.icon
                  const isSelected = operationType === type.value
                  return (
                    <div
                      key={type.value}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5 ring-2 ring-primary' 
                          : 'hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setOperationType(type.value)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-gray-100'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{type.label}</p>
                          <p className="text-xs text-muted-foreground">{type.value}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Container Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Выбор контейнера</CardTitle>
              <CardDescription>
                Выберите контейнер для проведения операции
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Фильтр по типу</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Все типы" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Все типы</SelectItem>
                      <SelectItem value="FLASK">Колбы</SelectItem>
                      <SelectItem value="PLATE">Плашки</SelectItem>
                      <SelectItem value="TUBE">Пробирки</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Поиск по коду</Label>
                  <Input placeholder="Введите код контейнера..." />
                </div>
              </div>

              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {containers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    Контейнеры не найдены
                  </div>
                ) : (
                  containers.map((container) => (
                    <div
                      key={container.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedContainerId === container.id
                          ? 'bg-primary/10 border-l-2 border-primary'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleContainerSelect(container.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{container.code}</p>
                          <p className="text-sm text-muted-foreground">
                            {container.lot?.culture?.name} • P{container.lot?.passage_number}
                          </p>
                        </div>
                        <Badge variant="outline">{container.container_type}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>Параметры операции</CardTitle>
              <CardDescription>
                Укажите дополнительные параметры для операции
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {operationType === 'THAW' && (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Время размораживания (сек)</Label>
                      <Input 
                        type="number" 
                        placeholder="60"
                        value={parameters.thaw_duration || ''}
                        onChange={(e) => setParameters({...parameters, thaw_duration: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Температура водяной бани (°C)</Label>
                      <Input 
                        type="number" 
                        placeholder="37"
                        value={parameters.water_bath_temp || ''}
                        onChange={(e) => setParameters({...parameters, water_bath_temp: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Номер пробирки в Dewar</Label>
                    <Input 
                      placeholder="Например: A1"
                      value={parameters.vial_position || ''}
                      onChange={(e) => setParameters({...parameters, vial_position: e.target.value})}
                    />
                  </div>
                </>
              )}
              
              {operationType === 'FEEDING' && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Объём среды (мл)</Label>
                    <Input 
                      type="number"
                      placeholder="10"
                      value={parameters.media_volume || ''}
                      onChange={(e) => setParameters({...parameters, media_volume: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Тип среды</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DMEM">DMEM</SelectItem>
                        <SelectItem value="RPM">RPMI</SelectItem>
                        <SelectItem value="MEM">MEM</SelectItem>
                        <SelectItem value="DMEM-F12">DMEM/F-12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {operationType === 'PASSAGE' && (
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Соотношение</Label>
                    <Input 
                      placeholder="1:5"
                      value={parameters.split_ratio || ''}
                      onChange={(e) => setParameters({...parameters, split_ratio: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Новый пассаж</Label>
                    <Input 
                      type="number"
                      placeholder={String((selectedContainer?.lot?.passage_number || 0) + 1)}
                      value={parameters.new_passage || ''}
                      onChange={(e) => setParameters({...parameters, new_passage: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Количество флаконов</Label>
                    <Input 
                      type="number"
                      placeholder="2"
                      value={parameters.flask_count || ''}
                      onChange={(e) => setParameters({...parameters, flask_count: e.target.value})}
                    />
                  </div>
                </div>
              )}

              {operationType === 'FREEZE' && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Концентрация клеток (млн/мл)</Label>
                    <Input 
                      type="number"
                      placeholder="5"
                      value={parameters.cell_concentration || ''}
                      onChange={(e) => setParameters({...parameters, cell_concentration: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Объём на пробирку (мл)</Label>
                    <Input 
                      type="number"
                      placeholder="1"
                      value={parameters.volume_per_vial || ''}
                      onChange={(e) => setParameters({...parameters, volume_per_vial: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Примечания</Label>
                <Textarea 
                  placeholder="Дополнительные заметки по операции..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Container Info */}
          <Card>
            <CardHeader>
              <CardTitle>Выбранный контейнер</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedContainer ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Код</span>
                    <span className="font-medium">{selectedContainer.code}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Культура</span>
                    <span className="font-medium">{selectedContainer.lot?.culture?.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Пассаж</span>
                    <span className="font-medium">P{selectedContainer.lot?.passage_number}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Тип</span>
                    <Badge>{selectedContainer.container_type}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Дата посева</span>
                    <span className="font-medium">
                      {selectedContainer.seeded_at ? formatDate(selectedContainer.seeded_at) : '-'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Контейнер не выбран
                </p>
              )}
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              <Button 
                className="w-full" 
                size="lg"
                onClick={handleSubmit}
                disabled={!selectedContainerId || submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Начать операцию
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Рекомендации</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-2">
                {operationType === 'THAW' && (
                  <p>• Проверьте номер пробирки в Dewar перед размораживанием</p>
                )}
                {operationType === 'FEEDING' && (
                  <p>• Убедитесь в отсутствии контаминации перед кормлением</p>
                )}
                {operationType === 'PASSAGE' && (
                  <p>• Проверьте жизнеспособность клеток перед пассированием</p>
                )}
                {operationType === 'FREEZE' && (
                  <p>• Подготовьте криопробирки заранее</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
