"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Thermometer,
  Plus,
  Search,
  Filter,
  Wrench,
  AlertCircle,
  CheckCircle,
  Clock,
  Box,
  MapPin
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getEquipment } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { Equipment } from '@/types'

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    loadEquipment()
  }, [])

  const loadEquipment = async () => {
    setLoading(true)
    try {
      const data = await getEquipment({
        type: typeFilter || undefined,
        status: statusFilter || undefined
      })
      setEquipment(data || [])
    } catch (error) {
      console.error('Error loading equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredEquipment = equipment.filter(eq => 
    eq.name.toLowerCase().includes(search.toLowerCase()) ||
    eq.code.toLowerCase().includes(search.toLowerCase()) ||
    (eq.location && eq.location.toLowerCase().includes(search.toLowerCase()))
  )

  const equipmentByType = filteredEquipment.reduce((acc, eq) => {
    acc[eq.type] = (acc[eq.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const getStatusCounts = () => ({
    ACTIVE: equipment.filter(e => e.status === 'ACTIVE').length,
    MAINTENANCE: equipment.filter(e => e.status === 'MAINTENANCE').length,
    BROKEN: equipment.filter(e => e.status === 'BROKEN').length,
  })

  const statusCounts = getStatusCounts()

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Оборудование</h1>
          <p className="text-muted-foreground">
            Управление инкубаторами, холодильниками и другим оборудованием
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Добавить оборудование
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего оборудования
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{equipment.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              В работе
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statusCounts.ACTIVE}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wrench className="h-4 w-4 text-yellow-500" />
              Обслуживание
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{statusCounts.MAINTENANCE}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              Неисправно
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{statusCounts.BROKEN}</div>
          </CardContent>
        </Card>
      </div>

      {/* Equipment by Type */}
      {Object.keys(equipmentByType).length > 0 && (
        <div className="grid gap-4 md:grid-cols-5">
          {Object.entries(equipmentByType).map(([type, count]) => (
            <Card key={type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {getEquipmentTypeLabel(type)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию, коду или расположению..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 border rounded-md"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">Все типы</option>
          <option value="INCUBATOR">Инкубаторы</option>
          <option value="FRIDGE">Холодильники</option>
          <option value="FREEZER">Морозильники</option>
          <option value="CABINET">Шкафы</option>
          <option value="RACK">Стеллажи</option>
        </select>
        <select
          className="px-3 py-2 border rounded-md"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Все статусы</option>
          <option value="ACTIVE">В работе</option>
          <option value="MAINTENANCE">Обслуживание</option>
          <option value="BROKEN">Неисправно</option>
        </select>
      </div>

      {/* Equipment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список оборудования</CardTitle>
          <CardDescription>
            {filteredEquipment.length} единиц оборудования
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Thermometer className="h-8 w-8 animate-pulse text-muted-foreground" />
            </div>
          ) : filteredEquipment.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Код</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Расположение</TableHead>
                  <TableHead>Температура</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Позиций</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipment.map((eq) => (
                  <TableRow key={eq.id}>
                    <TableCell className="font-mono">{eq.code}</TableCell>
                    <TableCell>
                      <Link href={`/equipment/${eq.id}`} className="font-medium hover:underline">
                        {eq.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getEquipmentTypeLabel(eq.type)}
                      </Badge>
                    </TableCell>
                    <TableCell>{eq.location || '-'}</TableCell>
                    <TableCell>
                      {eq.temperature ? (
                        <span className="flex items-center gap-1">
                          <Thermometer className="h-3 w-3" />
                          {eq.temperature > 0 ? '+' : ''}{eq.temperature}°C
                        </span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(eq.status)}>
                        {getStatusLabel(eq.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Box className="h-3 w-3" />
                        {eq.positions?.length || 0}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Оборудование не найдено
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function getEquipmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    INCUBATOR: 'Инкубаторы',
    FRIDGE: 'Холодильники',
    FREEZER: 'Морозильники',
    CABINET: 'Шкафы',
    RACK: 'Стеллажи',
  }
  return labels[type] || type
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    MAINTENANCE: 'bg-yellow-100 text-yellow-800',
    BROKEN: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'В работе',
    MAINTENANCE: 'Обслуживание',
    BROKEN: 'Неисправно',
  }
  return labels[status] || status
}
