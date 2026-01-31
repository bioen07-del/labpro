"use client"

import { useState } from 'react'
import { 
  Package, 
  Plus, 
  Search,
  AlertTriangle,
  Clock,
  TrendingDown
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mockBatches, mockNomenclatures } from '@/lib/mock-data'
import { formatDate, daysUntilExpiration } from '@/lib/utils'

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const enrichedBatches = mockBatches.map(batch => ({
    ...batch,
    nomenclature: mockNomenclatures.find(n => n.id === batch.nomenclature_id)
  }))

  const filteredBatches = enrichedBatches.filter(batch => {
    const matchesSearch = batch.batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.nomenclature?.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || batch.nomenclature?.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Calculate stats
  const expiringCount = enrichedBatches.filter(b => {
    const days = daysUntilExpiration(b.expiration_date)
    return days !== null && days <= 30 && days > 0
  }).length

  const expiredCount = enrichedBatches.filter(b => {
    const days = daysUntilExpiration(b.expiration_date)
    return days !== null && days < 0
  }).length

  const categories = [...new Set(mockNomenclatures.map(n => n.category))]

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Склад</h1>
          <p className="text-muted-foreground">
            Управление расходными материалами и реактивами
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Приёмка
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего партий
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockBatches.length}</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Скоро истекает
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{expiringCount}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Просрочено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Активных позиций
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockBatches.filter(b => b.status === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, партии..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            {categories.map(cat => (
              <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Складские остатки</CardTitle>
          <CardDescription>
            {filteredBatches.length} партий найдено
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Материал</TableHead>
                <TableHead>Партия</TableHead>
                <TableHead>Категория</TableHead>
                <TableHead>Количество</TableHead>
                <TableHead>Срок годности</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead>Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.map((batch) => {
                const daysLeft = daysUntilExpiration(batch.expiration_date)
                return (
                  <TableRow key={batch.id}>
                    <TableCell>
                      <div className="font-medium">{batch.nomenclature?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Ед: {batch.unit}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {batch.batch_number}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{batch.nomenclature?.category}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {batch.quantity} {batch.unit}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getExpirationBadge(daysLeft)}
                        <span className="text-sm text-muted-foreground">
                          {formatDate(batch.expiration_date)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(batch.status, daysLeft)}>
                        {getStatusLabel(batch.status, daysLeft)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm">
                          Списать
                        </Button>
                        <Button variant="ghost" size="sm">
                          Переместить
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function getExpirationBadge(days: number | null) {
  if (days === null) return null
  if (days < 0) {
    return <Badge variant="destructive">Просрочено</Badge>
  }
  if (days <= 7) {
    return <Badge variant="destructive">{days} дн.</Badge>
  }
  if (days <= 30) {
    return <Badge variant="secondary">{days} дн.</Badge>
  }
  return null
}

function getStatusColor(status: string, days: number | null): string {
  if (status === 'EXPIRED' || (days !== null && days < 0)) {
    return 'bg-red-100 text-red-800'
  }
  if (days !== null && days <= 30) {
    return 'bg-yellow-100 text-yellow-800'
  }
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    DISPOSE: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getStatusLabel(status: string, days: number | null): string {
  if (status === 'EXPIRED' || (days !== null && days < 0)) {
    return 'Просрочено'
  }
  if (days !== null && days <= 30) {
    return 'Скоро истекает'
  }
  const labels: Record<string, string> = {
    ACTIVE: 'Активна',
    DISPOSE: 'Списана',
  }
  return labels[status] || status
}
