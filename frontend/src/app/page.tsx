"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { 
  FlaskConical, 
  Package, 
  Database, 
  ClipboardList, 
  Bell, 
  TrendingUp,
  Calendar,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Clock
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  getDashboardStats, 
  getTasks, 
  getNotifications, 
  getUnreadNotificationCount,
  getOperations 
} from "@/lib/api"
import { format, differenceInDays, isPast, addDays } from "date-fns"
import { ru } from "date-fns/locale"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalCultures: 0,
    activeCultures: 0,
    totalBanks: 0,
    pendingOrders: 0,
    pendingTasks: 0,
    activeContainers: 0,
  })
  const [tasks, setTasks] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentOperations, setRecentOperations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [statsData, tasksData, notificationsData, unreadData, operationsData] = await Promise.all([
        getDashboardStats(),
        getTasks({ status: 'PENDING' }).catch(() => []),
        getNotifications({ limit: 5 }).catch(() => []),
        getUnreadNotificationCount().catch(() => 0),
        getOperations({ status: 'COMPLETED' }).catch(() => [])
      ])
      
      setStats(statsData)
      setTasks(tasksData.slice(0, 5))
      setNotifications(notificationsData)
      setUnreadCount(unreadData)
      setRecentOperations(operationsData.slice(0, 5))
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getDaysUntilDue = (dueDate: string) => {
    if (!dueDate) return null
    const due = new Date(dueDate)
    if (isPast(due)) return { days: 0, urgent: true, overdue: true }
    const days = differenceInDays(due, new Date())
    return { days, urgent: days <= 2, overdue: false }
  }

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-500'
      case 'MEDIUM': return 'bg-yellow-500'
      case 'LOW': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header with Notifications */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Панель управления</h1>
          <p className="text-muted-foreground">Обзор состояния лаборатории</p>
        </div>
        <Link href="/notifications">
          <Button variant="outline" className="relative">
            <Bell className="mr-2 h-4 w-4" />
            Уведомления
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Культуры</CardTitle>
            <FlaskConical className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCultures}</div>
            <p className="text-xs text-muted-foreground">активных из {stats.totalCultures}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Банки</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBanks}</div>
            <p className="text-xs text-muted-foreground">криобанков</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Заявки</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">в обработке</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Контейнеры</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeContainers}</div>
            <p className="text-xs text-muted-foreground">в культивировании</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Мои задачи
                </CardTitle>
                <CardDescription>Текущие задачи требующие внимания</CardDescription>
              </div>
              <Link href="/tasks">
                <Button variant="ghost" size="sm">
                  Все
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Нет активных задач</p>
              </div>
            ) : (
              <div className="space-y-4">
                {tasks.map((task) => {
                  const dueInfo = getDaysUntilDue(task.due_date)
                  return (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${getTaskPriorityColor(task.priority)}`} />
                        <div>
                          <p className="font-medium">
                            {task.title || (
                              task.type === 'FEED' ? 'Кормление' :
                              task.type === 'OBSERVE' ? 'Наблюдение' :
                              task.type === 'PASSAGE' ? 'Пассаж' :
                              task.type === 'QC' ? 'Контроль качества' :
                              task.type
                            )}
                          </p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {dueInfo && (
                          <Badge 
                            variant={dueInfo.overdue ? "destructive" : dueInfo.urgent ? "secondary" : "outline"}
                          >
                            {dueInfo.overdue 
                              ? "Просрочено" 
                              : dueInfo.days === 0 
                                ? "Сегодня" 
                                : `${dueInfo.days} дн.`}
                          </Badge>
                        )}
                        {task.container?.code && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.container.code}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Уведомления
                </CardTitle>
                <CardDescription>Последние события и напоминания</CardDescription>
              </div>
              <Link href="/notifications">
                <Button variant="ghost" size="sm">
                  Все
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Нет уведомлений</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div 
                    key={notification.id}
                    className={`p-3 border rounded-lg ${notification.is_read ? 'bg-muted/30' : 'bg-muted/50 border-primary/20'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 ${notification.is_read ? 'text-muted-foreground' : 'text-primary'}`}>
                        {notification.type === 'QC_READY' && <AlertCircle className="h-4 w-4" />}
                        {notification.type === 'ORDER_DEADLINE' && <Clock className="h-4 w-4" />}
                        {notification.type === 'CRITICAL_FEFO' && <AlertCircle className="h-4 w-4" />}
                        {notification.type === 'EQUIPMENT_ALERT' && <Bell className="h-4 w-4" />}
                        {notification.type === 'CONTAMINATION' && <CheckCircle2 className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{notification.title}</p>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notification.created_at), "dd MMM HH:mm", { locale: ru })}
                        </p>
                      </div>
                      {!notification.is_read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Operations */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Последние операции
              </CardTitle>
              <CardDescription>Журнал выполненных операций</CardDescription>
            </div>
            <Link href="/operations">
              <Button variant="ghost" size="sm">
                Все
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentOperations.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Нет операций</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOperations.map((operation) => (
                <div 
                  key={operation.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {operation.operation_type === 'OBSERVE' && '👁️ Наблюдение'}
                      {operation.operation_type === 'FEED' && '🧪 Кормление'}
                      {operation.operation_type === 'PASSAGE' && '🔄 Пассаж'}
                      {operation.operation_type === 'FREEZE' && '❄️ Заморозка'}
                      {operation.operation_type === 'THAW' && '🔥 Размораживание'}
                      {operation.operation_type === 'DISPOSE' && '🗑️ Утилизация'}
                    </Badge>
                    <div>
                      <p className="font-medium">
                        {operation.lot?.culture?.name || '—'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Партия: {operation.lot?.lot_number || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {operation.completed_at 
                        ? format(new Date(operation.completed_at), "dd MMM HH:mm", { locale: ru })
                        : format(new Date(operation.started_at), "dd MMM HH:mm", { locale: ru })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4">
        <Link href="/operations/new">
          <Button className="w-full" variant="outline">
            <FlaskConical className="mr-2 h-4 w-4" />
            Новая операция
          </Button>
        </Link>
        <Link href="/tasks/new">
          <Button className="w-full" variant="outline">
            <ClipboardList className="mr-2 h-4 w-4" />
            Новая задача
          </Button>
        </Link>
        <Link href="/orders/new">
          <Button className="w-full" variant="outline">
            <Package className="mr-2 h-4 w-4" />
            Новый заказ
          </Button>
        </Link>
        <Link href="/scan">
          <Button className="w-full" variant="outline">
            <Bell className="mr-2 h-4 w-4" />
            QR Сканирование
          </Button>
        </Link>
      </div>
    </div>
  )
}
