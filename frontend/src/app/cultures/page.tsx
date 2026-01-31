"use client"

import { useState } from 'react'
import Link from 'next/link'
import { 
  FlaskConical, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Archive
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mockCultures, mockCultureTypes } from '@/lib/mock-data'
import { formatDate, getStatusLabel } from '@/lib/utils'
import type { Culture } from '@/types'

export default function CulturesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  const filteredCultures = mockCultures.filter(culture => {
    const matchesSearch = culture.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      culture.type?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      culture.donor?.code.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = selectedType === 'all' || culture.type_id === selectedType
    return matchesSearch && matchesType
  })

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Клеточные культуры</h1>
          <p className="text-muted-foreground">
            Управление клеточными линиями и первичными культурами
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Новая культура
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, типу, донору..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={selectedType} onValueChange={setSelectedType}>
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            {mockCultureTypes.map(type => (
              <TabsTrigger key={type.id} value={type.id}>
                {type.code}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего культур
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockCultures.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Активных
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {mockCultures.filter(c => c.status === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              В архиве
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-400">
              {mockCultures.filter(c => c.status === 'ARCHIVED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cultures Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список культур</CardTitle>
          <CardDescription>
            {filteredCultures.length} культур найдено
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Название</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Донор</TableHead>
                <TableHead>Пассажи</TableHead>
                <TableHead>Банки</TableHead>
                <TableHead>Коэффициент</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCultures.map((culture) => (
                <TableRow key={culture.id}>
                  <TableCell>
                    <Link href={`/cultures/${culture.id}`} className="font-medium hover:underline">
                      {culture.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(culture.created_at)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{culture.type?.code}</Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {culture.type?.name}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Link href={`/donors/${culture.donor_id}`} className="text-sm hover:underline">
                      {culture.donor?.code}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {culture.donor?.gender} / {culture.donor?.age} лет
                    </p>
                  </TableCell>
                  <TableCell>
                    {culture.lots?.length || 0} пассажей
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {culture.banks?.length || 0} банков
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {culture.coefficient ? (
                      <span className="font-mono">{culture.coefficient.toLocaleString()}</span>
                    ) : (
                      '-'
                    )}
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
                        <DropdownMenuItem>
                          <FlaskConical className="mr-2 h-4 w-4" />
                          Добавить пассаж
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Archive className="mr-2 h-4 w-4" />
                          В архив
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
