"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Package, 
  Plus, 
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  AlertTriangle,
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
import { getBatches } from '@/lib/api'
import { formatDate, formatNumber, daysUntilExpiration, getExpirationWarningLevel } from '@/lib/utils'

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [batches, setBatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBatches()
  }, [selectedStatus])

  const loadBatches = async () => {
    setLoading(true)
    try {
      const filters: any = {}
      if (selectedStatus !== 'all') {
        filters.status = selectedStatus
      }
      const data = await getBatches(filters)
      setBatches(data || [])
    } catch (error) {
      console.error('Error loading batches:', error)
      setBatches([])
    } finally {
      setLoading(false)
    }
  }

  const filteredBatches = batches.filter(batch => {
    const matchesSearch = searchQuery === '' || 
      batch.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.nomenclature?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.nomenclature?.catalog_number?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const stats = {
    total: batches.length,
    available: batches.filter(b => b.status === 'AVAILABLE').length,
    reserved: batches.filter(b => b.status === 'RESERVED').length,
    expired: batches.filter(b => b.status === 'EXPIRED').length,
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Инвентарь</h1>
          <p className="text-muted-foreground">
            Реагенты, расходные материалы и номенклатура
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Добавить партию
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего позиций
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              В наличии
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Зарезервировано
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.reserved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Просрочено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по номенклатуре, каталожному номеру..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={selectedStatus} onValueChange={setSelectedStatus}>
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="AVAILABLE">В наличии</TabsTrigger>
            <TabsTrigger value="RESERVED">Зарезервировано</TabsTrigger>
            <TabsTrigger value="EXPIRED">Просрочено</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Складской учёт</CardTitle>
          <CardDescription>
            {loading ? 'Загрузка...' : `${filteredBatches.length} позиций найдено`}
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
                  <TableHead>Партия</TableHead>
                  <TableHead>Номенклатура</TableHead>
                  <TableHead>Кат. номер</TableHead>
                  <TableHead>Количество</TableHead>
                  <TableHead>Единица</TableHead>
                  <TableHead>Срок годности</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.map((batch) => {
                  const daysLeft = daysUntilExpiration(batch.expiration_date)
                  const warningLevel = getExpirationWarningLevel(daysLeft)
                  
                  return (
                    <TableRow key={batch.id}>
                      <TableCell>
                        <Link href={`/inventory/${batch.id}`} className="font-medium hover:underline">
                          {batch.id?.slice(0, 8)}...
                        </Link>
                      </TableCell>
                      <TableCell>
                        {batch.nomenclature?.name || '-'}
                        <p className="text-xs text-muted-foreground">
                          {batch.nomenclature?.category}
                        </p>
                      </TableCell>
                      <TableCell>
                        {batch.nomenclature?.catalog_number || '-'}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatNumber(batch.quantity)}
                      </TableCell>
                      <TableCell>
                        {batch.unit || 'шт'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {warningLevel === 'critical' && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                          <span className={
                            warningLevel === 'critical' ? 'text-red-600 font-medium' :
                            warningLevel === 'warning' ? 'text-yellow-600' : ''
                          }>
                            {batch.expiration_date ? formatDate(batch.expiration_date) : '-'}
                          </span>
                          {daysLeft !== null && daysLeft > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {daysLeft} дн
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(batch.status)}>
                          {getStatusLabel(batch.status)}
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
                              <Link href={`/inventory/${batch.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Просмотр
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Редактировать
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {filteredBatches.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Позиции не найдены
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
    AVAILABLE: 'bg-green-100 text-green-800',
    RESERVED: 'bg-blue-100 text-blue-800',
    EXPIRED: 'bg-red-100 text-red-800',
    USED: 'bg-gray-100 text-gray-800',
    QUARANTINE: 'bg-yellow-100 text-yellow-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    AVAILABLE: 'В наличии',
    RESERVED: 'Зарезервировано',
    EXPIRED: 'Просрочено',
    USED: 'Использовано',
    QUARANTINE: 'Карантин',
  }
  return labels[status] || status
}
