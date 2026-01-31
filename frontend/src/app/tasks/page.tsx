import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  CheckCircle, Clock, Eye, Utensils, FlaskConical, 
  AlertTriangle, Wrench, Calendar 
} from 'lucide-react'
import Link from 'next/link'

// Mock tasks
const mockTasks = [
  {
    id: '1',
    type: 'INSPECT',
    target_type: 'CONTAINER',
    target_id: 'container-1',
    status: 'PENDING',
    due_date: '2026-02-01',
    last_done_date: '2026-01-28',
    interval_days: 3,
    container: { code: 'CT-0001-L1-P4-FL-001' },
    culture: { id: 'culture-1', name: 'MSC-001' }
  },
  {
    id: '2',
    type: 'FEED',
    target_type: 'LOT',
    target_id: 'lot-1',
    status: 'PENDING',
    due_date: '2026-02-01',
    last_done_date: '2026-01-28',
    interval_days: 3,
    lot: { passage_number: 4 },
    culture: { id: 'culture-1', name: 'MSC-001' },
    culture_id: 'culture-1'
  },
  {
    id: '3',
    type: 'QC_DUE',
    target_type: 'BANK',
    target_id: 'bank-1',
    status: 'PENDING',
    due_date: '2026-02-05',
    bank: { bank_type: 'MCB' },
    culture: { id: 'culture-1', name: 'MSC-001' },
    culture_id: 'culture-1'
  },
  {
    id: '4',
    type: 'FEFO',
    target_type: 'BATCH',
    target_id: 'batch-1',
    status: 'PENDING',
    due_date: '2026-01-31',
    nomenclature: { name: 'DMEM/F12' }
  },
  {
    id: '5',
    type: 'MAINTENANCE',
    target_type: 'EQUIPMENT',
    target_id: 'eq-1',
    status: 'PENDING',
    due_date: '2026-02-10',
    equipment: { code: 'INC-01', name: 'Инкубатор 1' }
  }
]

export default function TasksPage() {
  const pendingTasks = mockTasks.filter(t => t.status === 'PENDING')
  const completedTasks = mockTasks.filter(t => t.status === 'COMPLETED')

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      INSPECT: <Eye className="h-5 w-5 text-blue-500" />,
      FEED: <Utensils className="h-5 w-5 text-green-500" />,
      QC_DUE: <FlaskConical className="h-5 w-5 text-purple-500" />,
      FEFO: <AlertTriangle className="h-5 w-5 text-orange-500" />,
      ORDER_DUE: <Calendar className="h-5 w-5 text-red-500" />,
      MAINTENANCE: <Wrench className="h-5 w-5 text-yellow-500" />
    }
    return icons[type] || <Clock className="h-5 w-5" />
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      INSPECT: 'Осмотр',
      FEED: 'Подкормка',
      QC_DUE: 'QC',
      FEFO: 'FEFO',
      ORDER_DUE: 'Срок заявки',
      MAINTENANCE: 'Обслуживание'
    }
    return labels[type] || type
  }

  const getUrgencyBadge = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) {
      return <Badge variant="destructive">Просрочено</Badge>
    }
    if (diffDays <= 1) {
      return <Badge variant="destructive">Срочно</Badge>
    }
    if (diffDays <= 3) {
      return <Badge variant="secondary">Скоро</Badge>
    }
    return <Badge variant="outline">Обычная</Badge>
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Задачи</h1>
          <p className="text-muted-foreground">
            {pendingTasks.length} задач ожидает выполнения
          </p>
        </div>
        <Link href="/tasks/new">
          <Button>
            <Clock className="mr-2 h-4 w-4" />
            Создать задачу
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Ожидают ({pendingTasks.length})</TabsTrigger>
          <TabsTrigger value="completed">Выполненные ({completedTasks.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {pendingTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-4 p-4 border rounded-lg">
                    <div className="mt-1">
                      {getTypeIcon(task.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {getTypeLabel(task.type)}
                        </span>
                        {getUrgencyBadge(task.due_date)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {task.type === 'INSPECT' && task.container && (
                          <>Контейнер: <Link href={`/containers/${task.target_id}`} className="hover:underline font-mono">{task.container.code}</Link></>
                        )}
                        {task.type === 'FEED' && task.culture && (
                          <>Культура: <Link href={`/cultures/${task.culture_id}`} className="hover:underline">{task.culture.name}</Link> (Лот P{task.lot?.passage_number})</>
                        )}
                        {task.type === 'QC_DUE' && task.culture && (
                          <>Банк {task.bank?.bank_type} для <Link href={`/cultures/${task.culture_id}`} className="hover:underline">{task.culture.name}</Link></>
                        )}
                        {task.type === 'FEFO' && task.nomenclature && (
                          <>Партия: {task.nomenclature.name}</>
                        )}
                        {task.type === 'MAINTENANCE' && task.equipment && (
                          <>{task.equipment.name} ({task.equipment.code})</>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Последнее выполнение: {task.last_done_date 
                          ? new Date(task.last_done_date).toLocaleDateString('ru-RU')
                          : 'нет'
                        } • Интервал: {task.interval_days} дн.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground mb-2">
                        Срок: {new Date(task.due_date).toLocaleDateString('ru-RU')}
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Отложить
                        </Button>
                        <Button size="sm">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Выполнить
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {pendingTasks.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нет задач, ожидающих выполнения</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Нет выполненных задач</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
