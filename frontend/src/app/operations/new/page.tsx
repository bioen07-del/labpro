"use client"

import { useState, useEffect, Suspense } from 'react'
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

function OperationForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialType = searchParams.get('type') || 'FEEDING'
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [operationType, setOperationType] = useState(initialType)
  const [containers, setContainers] = useState<any[]>([])
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
      const [containersData] = await Promise.all([
        getContainers({ status: 'IN_CULTURE' }),
      ])
      setContainers(containersData || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleContainerSelect = (containerId: string) => {
    setSelectedContainerId(containerId)
    const container = containers.find((c: any) => c.id === containerId)
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
      setTimeout(() => router.push('/operations'), 2000)
    } catch (err: any) {
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
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/operations"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Новая операция</h1>
          <p className="text-muted-foreground">Запуск операции с клеточной культурой</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Тип операции</CardTitle>
              <CardDescription>Выберите тип выполняемой операции</CardDescription>
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
                        isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary' : 'hover:border-gray-300'
                      }`}
                      onClick={() => setOperationType(type.value)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-gray-100'}`}>
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

          <Card>
            <CardHeader>
              <CardTitle>Выбор контейнера</CardTitle>
              <CardDescription>Выберите контейнер для проведения операции</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {containers.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">Контейнеры не найдены</div>
                ) : (
                  containers.map((container: any) => (
                    <div
                      key={container.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedContainerId === container.id ? 'bg-primary/10 border-l-2 border-primary' : 'hover:bg-gray-50'
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
        </div>

        <div className="space-y-6">
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
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Контейнер не выбран</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button className="w-full" size="lg" onClick={handleSubmit} disabled={!selectedContainerId || submitting}>
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Создание...</>
                ) : (
                  <><CheckCircle2 className="mr-2 h-4 w-4" />Начать операцию</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="container py-6 flex justify-center items-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

export default function NewOperationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OperationForm />
    </Suspense>
  )
}
