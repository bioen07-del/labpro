"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  CheckSquare,
  FileText,
  Calendar,
  Clock
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
import { getTasks, createTask, getContainers, getBanks, getOrders } from '@/lib/api'

const TASK_TYPES = [
  { value: 'PASSAGE', label: 'Пассаж' },
  { value: 'FEED', label: 'Кормление' },
  { value: 'OBSERVE', label: 'Наблюдение' },
  { value: 'QC_TEST', label: 'QC тест' },
  { value: 'FREEZE', label: 'Криоконсервация' },
  { value: 'THAW', label: 'Размораживание' },
  { value: 'DISPOSE', label: 'Утилизация' },
  { value: 'SHIPPING', label: 'Отгрузка' },
  { value: 'MAINTENANCE', label: 'Обслуживание' },
  { value: 'OTHER', label: 'Другое' },
]

const TASK_PRIORITY = [
  { value: 'LOW', label: 'Низкий' },
  { value: 'MEDIUM', label: 'Средний' },
  { value: 'HIGH', label: 'Высокий' },
  { value: 'URGENT', label: 'Срочный' },
]

const TARGET_TYPES = [
  { value: 'CONTAINER', label: 'Контейнер' },
  { value: 'BANK', label: 'Банк' },
  { value: 'EQUIPMENT', label: 'Оборудование' },
  { value: 'ORDER', label: 'Заказ' },
  { value: 'NONE', label: 'Без привязки' },
]

function TasksPage() {
  const router = useRouter()
  
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tasks, setTasks] = useState<any[]>([])
  const [containers, setContainers] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [createdTask, setCreatedTask] = useState<any>(null)
  
  const [title, setTitle] = useState('')
  const [type, setType] = useState('')
  const [priority, setPriority] = useState('MEDIUM')
  const [targetType, setTargetType] = useState('NONE')
  const [targetId, setTargetId] = useState('')
  const [target, setTarget] = useState<any>(null)
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [tasksData, containersData, banksData, ordersData] = await Promise.all([
        getTasks(),
        getContainers({ status: 'ACTIVE' }),
        getBanks({ status: 'ACTIVE' }),
        getOrders(),
      ])
      setTasks(tasksData || [])
      setContainers(containersData || [])
      setBanks(banksData || [])
      setOrders(ordersData || [])
    } catch (err) {
      setError('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const handleTargetSelect = (id: string) => {
    setTargetId(id)
    if (targetType === 'CONTAINER') {
      setTarget(containers.find((c: any) => c.id === id))
    } else if (targetType === 'BANK') {
      setTarget(banks.find((b: any) => b.id === id))
    } else if (targetType === 'ORDER') {
      setTarget(orders.find((o: any) => o.id === id))
    }
  }

  const handleSubmit = async () => {
    if (!title || !type) {
      setError('Заполните обязательные поля')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const taskData = {
        title,
        type,
        priority,
        status: 'PENDING',
        target_type: targetType !== 'NONE' ? targetType : null,
        target_id: targetId || null,
        due_date: dueDate || null,
        description: description || null,
        notes: notes || null,
      }
      const created = await createTask(taskData)
      setCreatedTask(created)
      setSuccess(true)
      setTimeout(() => router.push('/tasks'), 2000)
    } catch (err: any) {
      setError(err.message || 'Ошибка создания задачи')
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
              <h2 className="text-xl font-semibold mb-2">Задача создана</h2>
              <p className="text-muted-foreground">{createdTask?.title}</p>
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
          <Link href="/tasks"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-orange-600" />
            Новая задача
          </h1>
          <p className="text-muted-foreground">Создание задачи для оператора</p>
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
              <CardTitle>Тип задачи</CardTitle>
              <CardDescription>Выберите тип выполняемой операции</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                {TASK_TYPES.map((taskType) => {
                  const isSelected = type === taskType.value
                  return (
                    <div
                      key={taskType.value}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        isSelected ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-500' : 'hover:border-gray-300'
                      }`}
                      onClick={() => setType(taskType.value)}
                    >
                      <p className="font-medium text-sm">{taskType.label}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Название задачи *</Label>
                <Input
                  id="title"
                  placeholder="Пассаж культуры MSC-001"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Приоритет</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TASK_PRIORITY.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueDate">Срок выполнения</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Связанный объект</CardTitle>
              <CardDescription>Объект, к которому относится задача</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Тип объекта</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {targetType === 'CONTAINER' && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {containers.map((container: any) => (
                    <div
                      key={container.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        targetId === container.id ? 'bg-orange-50 border-l-2 border-orange-500' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleTargetSelect(container.id)}
                    >
                      <p className="font-medium">{container.code}</p>
                      <p className="text-sm text-muted-foreground">{container.lot?.culture?.name}</p>
                    </div>
                  ))}
                </div>
              )}

              {targetType === 'BANK' && (
                <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                  {banks.map((bank: any) => (
                    <div
                      key={bank.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        targetId === bank.id ? 'bg-orange-50 border-l-2 border-orange-500' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleTargetSelect(bank.id)}
                    >
                      <p className="font-medium">{bank.code}</p>
                      <p className="text-sm text-muted-foreground">{bank.culture?.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Описание</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="description">Подробное описание</Label>
                <Textarea
                  id="description"
                  placeholder="Что именно нужно сделать..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Сводка</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Задача</span>
                  <span className="font-medium">{title || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Тип</span>
                  <Badge variant="outline">{TASK_TYPES.find(t => t.value === type)?.label || '-'}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Приоритет</span>
                  <Badge variant={priority === 'URGENT' ? 'destructive' : 'secondary'}>
                    {TASK_PRIORITY.find(p => p.value === priority)?.label}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleSubmit} 
                disabled={!title || !type || submitting}
              >
                {submitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Создание...</>
                ) : (
                  <><CheckSquare className="mr-2 h-4 w-4" />Создать задачу</>
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

export default function NewTaskPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TasksPage />
    </Suspense>
  )
}
