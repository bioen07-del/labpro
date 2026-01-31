"use client"

import { useState } from 'react'
import { 
  FlaskConical, 
  Plus, 
  Search,
  Play,
  CheckCircle,
  Clock,
  ClipboardList
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mockLots, mockContainers, mockCultures } from '@/lib/mock-data'
import { formatDate, getOperationTypeLabel, getStatusLabel } from '@/lib/utils'

export default function OperationsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  // Create mock operations from containers
  const mockOperations = mockContainers.map((container, index) => ({
    id: `op-${index + 1}`,
    container_code: container.code,
    culture: mockCultures.find(c => c.id === container.lot_id)?.name || '-',
    operation_type: index % 2 === 0 ? 'FEED' : 'PASSAGE' as const,
    status: index % 3 === 0 ? 'COMPLETED' : 'IN_PROGRESS' as const,
    started_at: new Date(Date.now() - index * 86400000).toISOString(),
    completed_at: index % 3 === 0 ? new Date(Date.now() - index * 43200000).toISOString() : undefined,
  }))

  const filteredOperations = mockOperations.filter(op => {
    const matchesSearch = op.container_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      op.culture.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === 'all' || op.operation_type === selectedType
    return matchesSearch && matchesType
  })

  const stats = {
    total: mockOperations.length,
    inProgress: mockOperations.filter(o => o.status === 'IN_PROGRESS').length,
    completed: mockOperations.filter(o => o.status === 'COMPLETED').length,
    containers: mockContainers.length,
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Операции</h1>
          <p className="text-muted-foreground">
            Журнал операций с культурами: кормление, пассирование, заморозка, размораживание
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Новая операция
        </Button>
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
            <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
              <Play className="h-4 w-4" />
              В процессе
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
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
              Активных контейнеров
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.containers}</div>
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
        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="FEED">Кормление</TabsTrigger>
            <TabsTrigger value="PASSAGE">Пассирование</TabsTrigger>
            <TabsTrigger value="FREEZE">Заморозка</TabsTrigger>
            <TabsTrigger value="THAW">Размораживание</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Operations List */}
      <Card>
        <CardHeader>
          <CardTitle>Журнал операций</CardTitle>
          <CardDescription>
            {filteredOperations.length} операций найдено
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredOperations.map((op) => (
              <div
                key={op.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  op.status === 'COMPLETED' ? 'bg-gray-50' : 'bg-blue-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    op.status === 'COMPLETED' ? 'bg-gray-200' : 'bg-blue-200'
                  }`}>
                    <FlaskConical className={`h-5 w-5 ${
                      op.status === 'COMPLETED' ? 'text-gray-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-medium bg-white px-2 py-1 rounded border">
                        {op.container_code}
                      </code>
                      <Badge variant="outline">{op.culture}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getOperationTypeLabel(op.operation_type)}
                      <span className="mx-2">•</span>
                      {formatDate(op.started_at)}
                      {op.completed_at && (
                        <>
                          <span className="mx-2">→</span>
                          {formatDate(op.completed_at)}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(op.status)}>
                    {op.status === 'COMPLETED' ? 'Завершено' : 'В процессе'}
                  </Badge>
                  {op.status === 'IN_PROGRESS' && (
                    <Button variant="outline" size="sm">
                      Завершить
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
