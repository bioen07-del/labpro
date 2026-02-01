"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Activity, 
  Plus, 
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle2,
  Clock,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getOperations } from '@/lib/api'
import { formatDate, formatDateTime, getOperationTypeLabel } from '@/lib/utils'

export default function OperationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [operations, setOperations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadOperations()
  }, [selectedStatus])

  const loadOperations = async () => {
    setLoading(true)
    try {
      const filters: any = {}
      if (selectedStatus !== 'all') {
        filters.status = selectedStatus
      }
      const data = await getOperations(filters)
      setOperations(data || [])
    } catch (error) {
      console.error('Error loading operations:', error)
      setOperations([])
    } finally {
      setLoading(false)
    }
  }

  const filteredOperations = operations.filter(op => {
    const matchesSearch = searchQuery === '' || 
      op.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.container?.lot?.culture?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const stats = {
    total: operations.length,
    inProgress: operations.filter(o => o.status === 'IN_PROGRESS').length,
    completed: operations.filter(o => o.status === 'COMPLETED').length,
    pending: operations.filter(o => o.status === 'PENDING').length,
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Операции</h1>
          <p className="text-muted-foreground">
            История операций с культурами и контейнерами
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link href="/operations/observe">
              <Eye className="mr-2 h-4 w-4" />
              Наблюдение
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/operations/passage">
              <Activity className="mr-2 h-4 w-4" />
              Пассаж
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/operations/thaw">
              <Plus className="mr-2 h-4 w-4" />
              Разморозка
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/operations/feed">
              <Clock className="mr-2 h-4 w-4" />
              Кормление
            </Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/operations/dispose">
              <Activity className="mr-2 h-4 w-4" />
              Утилизация
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего операций
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              В работе
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Завершено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ожидает
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по культуре, контейнеру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS">В работе</TabsTrigger>
            <TabsTrigger value="COMPLETED">Завершено</TabsTrigger>
            <TabsTrigger value="PENDING">Ожидает</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Operations Table */}
      <Card>
        <CardHeader>
          <CardTitle>История операций</CardTitle>
          <CardDescription>
            {loading ? 'Загрузка...' : `${filteredOperations.length} операций найдено`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Тип операции</TableHead>
                  <TableHead>Культура</TableHead>
                  <TableHead>Контейнер</TableHead>
                  <TableHead>Начато</TableHead>
                  <TableHead>Завершено</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Оператор</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOperations.map((op) => (
                  <TableRow key={op.id}>
                    <TableCell>
                      <Link href={`/operations/${op.id}`} className="font-medium hover:underline">
                        {op.id?.slice(0, 8)}...
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getOperationTypeLabel(op.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {op.container?.lot?.culture?.name || '-'}
                      <p className="text-xs text-muted-foreground">
                        {op.container?.lot?.culture?.culture_type?.code}
                      </p>
                    </TableCell>
                    <TableCell>
                      {op.container?.code || '-'}
                    </TableCell>
                    <TableCell>
                      {op.started_at ? formatDateTime(op.started_at) : '-'}
                    </TableCell>
                    <TableCell>
                      {op.completed_at ? formatDateTime(op.completed_at) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(op.status)}>
                        {getStatusLabel(op.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {op.operator?.name || '-'}
                    </TableCell>
                    <TableCell>
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
                            <Link href={`/operations/${op.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Просмотр
                            </Link>
                          </DropdownMenuItem>
                          {op.status === 'IN_PROGRESS' && (
                            <DropdownMenuItem>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Завершить
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOperations.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Операции не найдены
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
    ON_HOLD: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Ожидает',
    IN_PROGRESS: 'В работе',
    COMPLETED: 'Завершено',
    CANCELLED: 'Отменено',
    ON_HOLD: 'Приостановлено',
  }
  return labels[status] || status
}
