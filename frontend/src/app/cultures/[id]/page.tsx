"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { 
  ArrowLeft,
  FlaskConical,
  Beaker,
  Box,
  Archive,
  Edit,
  Plus,
  Calendar,
  User,
  FileText,
  Boxes,
  Thermometer,
  Clock,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getCultureById, getLots, getBanks } from '@/lib/api'
import { formatDate, getStatusLabel } from '@/lib/utils'
import type { Culture, Lot, Bank } from '@/types'

export default function CultureDetailPage() {
  const params = useParams()
  const cultureId = params.id as string
  
  const [culture, setCulture] = useState<Culture | null>(null)
  const [lots, setLots] = useState<Lot[]>([])
  const [banks, setBanks] = useState<Bank[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadData()
  }, [cultureId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [cultureData, lotsData, banksData] = await Promise.all([
        getCultureById(cultureId),
        getLots({ culture_id: cultureId }),
        getBanks({ status: undefined }) // Will filter client-side
      ])
      
      setCulture(cultureData)
      setLots(lotsData || [])
      
      // Filter banks for this culture
      const filteredBanks = (banksData || []).filter((b: Bank) => b.culture_id === cultureId)
      setBanks(filteredBanks)
    } catch (error) {
      console.error('Error loading culture:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <FlaskConical className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!culture) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-medium">Культура не найдена</p>
            <Link href="/cultures">
              <Button variant="outline" className="mt-4">
                Вернуться к списку
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Link href="/cultures">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{culture.name}</h1>
              <Badge className={getStatusColor(culture.status)}>
                {getStatusLabel(culture.status)}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              ID: {culture.id} • Создано {formatDate(culture.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Редактировать
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Создать лот
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Boxes className="h-4 w-4" />
              Лоты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lots.length}</div>
            <p className="text-xs text-muted-foreground">активных пассажей</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Банки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{banks.length}</div>
            <p className="text-xs text-muted-foreground">всего банков</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Тип культуры
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{culture.culture_type?.code || '-'}</div>
            <p className="text-xs text-muted-foreground truncate">
              {culture.culture_type?.name || 'Не указан'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Коэффициент
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {culture.coefficient?.toLocaleString() || '-'}
            </div>
            <p className="text-xs text-muted-foreground">клеток/см²</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="lots">Лоты ({lots.length})</TabsTrigger>
          <TabsTrigger value="banks">Банки ({banks.length})</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Основная информация</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Название</label>
                    <p className="font-medium">{culture.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Статус</label>
                    <p className="font-medium">
                      <Badge className={getStatusColor(culture.status)}>
                        {getStatusLabel(culture.status)}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Тип культуры</label>
                    <p className="font-medium">
                      {culture.culture_type?.name || '-'}
                      <span className="text-muted-foreground ml-1">
                        ({culture.culture_type?.code})
                      </span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Дата получения</label>
                    <p className="font-medium">
                      {culture.received_date ? formatDate(culture.received_date) : '-'}
                    </p>
                  </div>
                </div>
                {culture.description && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Описание</label>
                    <p className="mt-1">{culture.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Donor Info */}
            <Card>
              <CardHeader>
                <CardTitle>Донор / Источник</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {culture.donor ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Код донора</label>
                        <p className="font-medium">{culture.donor.code}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Возраст</label>
                        <p className="font-medium">{culture.donor.age || '-'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Пол</label>
                        <p className="font-medium">
                          {culture.donor.gender === 'M' ? 'Мужской' : 
                           culture.donor.gender === 'F' ? 'Женский' : '-'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Тип ткани</label>
                        <p className="font-medium">{culture.donor.tissue_type || '-'}</p>
                      </div>
                    </div>
                    {culture.donor.notes && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Примечания</label>
                        <p className="mt-1">{culture.donor.notes}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">Донор не указан</p>
                )}
              </CardContent>
            </Card>

            {/* Culture Type Info */}
            <Card>
              <CardHeader>
                <CardTitle>Характеристики типа культуры</CardTitle>
              </CardHeader>
              <CardContent>
                {culture.culture_type ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Оптимальная конфлюэнтность</label>
                      <p className="font-medium">{culture.culture_type.optimal_confluent}%</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Интервал пассажа</label>
                      <p className="font-medium">{culture.culture_type.passage_interval_days} дней</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Скорость роста</label>
                      <p className="font-medium">{culture.culture_type.growth_rate}x</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Информация о типе недоступна</p>
                )}
              </CardContent>
            </Card>

            {/* Audit Info */}
            <Card>
              <CardHeader>
                <CardTitle>Информация о записи</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Создал
                    </label>
                    <p className="font-medium">
                      {culture.created_by_user?.full_name || culture.created_by || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Создано
                    </label>
                    <p className="font-medium">{formatDate(culture.created_at)}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Обновлено
                    </label>
                    <p className="font-medium">{formatDate(culture.updated_at)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Lots Tab */}
        <TabsContent value="lots" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Лоты культуры</CardTitle>
              <CardDescription>
                Пассажированные лоты культуры {culture.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {lots.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID лота</TableHead>
                      <TableHead>Пассаж</TableHead>
                      <TableHead>Дата начала</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Контейнеры</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lots.map((lot) => (
                      <TableRow key={lot.id}>
                        <TableCell>
                          <Link href={`/lots/${lot.id}`} className="font-medium hover:underline">
                            {lot.id.slice(0, 8)}...
                          </Link>
                        </TableCell>
                        <TableCell>P{lot.passage_number}</TableCell>
                        <TableCell>{formatDate(lot.start_date)}</TableCell>
                        <TableCell>
                          <Badge className={getLotStatusColor(lot.status)}>
                            {getLotStatusLabel(lot.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {lot.containers?.length || 0}
                        </TableCell>
                        <TableCell>
                          <Link href={`/lots/${lot.id}`}>
                            <Button variant="ghost" size="sm">
                              Открыть
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Лоты не созданы
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Banks Tab */}
        <TabsContent value="banks" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Банки культуры</CardTitle>
              <CardDescription>
                Криобанки, созданные из этой культуры
              </CardDescription>
            </CardHeader>
            <CardContent>
              {banks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID банка</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Криовиалы</TableHead>
                      <TableHead>Дата заморозки</TableHead>
                      <TableHead>QC</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {banks.map((bank) => (
                      <TableRow key={bank.id}>
                        <TableCell>
                          <Link href={`/banks/${bank.id}`} className="font-medium hover:underline">
                            {bank.id.slice(0, 8)}...
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{bank.bank_type}</Badge>
                        </TableCell>
                        <TableCell>{bank.cryo_vials_count}</TableCell>
                        <TableCell>
                          {bank.freezing_date ? formatDate(bank.freezing_date) : '-'}
                        </TableCell>
                        <TableCell>
                          {bank.qc_passed ? (
                            <Badge className="bg-green-100 text-green-800">Пройден</Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-800">Ожидает</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getBankStatusColor(bank.status)}>
                            {getBankStatusLabel(bank.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link href={`/banks/${bank.id}`}>
                            <Button variant="ghost" size="sm">
                              Открыть
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Банки не созданы
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>История изменений</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                История будет доступна после интеграции с audit_logs
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
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

function getLotStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    CLOSED: 'bg-gray-100 text-gray-800',
    DISPOSE: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getLotStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    ACTIVE: 'Активен',
    CLOSED: 'Закрыт',
    DISPOSE: 'Утилизирован',
  }
  return labels[status] || status
}

function getBankStatusColor(status: string): string {
  const colors: Record<string, string> = {
    QUARANTINE: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    RESERVED: 'bg-blue-100 text-blue-800',
    ISSUED: 'bg-purple-100 text-purple-800',
    DISPOSE: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getBankStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    QUARANTINE: 'Карантин',
    APPROVED: 'Одобрен',
    RESERVED: 'Зарезервирован',
    ISSUED: 'Выдан',
    DISPOSE: 'Утилизирован',
  }
  return labels[status] || status
}
