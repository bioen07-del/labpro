"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { 
  ArrowLeft,
  Box,
  Layers,
  Thermometer,
  MapPin,
  AlertTriangle,
  Edit,
  Beaker,
  History,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle
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
import { getContainerById, getOperations } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { Container, Operation } from '@/types'

export default function ContainerDetailPage() {
  const params = useParams()
  const containerId = params.id as string
  
  const [container, setContainer] = useState<Container | null>(null)
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadData()
  }, [containerId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [containerData, operationsData] = await Promise.all([
        getContainerById(containerId),
        getOperations({})
      ])
      
      setContainer(containerData)
      
      // Filter operations for this container
      const filteredOperations = (operationsData || []).filter((o: Operation) => 
        o.containers?.some(oc => oc.container_id === containerId)
      )
      setOperations(filteredOperations)
    } catch (error) {
      console.error('Error loading container:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Box className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!container) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-medium">Контейнер не найден</p>
            <Link href="/containers">
              <Button variant="outline" className="mt-4">
                Вернуться к списку
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
          <Link href="/containers">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight font-mono">{container.code}</h1>
              <Badge className={getContainerStatusColor(container.status)}>
                {getContainerStatusLabel(container.status)}
              </Badge>
              {container.contaminated && (
                <Badge className="bg-red-100 text-red-800">
                  КОНТАМИНАЦИЯ
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              ID: {container.id} • Создан {formatDate(container.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Редактировать
          </Button>
          <Button>
            <Beaker className="mr-2 h-4 w-4" />
            Операция
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Box className="h-4 w-4" />
              Тип
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{container.type?.name || '-'}</div>
            <p className="text-xs text-muted-foreground">
              {container.type?.surface_area_cm2 ? `${container.type.surface_area_cm2} см²` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Конфлюэнтность
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {container.confluent_percent ? `${container.confluent_percent}%` : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {container.type?.optimal_confluent ? `оптимально: ${container.type.optimal_confluent}%` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Лот
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              P{container.lot?.passage_number || '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {container.lot?.culture?.name || 'Не указан'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Позиция
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate max-w-[150px]">
              {container.position?.path || '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {container.placed_at ? `с ${formatDate(container.placed_at)}` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <History className="h-4 w-4" />
              Операций
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{operations.length}</div>
            <p className="text-xs text-muted-foreground">всего</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="operations">История операций ({operations.length})</TabsTrigger>
          <TabsTrigger value="position">Позиция</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Container Info */}
            <Card>
              <CardHeader>
                <CardTitle>Информация о контейнере</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Код</label>
                    <p className="font-mono font-medium">{container.code}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Статус</label>
                    <p className="font-medium">
                      <Badge className={getContainerStatusColor(container.status)}>
                        {getContainerStatusLabel(container.status)}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Тип</label>
                    <p className="font-medium">{container.type?.name || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Площадь</label>
                    <p className="font-medium">
                      {container.type?.surface_area_cm2 ? `${container.type.surface_area_cm2} см²` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Конфлюэнтность</label>
                    <p className="font-medium">
                      {container.confluent_percent ? `${container.confluent_percent}%` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Морфология</label>
                    <p className="font-medium">{container.morphology || '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Контаминация</label>
                    <p className="font-medium">
                      {container.contaminated ? (
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          Да
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Нет
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Создан</label>
                    <p className="font-medium">{formatDate(container.created_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lot Info */}
            <Card>
              <CardHeader>
                <CardTitle>Лот</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {container.lot ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Лот ID</label>
                        <p className="font-mono text-sm">{container.lot.id}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Пассаж</label>
                        <p className="font-medium">P{container.lot.passage_number}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Культура</label>
                        <p className="font-medium">{container.lot.culture?.name || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Статус лота</label>
                        <p className="font-medium">
                          <Badge className={getLotStatusColor(container.lot.status)}>
                            {getLotStatusLabel(container.lot.status)}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <Link href={`/lots/${container.lot.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Открыть лот
                      </Button>
                    </Link>
                  </>
                ) : (
                  <p className="text-muted-foreground">Информация о лоте недоступна</p>
                )}
              </CardContent>
            </Card>

            {/* Position Info */}
            <Card>
              <CardHeader>
                <CardTitle>Расположение</CardTitle>
              </CardHeader>
              <CardContent>
                {container.position ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 border rounded-lg">
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{container.position.path}</p>
                        <p className="text-sm text-muted-foreground">
                          QR: {container.position.qr_code || container.position.code}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="text-muted-foreground">Оборудование</label>
                        <p className="font-medium">{container.position.equipment?.name || '-'}</p>
                      </div>
                      <div>
                        <label className="text-muted-foreground">Емкость</label>
                        <p className="font-medium">{container.position.capacity}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Позиция не назначена</p>
                    <Button variant="outline" className="mt-4">
                      Назначить позицию
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Parent Container */}
            {container.parent_container_id && (
              <Card>
                <CardHeader>
                  <CardTitle>Родительский контейнер</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-mono font-medium">{container.parent_container_id}</p>
                      <p className="text-sm text-muted-foreground">Источник для пассажа</p>
                    </div>
                    <Link href={`/containers/${container.parent_container_id}`}>
                      <Button variant="outline" size="sm">
                        Открыть
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>История операций</CardTitle>
              <CardDescription>
                Все операции с этим контейнером
              </CardDescription>
            </CardHeader>
            <CardContent>
              {operations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID операции</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Конфлюэнтность</TableHead>
                      <TableHead>Морфология</TableHead>
                      <TableHead>Контаминация</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operations.map((operation) => {
                      const opContainer = operation.containers?.find(oc => oc.container_id === containerId)
                      return (
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
                            {opContainer?.confluent_percent ? `${opContainer.confluent_percent}%` : '-'}
                          </TableCell>
                          <TableCell>{opContainer?.morphology || '-'}</TableCell>
                          <TableCell>
                            {opContainer?.contaminated ? (
                              <Badge className="bg-red-100 text-red-800">Да</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">Нет</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={getOperationStatusColor(operation.status)}>
                              {getOperationStatusLabel(operation.status)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Операций с этим контейнером не проводилось
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Position Tab */}
        <TabsContent value="position" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Управление позицией</CardTitle>
            </CardHeader>
            <CardContent>
              {container.position ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-4">
                      <MapPin className="h-10 w-10 text-primary" />
                      <div>
                        <p className="text-xl font-bold">{container.position.path}</p>
                        <p className="text-sm text-muted-foreground">
                          Код позиции: {container.position.code}
                          {container.position.qr_code && ` • QR: ${container.position.qr_code}`}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline">
                      Сменить позицию
                    </Button>
                  </div>
                  
                  {container.position.equipment && (
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Оборудование</label>
                        <p className="font-medium">{container.position.equipment.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Тип</label>
                        <p className="font-medium">
                          {getEquipmentTypeLabel(container.position.equipment.type)}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Температура</label>
                        <p className="font-medium">
                          {container.position.equipment.temperature 
                            ? `${container.position.equipment.temperature}°C` 
                            : '-'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Позиция не назначена</h3>
                  <p className="text-muted-foreground mb-4">
                    Назначьте позицию для этого контейнера, чтобы отслеживать его расположение
                  </p>
                  <Button>
                    <MapPin className="mr-2 h-4 w-4" />
                    Назначить позицию
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
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

function getEquipmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    INCUBATOR: 'Инкубатор',
    FRIDGE: 'Холодильник',
    FREEZER: 'Морозильник',
    CABINET: 'Шкаф',
    RACK: 'Стеллаж',
  }
  return labels[type] || type
}
