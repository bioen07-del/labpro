"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Beaker, 
  Plus, 
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Archive,
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
import { getCultures } from '@/lib/api'
import { formatDate, getStatusLabel } from '@/lib/utils'

export default function CulturesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [cultures, setCultures] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCultures()
  }, [selectedStatus])

  const loadCultures = async () => {
    setLoading(true)
    try {
      const filters: any = {}
      if (selectedStatus !== 'all') {
        filters.status = selectedStatus
      }
      const data = await getCultures(filters)
      setCultures(data || [])
    } catch (error) {
      console.error('Error loading cultures:', error)
      setCultures([])
    } finally {
      setLoading(false)
    }
  }

  const filteredCultures = cultures.filter(culture => {
    const matchesSearch = searchQuery === '' || 
      culture.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      culture.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      culture.culture_type?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const stats = {
    total: cultures.length,
    active: cultures.filter(c => c.status === 'ACTIVE').length,
    archived: cultures.filter(c => c.status === 'ARCHIVED').length,
    dispose: cultures.filter(c => c.status === 'DISPOSE').length,
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Клеточные культуры</h1>
          <p className="text-muted-foreground">
            Первичные и пассажированные культуры клеток
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Создать культуру
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего культур
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Активных
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              В архиве
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{stats.archived}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Утилизировано
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.dispose}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по культуре, типу..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="ACTIVE">Активные</TabsTrigger>
            <TabsTrigger value="ARCHIVED">Архив</TabsTrigger>
            <TabsTrigger value="DISPOSE">Утилизировано</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Cultures Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список культур</CardTitle>
          <CardDescription>
            {loading ? 'Загрузка...' : `${filteredCultures.length} культур найдено`}
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
                  <TableHead>Название</TableHead>
                  <TableHead>Тип культуры</TableHead>
                  <TableHead>Пассаж</TableHead>
                  <TableHead>Источник</TableHead>
                  <TableHead>Дата получения</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCultures.map((culture) => (
                  <TableRow key={culture.id}>
                    <TableCell>
                      <Link href={`/cultures/${culture.id}`} className="font-medium hover:underline">
                        {culture.id?.slice(0, 8)}...
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/cultures/${culture.id}`} className="font-medium hover:underline">
                        {culture.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {culture.culture_type?.name || '-'}
                      <p className="text-xs text-muted-foreground">
                        {culture.culture_type?.code}
                      </p>
                    </TableCell>
                    <TableCell>
                      P{culture.passage_number || 0}
                    </TableCell>
                    <TableCell>
                      {culture.donor?.code || culture.source || '-'}
                    </TableCell>
                    <TableCell>
                      {culture.received_date ? formatDate(culture.received_date) : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(culture.status)}>
                        {getStatusLabel(culture.status)}
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
                            <Link href={`/cultures/${culture.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Просмотр
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Редактировать
                          </DropdownMenuItem>
                          {culture.status === 'ACTIVE' && (
                            <DropdownMenuItem>
                              <Archive className="mr-2 h-4 w-4" />
                              В архив
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredCultures.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Культуры не найдены
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
    ACTIVE: 'bg-green-100 text-green-800',
    ARCHIVED: 'bg-gray-100 text-gray-800',
    DISPOSE: 'bg-red-100 text-red-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    QUARANTINE: 'bg-yellow-100 text-yellow-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
