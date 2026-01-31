"use client"

import Link from 'next/link'
import { 
  FlaskConical, 
  Archive, 
  ClipboardList, 
  Package, 
  Bell, 
  AlertTriangle,
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { mockDashboardStats, mockTasks, mockOrders, mockNotifications } from '@/lib/mock-data'
import { formatDate, getStatusLabel, getTaskTypeLabel, formatRelativeTime } from '@/lib/utils'

export default function DashboardPage() {
  const stats = mockDashboardStats

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Дашборд</h1>
        <p className="text-muted-foreground">
          Обзор состояния лаборатории клеточных культур
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Активные культуры"
          value={stats.active_cultures}
          total={stats.total_cultures}
          icon={FlaskConical}
          trend="+2"
          trendUp
          color="blue"
        />
        <StatCard
          title="Клеточные банки"
          value={stats.total_banks}
          icon={Archive}
          trend="+1"
          trendUp
          color="green"
        />
        <StatCard
          title="Ожидающие заявки"
          value={stats.pending_orders}
          icon={ClipboardList}
          color="orange"
        />
        <StatCard
          title="Задач к выполнению"
          value={stats.pending_tasks}
          icon={Clock}
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Текущие задачи</CardTitle>
              <CardDescription>Запланированные операции и проверки</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/tasks">Все задачи</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockTasks.slice(0, 5).map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications & Alerts */}
        <div className="space-y-6">
          {/* Notifications */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Уведомления
                </CardTitle>
              </div>
              <Badge variant="secondary">{mockNotifications.filter(n => !n.is_read).length} новых</Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockNotifications.slice(0, 3).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border ${
                      !notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.is_read && (
                        <div className="h-2 w-2 rounded-full bg-blue-600 mt-2" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Expiring Batches Alert */}
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                FEFO контроль
              </CardTitle>
              <CardDescription className="text-orange-600">
                Материалы с истекающим сроком годности
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                  <div>
                    <p className="font-medium text-sm">DMEM/F12 (1:1)</p>
                    <p className="text-xs text-muted-foreground">Партия: DMEM-001</p>
                  </div>
                  <Badge variant="destructive">5 дней</Badge>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200">
                  <div>
                    <p className="font-medium text-sm">FBS (эмбриональная)</p>
                    <p className="text-xs text-muted-foreground">Партия: FBS-002</p>
                  </div>
                  <Badge variant="secondary">12 дней</Badge>
                </div>
              </div>
              <Button asChild variant="outline" size="sm" className="w-full mt-4">
                <Link href="/inventory?filter=expiring">Перейти к инвентарю</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Заявки</CardTitle>
            <CardDescription>Недавние заявки на выдачу и создание банков</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/orders">Все заявки</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <TableHeader />
            <TableBody orders={mockOrders.slice(0, 5)} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({ 
  title, 
  value, 
  total, 
  icon: Icon, 
  trend, 
  trendUp, 
  color 
}: {
  title: string
  value: number
  total?: number
  icon: any
  trend?: string
  trendUp?: boolean
  color: 'blue' | 'green' | 'orange' | 'purple'
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {total !== undefined && (
          <p className="text-xs text-muted-foreground mt-1">
            из {total} всего
          </p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className={`h-3 w-3 ${trendUp ? 'text-green-600' : 'text-red-600'}`} />
            <span className={`text-xs ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
              {trend} за месяц
            </span>
          </div>
        )}
        {total !== undefined && (
          <Progress value={(value / total) * 100} className="mt-2 h-1" />
        )}
      </CardContent>
    </Card>
  )
}

function TaskItem({ task }: { task: typeof mockTasks[0] }) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isOverdue ? 'bg-red-100' : 'bg-blue-100'}`}>
          <Clock className={`h-4 w-4 ${isOverdue ? 'text-red-600' : 'text-blue-600'}`} />
        </div>
        <div>
          <p className="font-medium text-sm">{getTaskTypeLabel(task.type)}</p>
          <p className="text-xs text-muted-foreground">
            {task.due_date ? `Срок: ${formatDate(task.due_date)}` : 'Без срока'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isOverdue && (
          <Badge variant="destructive">Просрочено</Badge>
        )}
        <Button variant="ghost" size="sm">
          Выполнить
        </Button>
      </div>
    </div>
  )
}

function TableHeader() {
  return (
    <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b text-sm font-medium text-muted-foreground">
      <div>Номер</div>
      <div>Клиент</div>
      <div>Тип</div>
      <div>Кол-во</div>
      <div>Дедлайн</div>
      <div>Статус</div>
    </div>
  )
}

function TableBody({ orders }: { orders: typeof mockOrders }) {
  return orders.map((order) => (
    <div
      key={order.id}
      className="grid grid-cols-6 gap-4 p-4 border-b last:border-0 items-center hover:bg-gray-50"
    >
      <div className="font-medium text-sm">{order.order_number}</div>
      <div className="text-sm">{order.customer_name}</div>
      <div>
        <Badge variant={order.order_type === 'ISSUANCE' ? 'default' : 'secondary'}>
          {order.order_type === 'ISSUANCE' ? 'Выдача' : 'Создание банка'}
        </Badge>
      </div>
      <div className="text-sm">{order.cells_quantity_mln} млн</div>
      <div className="text-sm">{order.deadline ? formatDate(order.deadline) : '-'}</div>
      <div>
        <Badge className={getStatusColor(order.status)}>
          {getStatusLabel(order.status)}
        </Badge>
      </div>
    </div>
  ))
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
