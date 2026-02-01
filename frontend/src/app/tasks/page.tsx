"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  CheckSquare, 
  Plus, 
  Search,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  MoreHorizontal,
  Bell
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getTasks, createTask, completeTask, getContainers, getBanks } from '@/lib/api'
import { formatDate, formatDateTime, getStatusLabel } from '@/lib/utils'

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  LOW: { color: 'bg-gray-100 text-gray-800', label: 'Низкий' },
  MEDIUM: { color: 'bg-yellow-100 text-yellow-800', label: 'Средний' },
  HIGH: { color: 'bg-orange-100 text-orange-800', label: 'Высокий' },
  CRITICAL: { color: 'bg-red-100 text-red-800', label: 'Критический' },
}

const TYPE_CONFIG: Record<string, { label: string; icon: any }> = {
  FEED: { label: 'Кормление', icon: Clock },
  PASSAGE: { label: 'Пассажирование', icon: ArrowRight },
  OBSERVE: { label: 'Наблюдение', icon: AlertCircle },
  QC: { label: 'QC тест', icon: CheckCircle2 },
  FREEZE: { label: 'Заморозка', icon: Clock },
  SHIPMENT: { label: 'Отгрузка', icon: ArrowRight },
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [containers, setContainers] = useState<any[]>([])
  const [banks, setBanks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('PENDING')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  
  // Форма создания
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    type: 'OBSERVE',
    priority: 'MEDIUM',
    due_date: '',
    container_id: '',
    bank_id: '',
  })
  
  useEffect(() => {
    loadData()
  }, [])
  
  const loadData = async () => {
    setLoading(true)
    try {
      const [tasksData, containersData, banksData] = await Promise.all([
        getTasks(),
        getContainers({ status: 'ACTIVE' }),
        getBanks()
      ])
      setTasks(tasksData || [])
      setContainers(containersData || [])
      setBanks(banksData || [])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreate = async () => {
    try {
      await createTask({
        ...newTask,
        status: 'PENDING',
        due_date: newTask.due_date || null,
      })
      setShowCreateDialog(false)
      setNewTask({
        title: '',
        description: '',
        type: 'OBSERVE',
        priority: 'MEDIUM',
        due_date: '',
        container_id: '',
        bank_id: '',
      })
      loadData()
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }
  
  const handleComplete = async (id: string) => {
    try {
      await completeTask(id)
      loadData()
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }
  
  const getUrgencyStatus = (dueDate: string) => {
    if (!dueDate) return { status: 'none', label: '', color: '' }
    
    const due = new Date(dueDate)
    const now = new Date()
    const hoursLeft = (due.getTime() - now.getTime()) / (1000 * 60 * 60)
    
    if (hoursLeft < 0) return { status: 'overdue', label: 'Просрочено', color: 'text-red-600' }
    if (hoursLeft < 24) return { status: 'urgent', label: `Осталось ${hoursLeft.toFixed(1)} ч.`, color: 'text-orange-600' }
    if (hoursLeft < 72) return { status: 'soon', label: `Осталось ${(hoursLeft / 24).toFixed(1)} дн.`, color: 'text-yellow-600' }
    return { status: 'ok', label: formatDate(dueDate), color: 'text-green-600' }
  }
  
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchQuery === '' || 
      task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus
    
    return matchesSearch && matchesStatus
  })
  
  const stats = {
    pending: tasks.filter(t => t.status === 'PENDING').length,
    overdue: tasks.filter(t => t.status === 'PENDING' && t.due_date && new Date(t.due_date) < new Date()).length,
    today: tasks.filter(t => {
      if (t.status !== 'PENDING' || !t.due_date) return false
      const due = new Date(t.due_date)
      const today = new Date()
      return due.toDateString() === today.toDateString()
    }).length,
    completed: tasks.filter(t => t.status === 'COMPLETED').length,
  }
  
  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Задачи</h1>
          <p className="text-muted-foreground">
            Планирование и отслеживание операций
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Создать задачу
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Новая задача</DialogTitle>
              <DialogDescription>
                Создайте напоминание о необходимой операции
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Тип задачи</Label>
                <Select 
                  value={newTask.type}
                  onValueChange={(v) => setNewTask({...newTask, type: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Название</Label>
                <Input 
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  placeholder="Например: Кормление культуры A"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea 
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  placeholder="Подробности задачи..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Приоритет</Label>
                  <Select 
                    value={newTask.priority}
                    onValueChange={(v) => setNewTask({...newTask, priority: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Срок выполнения</Label>
                  <Input 
                    type="datetime-local"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({...newTask, due_date: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Связанный контейнер</Label>
                <Select 
                  value={newTask.container_id}
                  onValueChange={(v) => setNewTask({...newTask, container_id: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите контейнер..." />
                  </SelectTrigger>
                  <SelectContent>
                    {containers.map(container => (
                      <SelectItem key={container.id} value={container.id}>
                        {container.code} - {container.lot?.culture?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Отмена
              </Button>
              <Button onClick={handleCreate} disabled={!newTask.title}>
                Создать
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ожидают выполнения
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Просрочено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              На сегодня
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.today}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Выполнено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск задач..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
          <TabsList>
            <TabsTrigger value="PENDING">Ожидают</TabsTrigger>
            <TabsTrigger value="COMPLETED">Выполнено</TabsTrigger>
            <TabsTrigger value="all">Все</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Tasks List */}
      <div className="grid gap-4">
        {filteredTasks
          .sort((a, b) => {
            // Сначала просроченные
            if (a.status === 'PENDING' && b.status === 'COMPLETED') return -1
            if (a.status === 'COMPLETED' && b.status === 'PENDING') return 1
            // По приоритету
            const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
            return (priorityOrder[a.priority as string] || 3) - (priorityOrder[b.priority as string] || 3)
          })
          .map((task) => {
            const typeConfig = TYPE_CONFIG[task.type] || TYPE_CONFIG.OBSERVE
            const TypeIcon = typeConfig.icon
            const priorityConfig = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM
            const urgencyStatus = getUrgencyStatus(task.due_date)
            
            return (
              <Card key={task.id} className={task.status === 'COMPLETED' ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      task.status === 'COMPLETED' ? 'bg-green-100' : 'bg-primary/10'
                    }`}>
                      {task.status === 'COMPLETED' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <TypeIcon className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium ${task.status === 'COMPLETED' ? 'line-through' : ''}`}>
                          {task.title}
                        </h3>
                        <Badge className={priorityConfig.color}>
                          {priorityConfig.label}
                        </Badge>
                        <Badge variant="outline">
                          {typeConfig.label}
                        </Badge>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {task.container && (
                          <span>📦 {task.container.code}</span>
                        )}
                        {task.bank && (
                          <span>🏦 {task.bank.code}</span>
                        )}
                        {task.due_date && (
                          <span className={`flex items-center gap-1 ${urgencyStatus.color}`}>
                            <Clock className="h-3 w-3" />
                            {urgencyStatus.label}
                          </span>
                        )}
                        {task.created_at && (
                          <span>Создано: {formatDate(task.created_at)}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {task.status === 'PENDING' && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleComplete(task.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Выполнить
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Действия</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href={`/operations/new?type=${task.type}`}>
                              <ArrowRight className="h-4 w-4 mr-2" />
                              Выполнить операцию
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Bell className="h-4 w-4 mr-2" />
                            Напомнить позже
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
        {filteredTasks.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Задачи не найдены</p>
          </div>
        )}
      </div>
    </div>
  )
}
