"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ArrowRight, 
  Archive, 
  Beaker, 
  ClipboardList, 
  Package, 
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { getDashboardStats, getBanks, getOrders, getOperations } from '@/lib/api'
import { formatDate, getStatusLabel } from '@/lib/utils'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalLots: 0,
    totalBanks: 0,
    totalOrders: 0,
    totalContainers: 0,
  })
  const [recentBanks, setRecentBanks] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [pendingOperations, setPendingOperations] = useState<any[]>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [statsData, banks, orders, operations] = await Promise.all([
        getDashboardStats(),
        getBanks(),
        getOrders(),
        getOperations({ type: 'THAW' })
      ])
      
      setStats(statsData)
      setRecentBanks(banks.slice(0, 5))
      setRecentOrders(orders.slice(0, 5))
      setPendingOperations(operations.filter(op => op.status === 'IN_PROGRESS').slice(0, 5))
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    {
      title: 'Клеточные культуры',
      value: stats.totalLots,
      description: 'Активные культуры',
      icon: Beaker,
      href: '/cultures',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Клеточные банки',
      value: stats.totalBanks,
      description: 'Всего в хранилище',
      icon: Archive,
      href: '/banks',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Заказы',
      value: stats.totalOrders,
      description: 'Активные заказы',
      icon: ClipboardList,
      href: '/orders',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Контейнеры',
      value: stats.totalContainers,
      description: 'На хранении',
      icon: Package,
      href: '/containers',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ]

  if (loading) {
    return (
      <div className="container py-6 flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Лаборатория</h1>
        <p className="text-muted-foreground">
          Система управления клеточными культурами и биобанком
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="hover:bg-accent transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-full ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
          <CardDescription>Часто используемые операции</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/operations/new?type=THAW">
                <Beaker className="h-5 w-5" />
                <span>Разморозка</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/operations/new?type=FEEDING">
                <TrendingUp className="h-5 w-5" />
                <span>Кормление</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/orders/new">
                <ClipboardList className="h-5 w-5" />
                <span>Новый заказ</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link href="/donors/new">
                <Package className="h-5 w-5" />
                <span>Приём донора</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Banks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Последние банки</CardTitle>
              <CardDescription>Недавно созданные клеточные банки</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/banks">
                Все <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentBanks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Банки не найдены
                </p>
              ) : (
                recentBanks.map((bank) => (
                  <div key={bank.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-full">
                        <Archive className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {bank.culture?.name || bank.id?.slice(0, 8)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {bank.bank_type} • {bank.cryo_vials_count} пробирок
                        </p>
                      </div>
                    </div>
                    <Badge className={getStatusColor(bank.status)}>
                      {getStatusLabel(bank.status)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Последние заказы</CardTitle>
              <CardDescription>Недавние заказы на выдачу</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/orders">
                Все <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Заказы не найдены
                </p>
              ) : (
                recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-100 rounded-full">
                        <ClipboardList className="h-4 w-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {order.order_number}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {order.culture_type?.name || '-'} • {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>
                    <Badge className={getOrderStatusColor(order.status)}>
                      {getStatusLabel(order.status)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Operations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Активные операции</CardTitle>
            <CardDescription>Операции в процессе выполнения</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/operations">
              Все <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {pendingOperations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-sm font-medium">Нет активных операций</p>
              <p className="text-xs text-muted-foreground mt-1">
                Все операции завершены
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingOperations.map((op) => (
                <div key={op.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-full">
                      <Clock className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {op.type} • {op.container?.lot?.culture?.name || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Начато: {formatDate(op.started_at)}
                      </p>
                    </div>
                  </div>
                  <Progress value={65} className="w-24" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Требует внимания
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-yellow-700">
                • 3 банка на карантине ожидают QC
              </p>
              <p className="text-sm text-yellow-700">
                • 2 заказа ожидают подтверждения
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Срок годности</CardTitle>
            <CardDescription>Реагенты с истекающим сроком</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Нет реагентов с истекающим сроком годности
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    QUARANTINE: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    RESERVED: 'bg-blue-100 text-blue-800',
    ISSUED: 'bg-purple-100 text-purple-800',
    DISPOSE: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getOrderStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-800',
    APPROVED: 'bg-green-100 text-green-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-purple-100 text-purple-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
