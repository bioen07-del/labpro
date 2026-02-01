"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getContainers } from '@/lib/api'

interface Container {
  id: string
  code: string
  container_status: string
  confluent_percent?: number
  lot?: {
    passage_number?: number
  }
  container_type?: {
    name: string
  }
  position?: {
    path: string
  }
  lot_id?: string
}

export default function ContainersPage() {
  const [containers, setContainers] = useState<Container[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  useEffect(() => {
    loadContainers()
  }, [selectedStatus])

  const loadContainers = async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: any = {}
      if (selectedStatus !== 'all') {
        filters.container_status = selectedStatus
      }
      const data = await getContainers(filters)
      setContainers(data || [])
    } catch (err) {
      console.error('Error loading containers:', err)
      setError('Не удалось загрузить контейнеры')
      setContainers([])
    } finally {
      setLoading(false)
    }
  }

  const filteredContainers = containers.filter(container => {
    const matchesSearch = searchQuery === '' || 
      container.code?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      ACTIVE: 'default',
      IN_BANK: 'secondary',
      DISPOSE: 'destructive'
    }
    const labels: Record<string, string> = {
      ACTIVE: 'В культуре',
      IN_BANK: 'В банке',
      DISPOSE: 'Утилизирован'
    }
    return <Badge variant={variants[status] || 'outline'}>
      {labels[status] || status}
    </Badge>
  }

  const stats = {
    total: containers.length,
    active: containers.filter(c => c.container_status === 'ACTIVE').length,
    inBank: containers.filter(c => c.container_status === 'IN_BANK').length,
    disposed: containers.filter(c => c.container_status === 'DISPOSE').length,
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Контейнеры</h1>
          <p className="text-muted-foreground">Управление контейнерами культур</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Создать контейнер
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
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
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              В банке
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inBank}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Утилизировано
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.disposed}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Поиск по коду..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 font-mono" 
              />
            </div>
            <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
              <TabsList>
                <TabsTrigger value="all">Все</TabsTrigger>
                <TabsTrigger value="ACTIVE">В культуре</TabsTrigger>
                <TabsTrigger value="IN_BANK">В банке</TabsTrigger>
                <TabsTrigger value="DISPOSE">Утилизировано</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">
              {error}
              <Button variant="outline" className="ml-4" onClick={loadContainers}>
                Повторить
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Код</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Лот</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Конфлюэнтность</TableHead>
                  <TableHead>Позиция</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContainers.map((container) => (
                  <TableRow key={container.id}>
                    <TableCell className="font-mono font-medium">
                      <Link href={`/containers/${container.id}`} className="hover:underline text-primary">
                        {container.code}
                      </Link>
                    </TableCell>
                    <TableCell>{container.container_type?.name || '-'}</TableCell>
                    <TableCell>
                      {container.lot_id ? (
                        <Link href={`/lots/${container.lot_id}`} className="hover:underline">
                          P{container.lot?.passage_number || '-'}
                        </Link>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(container.container_status)}</TableCell>
                    <TableCell>
                      {container.confluent_percent ? `${container.confluent_percent}%` : '—'}
                    </TableCell>
                    <TableCell>
                      {container.position?.path || '—'}
                    </TableCell>
                    <TableCell>
                      <Link href={`/containers/${container.id}`}>
                        <Button variant="ghost" size="sm">Открыть</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredContainers.length === 0 && (
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
