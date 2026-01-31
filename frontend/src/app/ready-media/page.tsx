"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  FlaskConical,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getReadyMedia } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { ReadyMedium } from '@/types'

export default function ReadyMediaPage() {
  const [readyMedia, setReadyMedia] = useState<ReadyMedium[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    loadReadyMedia()
  }, [])

  const loadReadyMedia = async () => {
    setLoading(true)
    try {
      const data = await getReadyMedia({
        status: statusFilter || undefined
      })
      setReadyMedia(data || [])
    } catch (error) {
      console.error('Error loading ready media:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredMedia = readyMedia.filter(rm => 
    rm.name.toLowerCase().includes(search.toLowerCase()) ||
    rm.code.toLowerCase().includes(search.toLowerCase())
  )

  const statusCounts = {
    QUARANTINE: readyMedia.filter(rm => rm.status === 'QUARANTINE').length,
    ACTIVE: readyMedia.filter(rm => rm.status === 'ACTIVE').length,
    EXPIRED: readyMedia.filter(rm => rm.status === 'EXPIRED').length,
    DISPOSE: readyMedia.filter(rm => rm.status === 'DISPOSE').length,
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Готовые среды</h1>
          <p className="text-muted-foreground">
            Управление готовыми культуральными средами
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Приготовить среду
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего сред
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{readyMedia.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              Карантин
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.QUARANTINE}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Готовы к использованию
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statusCounts.ACTIVE}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Просрочено/Утилизировано
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statusCounts.EXPIRED + statusCounts.DISPOSE}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или коду..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border rounded-md"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Все статусы</option>
          <option value="QUARANTINE">Карантин</option>
          <option value="ACTIVE">Готовы</option>
          <option value="EXPIRED">Просрочено</option>
          <option value="DISPOSE">Утилизированы</option>
        </select>
      </div>

      {/* Media Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список готовых сред</CardTitle>
          <CardDescription>
            {filteredMedia.length} записей
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <FlaskConical className="h-8 w-8 animate-pulse text-muted-foreground" />
            </div>
          ) : filteredMedia.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Код</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Объем</TableHead>
                  <TableHead>Стерилизация</TableHead>
                  <TableHead>Годен до</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Создано</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedia.map((rm) => (
                  <TableRow key={rm.id}>
                    <TableCell className="font-mono">{rm.code}</TableCell>
                    <TableCell>
                      <Link href={`/ready-media/${rm.id}`} className="font-medium hover:underline">
                        {rm.name}
                      </Link>
                    </TableCell>
                    <TableCell>{rm.volume_ml} мл</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getSterilizationLabel(rm.sterilization_method)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={isExpired(rm.expiration_date) ? 'text-red-500' : ''}>
                        {formatDate(rm.expiration_date)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(rm.status)}>
                        {getStatusLabel(rm.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(rm.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Готовые среды не найдены
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    QUARANTINE: 'bg-yellow-100 text-yellow-800',
    ACTIVE: 'bg-green-100 text-green-800',
    EXPIRED: 'bg-red-100 text-red-800',
    DISPOSE: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    QUARANTINE: 'Карантин',
    ACTIVE: 'Готов',
    EXPIRED: 'Просрочен',
    DISPOSE: 'Утилизирован',
  }
  return labels[status] || status
}

function getSterilizationLabel(method: string): string {
  const labels: Record<string, string> = {
    FILTRATION: 'Фильтрация',
    AUTOCLAVE: 'Автоклавирование',
  }
  return labels[method] || method
}

function isExpired(expirationDate: string): boolean {
  return new Date(expirationDate) < new Date()
}
