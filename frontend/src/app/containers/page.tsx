"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Package, 
  Search, 
  Plus,
  MoreHorizontal,
  Eye,
  Edit,
  ThermometerSnowflake,
  Loader2,
  QrCode
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
import { getContainers, getContainersByLot } from '@/lib/api'
import { formatDate, getStatusLabel } from '@/lib/utils'

export default function ContainersPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [containers, setContainers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadContainers()
  }, [selectedStatus])

  const loadContainers = async () => {
    setLoading(true)
    try {
      const filters: any = {}
      if (selectedStatus !== 'all') {
        filters.status = selectedStatus
      }
      const data = await getContainers(filters)
      setContainers(data || [])
    } catch (error) {
      console.error('Error loading containers:', error)
      setContainers([])
    } finally {
      setLoading(false)
    }
  }

  const filteredContainers = containers.filter(container => {
    const matchesSearch = searchQuery === '' || 
      container.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      container.lot?.culture?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const stats = {
    total: containers.length,
    inCulture: containers.filter(c => c.status === 'IN_CULTURE').length,
    frozen: containers.filter(c => c.status === 'FROZEN').length,
    thaw: containers.filter(c => c.status === 'THAWED').length,
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Контейнеры</h1>
          <p className="text-muted-foreground">
            Управление контейнерами с клеточными культурами
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Добавить контейнер
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего контейнеров
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              В культуре
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.inCulture}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Заморожено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.frozen}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Разморожено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.thaw}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по коду, культуре..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="IN_CULTURE">В культуре</TabsTrigger>
            <TabsTrigger value="FROZEN">Заморожено</TabsTrigger>
            <TabsTrigger value="THAWED">Разморожено</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Containers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список контейнеров</CardTitle>
          <CardDescription>
            {loading ? 'Загрузка...' : `${filteredContainers.length} контейнеров найдено`}
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
                  <TableHead>Код</TableHead>
                  <TableHead>Культура</TableHead>
                  <TableHead>Лот</TableHead>
                  <TableHead>Позиция</TableHead>
                  <TableHead>Дата создания</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContainers.map((container) => (
                  <TableRow key={container.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{container.code}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/cultures/${container.lot?.culture_id}`} className="text-sm hover:underline">
                        {container.lot?.culture?.name || '-'}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {container.lot?.culture?.culture_type?.code}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Link href={`/lots/${container.lot_id}`} className="text-sm hover:underline">
                        {container.lot_id?.slice(0, 8)}...
                      </Link>
                    </TableCell>
                    <TableCell>
                      {container.position ? (
                        <div className="flex items-center gap-1">
                          <QrCode className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{container.position.path}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDate(container.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getContainerStatusColor(container.status)}>
                        {getStatusLabel(container.status)}
                      </Badge>
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
                            <Link href={`/containers/${container.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Просмотр
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Изменить статус
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <ThermometerSnowflake className="mr-2 h-4 w-4" />
                            Переместить
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredContainers.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Контейнеры не найдены
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

function getContainerStatusColor(status: string): string {
  const colors: Record<string, string> = {
    IN_CULTURE: 'bg-green-100 text-green-800',
    FROZEN: 'bg-blue-100 text-blue-800',
    THAWED: 'bg-orange-100 text-orange-800',
    DISPOSE: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
