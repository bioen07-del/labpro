"use client"

import { useState } from 'react'
import Link from 'next/link'
import { 
  Archive, 
  Plus, 
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  FileText,
  ThermometerSnowflake
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
import { mockBanks, mockCultures } from '@/lib/mock-data'
import { formatDate, getStatusLabel, getBankTypeLabel, formatCellsCount } from '@/lib/utils'

export default function BanksPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const filteredBanks = mockBanks.filter(bank => {
    const culture = mockCultures.find(c => c.id === bank.culture_id)
    const matchesSearch = bank.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      culture?.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = selectedStatus === 'all' || bank.status === selectedStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: mockBanks.length,
    quarantine: mockBanks.filter(b => b.status === 'QUARANTINE').length,
    approved: mockBanks.filter(b => b.status === 'APPROVED').length,
    reserved: mockBanks.filter(b => b.status === 'RESERVED').length,
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Клеточные банки</h1>
          <p className="text-muted-foreground">
            Мастер-клеточные банки (MCB), рабочие (WCB) и резервные (RWB)
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Создать банк
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Всего банков
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              На карантине
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.quarantine}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Одобрено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
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
            <TabsTrigger value="QUARANTINE">Карантин</TabsTrigger>
            <TabsTrigger value="APPROVED">Одобрено</TabsTrigger>
            <TabsTrigger value="RESERVED">Зарезервировано</TabsTrigger>
            <TabsTrigger value="ISSUED">Выдано</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Banks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Список банков</CardTitle>
          <CardDescription>
            {filteredBanks.length} банков найдено
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Код</TableHead>
                <TableHead>Культура</TableHead>
                <TableHead>Тип банка</TableHead>
                <TableHead>Пробирок</TableHead>
                <TableHead>Клеток/пробирка</TableHead>
                <TableHead>Всего клеток</TableHead>
                <TableHead>Дата заморозки</TableHead>
                <TableHead>QC</TableHead>
                <TableHead>Статус</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBanks.map((bank) => {
                const culture = mockCultures.find(c => c.id === bank.culture_id)
                return (
                  <TableRow key={bank.id}>
                    <TableCell>
                      <Link href={`/banks/${bank.id}`} className="font-medium hover:underline">
                        {bank.id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/cultures/${bank.culture_id}`} className="text-sm hover:underline">
                        {culture?.name || '-'}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {culture?.type?.code}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{bank.bank_type}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getBankTypeLabel(bank.bank_type)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <ThermometerSnowflake className="h-3 w-3 text-muted-foreground" />
                        {bank.cryo_vials_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatCellsCount(bank.cells_per_vial)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCellsCount(bank.total_cells)}
                    </TableCell>
                    <TableCell>
                      {bank.freezing_date ? formatDate(bank.freezing_date) : '-'}
                    </TableCell>
                    <TableCell>
                      {bank.qc_passed ? (
                        <Badge className="bg-green-100 text-green-800">Пройден</Badge>
                      ) : (
                        <Badge variant="secondary">Ожидает</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(bank.status)}>
                        {getStatusLabel(bank.status)}
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
                            <Link href={`/banks/${bank.id}`}>
                              <Eye className="mr-2 h-4 w-4" />
                              Просмотр
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileText className="mr-2 h-4 w-4" />
                            Создать паспорт
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Изменить статус
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    QUARANTINE: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    RESERVED: 'bg-blue-100 text-blue-800',
    ISSUED: 'bg-purple-100 text-purple-800',
    DISPOSE: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}
