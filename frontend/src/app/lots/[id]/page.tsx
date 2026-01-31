"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { 
  ArrowLeft,
  FlaskConical,
  Box,
  Layers,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  FileText,
  Edit,
  Plus,
  Beaker
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getLotById, getContainers, getOperations } from '@/lib/api'
import { formatDate, getStatusLabel } from '@/lib/utils'
import type { Lot, Container, Operation } from '@/types'

export default function LotDetailPage() {
  const params = useParams()
  const lotId = params.id as string
  
  const [lot, setLot] = useState<Lot | null>(null)
  const [containers, setContainers] = useState<Container[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadData()
  }, [lotId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [lotData, containersData, operationsData] = await Promise.all([
        getLotById(lotId),
        getContainers({}),
        getOperations({})
      ])
      
      setLot(lotData)
      
      // Filter containers for this lot
      const filteredContainers = (containersData || []).filter((c: Container) => c.lot_id === lotId)
      setContainers(filteredContainers)
      
      // Filter operations for this lot
      const filteredOperations = (operationsData || []).filter((o: Operation) => o.lot_id === lotId)
      setOperations(filteredOperations)
    } catch (error) {
      console.error('Error loading lot:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Layers className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!lot) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-medium">Лот не найден</p>
            <Link href="/cultures">
              <Button variant="outline" className="mt-4">
                Вернуться к культурам
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Link href={`/cultures/${lot.culture_id}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {lot.culture?.name || 'Лот'}
              </h1>
              <Badge className="bg-blue-100 text-blue-800">
                P{lot.passage_number}
              </Badge>
              <Badge className={getLotStatusColor(lot.status)}>
                {getLotStatusLabel(lot.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              ID лота: {lot.id} • Создан {formatDate(lot.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Редактировать
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Добавить контейнер
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Box className="h-4 w-4" />
              Контейнеры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{containers.length}</div>
            <p className="text-xs text-muted-foreground">в работе</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Культура
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {lot.culture?.name || '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lot.culture?.culture_type?.code || 'Не указана'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Дата начала
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDate(lot.start_date)}</div>
            <p className="text-xs text-muted-foreground">
              {lot.end_date ? `до ${formatDate(lot.end_date)}` : 'В работе'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Beaker className="h-4 w-4" />
              Операции
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operations.length}</div>
            <p className="text-xs text-muted-foreground">выполнено</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="containers">Контейнеры ({containers.length})</TabsTrigger>
          <TabsTrigger value="operations">Операции ({operations.length})</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Информация о лоте</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Лот ID</label>
                    <p className="font-medium">{lot.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Пассаж</label>
                    <p className="font-medium">P{lot.passage_number}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Статус</label>
                    <p className="font-medium">
                      <Badge className={getLotStatusColor(lot.status)}>
                        {getLotStatusLabel(lot.status)}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Дата начала</label>
                    <p className="font-medium">{formatDate(lot.start_date)}</p>
                  </div>
                  {lot.parent_lot_id && (
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Родительский лот</label>
                      <p className="font-medium">
                        <Link href={`/lots/${lot.parent_lot_id}`} className="text-blue-600 hover:underline">
                          {lot.parent_lot_id.slice(0, 8)}...
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
                {lot.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Примечания</label>
                    <p className="mt-1">{lot.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Culture Info */}
            <Card>
              <CardHeader>
                <CardTitle>Культура</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lot.culture ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Название</label>
                        <p className="font-medium">{lot.culture.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Тип</label>
                        <p className="font-medium">
                          {lot.culture.culture_type?.name || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Коэффициент</label>
                        <p className="font-medium">
                          {lot.culture.coefficient?.toLocaleString() || '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Статус</label>
                        <p className="font-medium">
                          <Badge className={getCultureStatusColor(lot.culture.status)}>
                            {getStatusLabel(lot.culture.status)}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <Link href={`/cultures/${lot.culture.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Открыть культуру
                      </Button>
                    </Link>
                  </>
                ) : (
                  <p className="text-muted-foreground">Информация о культуре недоступна</p>
                )}
              </CardContent>
            </Card>

            {/* Parent Container Info */}
            {lot.source_container_id && (
              <Card>
                <CardHeader>
                  <CardTitle>Исходный контейнер</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{lot.source_container_id}</p>
                      <p className="text-sm text-muted-foreground">ID контейнера</p>
                    </div>
                    <Link href={`/containers/${lot.source_container_id}`}>
                      <Button variant="outline" size="sm">
                        Открыть
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Audit Info */}
            <Card>
              <CardHeader>
                <CardTitle>Информация о записи</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Создал
                    </label>
                    <p className="font-medium">
                      {lot.culture?.created_by_user?.full_name || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Создано
                    </label>
                    <p className="font-medium">{formatDate(lot.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Containers Tab */}
        <TabsContent value="containers" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Контейнеры лота</CardTitle>
              <CardDescription>
                Контейнеры, принадлежащие этому лоту
              </CardDescription>
            </CardHeader>
            <CardContent>
              {containers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Код</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Позиция</TableHead>
                      <TableHead>Конфлюэнтность</TableHead>
                      <TableHead>Морфология</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {containers.map((container) => (
                      <TableRow key={container.id}>
                        <TableCell>
                          <Link href={`/containers/${container.id}`} className="font-medium hover:underline">
                            {container.code}
                          </Link>
                        </TableCell>
                        <TableCell>{container.type?.name || '-'}</TableCell>
                        <TableCell>
                          {container.position?.path || '-'}
                        </TableCell>
                        <TableCell>
                          {container.confluent_percent ? `${container.confluent_percent}%` : '-'}
                        </TableCell>
                        <TableCell>{container.morphology || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getContainerStatusColor(container.status)}>
                            {getContainerStatusLabel(container.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/containers/${container.id}`}>
                            <Button variant="ghost" size="sm">
                              Открыть
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Контейнеры не добавлены
                  <div className="mt-4">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Добавить контейнер
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>История операций</CardTitle>
              <CardDescription>
                Все операции, выполненные с этим лотом
              </CardDescription>
            </CardHeader>
            <CardContent>
              {operations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID операции</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Дата начала</TableHead>
                      <TableHead>Дата завершения</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operations.map((operation) => (
                      <TableRow key={operation.id}>
                        <TableCell className="font-mono text-sm">
                          {operation.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getOperationTypeLabel(operation.operation_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(operation.started_at)}</TableCell>
                        <TableCell>
                          {operation.completed_at ? formatDate(operation.completed_at) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getOperationStatusColor(operation.status)}>
                            {getOperationStatusLabel(operation.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            Подробнее
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Операции не проводились
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>История изменений</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                История будет доступна после интеграции с audit_logs
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function getLotStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    DISPOSE: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getLotStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'Активен',
    CLOSED: 'Закрыт',
    DISPOSE: 'Утилизирован',
  }
  return labels[status] || status
}

function getCultureStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    ARCHIVED: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getContainerStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    IN_BANK: 'bg-blue-100 text-blue-800',
    DISPOSE: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getContainerStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'В работе',
    IN_BANK: 'В банке',
    DISPOSE: 'Утилизирован',
  }
  return labels[status] || status
}

function getOperationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    FEED: 'Кормление',
    PASSAGE: 'Пассаж',
    FREEZE: 'Заморозка',
    THAW: 'Разморозка',
    OBSERVE: 'Осмотр',
    DISPOSE: 'Утилизация',
    QCREG: 'QC регистрация',
  }
  return labels[type] || type
}

function getOperationStatusColor(status: string): string {
  const colors: Record<string, string> = {
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getOperationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    IN_PROGRESS: 'В процессе',
    COMPLETED: 'Завершена',
  }
  return labels[status] || status
}
