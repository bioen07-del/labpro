"use client"

import { useState, useEffect } from 'react'
import { 
  Bell, 
  Search,
  Check,
  CheckCheck,
  Trash2,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'

const TYPE_CONFIG: Record<string, { icon: any; color: string; bgColor: string }> = {
  INFO: { icon: Info, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  SUCCESS: { icon: CheckCircle2, color: 'text-green-600', bgColor: 'bg-green-100' },
  WARNING: { icon: AlertTriangle, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  ERROR: { icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
  TASK: { icon: Bell, color: 'text-purple-600', bgColor: 'bg-purple-100' },
}

const CATEGORY_LABELS: Record<string, string> = {
  INVENTORY: 'Инвентарь',
  CONTAINER: 'Контейнеры',
  TASK: 'Задачи',
  ORDER: 'Заказы',
  SYSTEM: 'Система',
  QC: 'Контроль качества',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  
  useEffect(() => {
    loadNotifications()
  }, [])
  
  const loadNotifications = async () => {
    setLoading(true)
    try {
      const data = await getNotifications()
      setNotifications(data || [])
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id)
      loadNotifications()
    } catch (error) {
      console.error('Error marking notification read:', error)
    }
  }
  
  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead()
      loadNotifications()
    } catch (error) {
      console.error('Error marking all read:', error)
    }
  }
  
  const handleDelete = async (id: string) => {
    try {
      await deleteNotification(id)
      loadNotifications()
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }
  
  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = searchQuery === '' || 
      n.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || n.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })
  
  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.is_read).length,
    warnings: notifications.filter(n => n.type === 'WARNING' && !n.is_read).length,
    errors: notifications.filter(n => n.type === 'ERROR' && !n.is_read).length,
  }
  
  const categories = [...new Set(notifications.map(n => n.category).filter(Boolean))]
  
  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Уведомления</h1>
          <p className="text-muted-foreground">
            Оповещения системы и напоминания
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.unread > 0 && (
            <Button variant="outline" onClick={handleMarkAllRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Отметить все прочитанным
            </Button>
          )}
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего уведомлений
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Непрочитанные
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Предупреждения
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ошибки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск уведомлений..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat}>
                {CATEGORY_LABELS[cat] || cat}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      
      {/* Notifications List */}
      <div className="grid gap-4">
        {filteredNotifications
          .sort((a, b) => {
            // Непрочитанные сначала
            if (a.is_read !== b.is_read) return a.is_read ? 1 : -1
            // По дате
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          })
          .map((notification) => {
            const typeConfig = TYPE_CONFIG[notification.type] || TYPE_CONFIG.INFO
            const TypeIcon = typeConfig.icon
            
            return (
              <Card 
                key={notification.id} 
                className={`${!notification.is_read ? 'border-l-4 border-l-blue-500' : 'opacity-75'}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${typeConfig.bgColor}`}>
                      <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">
                          {notification.title}
                        </h3>
                        {!notification.is_read && (
                          <Badge variant="default" className="bg-blue-100 text-blue-800">
                            Новое
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {CATEGORY_LABELS[notification.category] || notification.category}
                        </Badge>
                        {notification.priority === 'HIGH' && (
                          <Badge variant="destructive">
                            Важно
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{formatDateTime(notification.created_at)}</span>
                        {notification.action_url && (
                          <a href={notification.action_url} className="text-blue-600 hover:underline">
                            Перейти →
                          </a>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Отметить прочитанным"
                          onClick={() => handleMarkRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Действия</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {!notification.is_read && (
                            <DropdownMenuItem onClick={() => handleMarkRead(notification.id)}>
                              <Check className="h-4 w-4 mr-2" />
                              Отметить прочитанным
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDelete(notification.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Удалить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          
        {filteredNotifications.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Уведомлений не найдено</p>
          </div>
        )}
      </div>
    </div>
  )
}
