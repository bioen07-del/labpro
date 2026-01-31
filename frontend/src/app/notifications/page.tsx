import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Bell, AlertTriangle, CheckCircle, Clock, FlaskConical, 
  FileBox, Truck, Thermometer, AlertCircle 
} from 'lucide-react'

// Mock notifications
const mockNotifications = [
  {
    id: '1',
    type: 'QC_READY',
    title: 'QC-тест готов',
    message: 'Тест на микоплазму для MSC-001 завершён. Результат: отрицательный.',
    is_read: false,
    created_at: '2026-01-30T14:00:00Z',
    link_type: 'QC',
    link_id: 'qc-1'
  },
  {
    id: '2',
    type: 'ORDER_DEADLINE',
    title: 'Срок заявки приближается',
    message: 'Заявка ORD-0001 должна быть выполнена через 5 дней.',
    is_read: false,
    created_at: '2026-01-29T10:00:00Z',
    link_type: 'ORDER',
    link_id: 'order-1'
  },
  {
    id: '3',
    type: 'CRITICAL_FEFO',
    title: 'Критичный FEFO',
    message: 'Партия DMEM/F12 #123 истекает завтра!',
    is_read: true,
    created_at: '2026-01-28T08:00:00Z',
    link_type: 'BATCH',
    link_id: 'batch-1'
  },
  {
    id: '4',
    type: 'EQUIPMENT_ALERT',
    title: 'Требуется обслуживание',
    message: 'Инкубатор INC-01 требует технического обслуживания.',
    is_read: true,
    created_at: '2026-01-25T12:00:00Z',
    link_type: 'EQUIPMENT',
    link_id: 'eq-1'
  }
]

export default function NotificationsPage() {
  const unreadCount = mockNotifications.filter(n => !n.is_read).length

  const getIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      QC_READY: <FlaskConical className="h-5 w-5 text-green-500" />,
      ORDER_DEADLINE: <Clock className="h-5 w-5 text-orange-500" />,
      CRITICAL_FEFO: <AlertTriangle className="h-5 w-5 text-red-500" />,
      EQUIPMENT_ALERT: <Thermometer className="h-5 w-5 text-yellow-500" />,
      CONTAMINATION: <AlertCircle className="h-5 w-5 text-red-500" />
    }
    return icons[type] || <Bell className="h-5 w-5" />
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Уведомления</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0 
              ? `У вас ${unreadCount} непрочитанных уведомлений`
              : 'Все уведомления прочитаны'
            }
          </p>
        </div>
        <Button variant="outline">
          <CheckCircle className="mr-2 h-4 w-4" />
          Отметить все как прочитанные
        </Button>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Все</TabsTrigger>
          <TabsTrigger value="unread">Непрочитанные ({unreadCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {mockNotifications.map(notification => (
                  <div 
                    key={notification.id}
                    className={`flex gap-4 p-4 rounded-lg border ${
                      !notification.is_read ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="mt-1">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{notification.title}</span>
                        {!notification.is_read && (
                          <Badge variant="default" className="text-xs">Новое</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString('ru-RU')}
                        </span>
                        <Button variant="link" size="sm" className="h-auto p-0">
                          Перейти к объекту
                        </Button>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="shrink-0"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {mockNotifications.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нет уведомлений</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="unread">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {mockNotifications
                  .filter(n => !n.is_read)
                  .map(notification => (
                    <div key={notification.id} className="flex gap-4 p-4 rounded-lg bg-muted/50 border">
                      <div className="mt-1">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <span className="font-medium">{notification.title}</span>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString('ru-RU')}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon">
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                {mockNotifications.filter(n => !n.is_read).length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Нет непрочитанных уведомлений</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
