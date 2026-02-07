"use client"

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  FlaskConical,
  AlertTriangle,
  Calendar,
  User,
  ClipboardList,
  FileText,
  Plus,
  ExternalLink,
  Boxes,
  Archive,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { getCultureById, getBanks, getOperations, getDonorById } from '@/lib/api'
import { formatDate, formatDateTime, getStatusColor, getStatusLabel, getOperationTypeLabel } from '@/lib/utils'
import type { Culture, Lot, Bank, Operation, Donor } from '@/types'

// ==================== Helper functions ====================

function getExtractionMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    ENZYMATIC: 'Ферментативный',
    EXPLANT: 'Эксплант',
    MECHANICAL: 'Механический',
    OTHER: 'Другое',
  }
  return labels[method] || method
}

function getExtractionMethodColor(method: string): string {
  const colors: Record<string, string> = {
    ENZYMATIC: 'bg-blue-100 text-blue-800',
    EXPLANT: 'bg-violet-100 text-violet-800',
    MECHANICAL: 'bg-orange-100 text-orange-800',
    OTHER: 'bg-gray-100 text-gray-800',
  }
  return colors[method] || 'bg-gray-100 text-gray-800'
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
    QC_PENDING: 'bg-amber-100 text-amber-800',
    APPROVED: 'bg-green-100 text-green-800',
    RESERVED: 'bg-blue-100 text-blue-800',
    ISSUED: 'bg-purple-100 text-purple-800',
    EXPIRED: 'bg-red-100 text-red-800',
    DISPOSE: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getBankStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    QUARANTINE: 'Карантин',
    QC_PENDING: 'Ожидает QC',
    APPROVED: 'Одобрен',
    RESERVED: 'Зарезервирован',
    ISSUED: 'Выдан',
    EXPIRED: 'Истек',
    DISPOSE: 'Утилизирован',
  }
  return labels[status] || status
}

function getBankTypeBadge(type: string): string {
  const colors: Record<string, string> = {
    MCB: 'bg-indigo-100 text-indigo-800',
    WCB: 'bg-teal-100 text-teal-800',
    RWB: 'bg-rose-100 text-rose-800',
  }
  return colors[type] || 'bg-gray-100 text-gray-800'
}

function getOperationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Ожидает',
    IN_PROGRESS: 'В работе',
    COMPLETED: 'Завершена',
  }
  return labels[status] || status
}

function getOperationStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

// ==================== Main Page Component ====================

export default function CultureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [culture, setCulture] = useState<Culture | null>(null)
  const [donor, setDonor] = useState<Donor | null>(null)
  const [banks, setBanks] = useState<Bank[]>([])
  const [operations, setOperations] = useState<Operation[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('info')

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Load culture with culture_type and lots
      const cultureData = await getCultureById(id)
      setCulture(cultureData as Culture)

      // 2. Load banks for this culture
      const banksData = await getBanks({ culture_id: id })
      setBanks((banksData || []) as Bank[])

      // 3. Load donor if exists
      if (cultureData?.donor_id) {
        try {
          const donorData = await getDonorById(cultureData.donor_id)
          setDonor(donorData as Donor)
        } catch {
          // donor may not exist
        }
      }

      // 4. Load operations for the first lot (if lots exist)
      const lots = (cultureData?.lots || []) as Lot[]
      if (lots.length > 0) {
        try {
          const allOperations: Operation[] = []
          // Load operations for each lot, limited set
          for (const lot of lots) {
            const opsData = await getOperations({ lot_id: lot.id })
            if (opsData) {
              allOperations.push(...(opsData as Operation[]))
            }
          }
          // Sort by date descending, take last 20
          allOperations.sort((a, b) => {
            const dateA = a.started_at || a.created_at
            const dateB = b.started_at || b.created_at
            return new Date(dateB).getTime() - new Date(dateA).getTime()
          })
          setOperations(allOperations.slice(0, 20))
        } catch {
          // operations may fail silently
        }
      }
    } catch (error) {
      console.error('Error loading culture data:', error)
      toast.error('Ошибка загрузки данных культуры')
    } finally {
      setLoading(false)
    }
  }

  // ==================== Loading state ====================
  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <FlaskConical className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Загрузка культуры...</p>
          </div>
        </div>
      </div>
    )
  }

  // ==================== Not found state ====================
  if (!culture) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-medium">Культура не найдена</p>
            <Link href="/cultures">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Вернуться к списку
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const lots = (culture.lots || []) as Lot[]

  // ==================== Main render ====================
  return (
    <div className="container py-6 space-y-6">

      {/* ==================== HEADER SECTION ==================== */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-4">
          <Link href="/cultures">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight">
                {culture.name}
              </h1>
              <Badge className={getStatusColor(culture.status)}>
                {getStatusLabel(culture.status)}
              </Badge>
              {culture.extraction_method && (
                <Badge className={getExtractionMethodColor(culture.extraction_method)}>
                  {getExtractionMethodLabel(culture.extraction_method)}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {culture.culture_type?.name || 'Тип не указан'}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Создано: {formatDate(culture.created_at)}
              </span>
              {donor && (
                <Link
                  href={`/donors/${donor.id}`}
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <User className="h-3.5 w-3.5" />
                  Донор: {donor.code}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
              {culture.donation_id && (
                <Link
                  href={`/donations/${culture.donation_id}`}
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Донация
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => router.push(`/operations/worksheet?culture_id=${id}`)}
          >
            <ClipboardList className="mr-2 h-4 w-4" />
            Рабочий лист
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/cultures/passport?culture_id=${id}`)}
          >
            <FileText className="mr-2 h-4 w-4" />
            Паспорт
          </Button>
          <Button
            onClick={() => {
              toast.info('Создание лота (тестовая функция)')
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Создать лот
          </Button>
        </div>
      </div>

      <Separator />

      {/* ==================== TABS ==================== */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">Информация</TabsTrigger>
          <TabsTrigger value="lots">Лоты ({lots.length})</TabsTrigger>
          <TabsTrigger value="banks">Банки ({banks.length})</TabsTrigger>
          <TabsTrigger value="operations">История операций</TabsTrigger>
        </TabsList>

        {/* ==================== INFO TAB ==================== */}
        <TabsContent value="info" className="space-y-6 mt-6">
          {/* Info Grid — 2 columns */}
          <Card>
            <CardHeader>
              <CardTitle>Основная информация</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {/* Row 1 */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Тип клеток</p>
                  <p className="font-medium mt-0.5">
                    {culture.culture_type?.name || '---'}
                    {culture.culture_type?.code && (
                      <span className="text-muted-foreground ml-1">({culture.culture_type.code})</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Донор</p>
                  <p className="font-medium mt-0.5">
                    {donor ? (
                      <Link href={`/donors/${donor.id}`} className="text-blue-600 hover:underline">
                        {donor.code}
                        {' - '}
                        {[donor.last_name, donor.first_name, donor.middle_name].filter(Boolean).join(' ') || 'Без имени'}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Не указан</span>
                    )}
                  </p>
                </div>

                {/* Row 2 */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Донация</p>
                  <p className="font-medium mt-0.5">
                    {culture.donation_id ? (
                      <Link href={`/donations/${culture.donation_id}`} className="text-blue-600 hover:underline">
                        Перейти к донации
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Не указана</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Способ выделения</p>
                  <p className="font-medium mt-0.5">
                    {culture.extraction_method ? (
                      <Badge className={getExtractionMethodColor(culture.extraction_method)}>
                        {getExtractionMethodLabel(culture.extraction_method)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Не указан</span>
                    )}
                  </p>
                </div>

                {/* Row 3 */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Дата получения</p>
                  <p className="font-medium mt-0.5">
                    {culture.received_date ? formatDate(culture.received_date) : '---'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Коэффициент роста</p>
                  <p className="font-medium mt-0.5">
                    {culture.coefficient != null ? culture.coefficient.toLocaleString('ru-RU') : '---'}
                  </p>
                </div>

                {/* Row 4 */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Количество лотов</p>
                  <p className="font-medium mt-0.5 flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-muted-foreground" />
                    {lots.length}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Количество банков</p>
                  <p className="font-medium mt-0.5 flex items-center gap-2">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                    {banks.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== LOTS TAB ==================== */}
        <TabsContent value="lots" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Лоты культуры</CardTitle>
            </CardHeader>
            <CardContent>
              {lots.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Пассаж</TableHead>
                      <TableHead>Дата начала</TableHead>
                      <TableHead>Контейнеры</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lots.map((lot) => (
                      <TableRow
                        key={lot.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/lots/${lot.id}`)}
                      >
                        <TableCell>
                          <Link href={`/lots/${lot.id}`} className="font-medium text-blue-600 hover:underline">
                            {lot.lot_number || lot.id.slice(0, 8)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">P{lot.passage_number}</Badge>
                        </TableCell>
                        <TableCell>
                          {lot.seeded_at ? formatDate(lot.seeded_at) : '---'}
                        </TableCell>
                        <TableCell>
                          {lot.containers?.length ?? 0}
                        </TableCell>
                        <TableCell>
                          <Badge className={getLotStatusColor(lot.status)}>
                            {getLotStatusLabel(lot.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Boxes className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Лоты ещё не созданы</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== BANKS TAB ==================== */}
        <TabsContent value="banks" className="mt-6">
          {banks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {banks.map((bank) => (
                <Card
                  key={bank.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/banks/${bank.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {bank.code || bank.id.slice(0, 8)}
                      </CardTitle>
                      <Badge className={getBankTypeBadge(bank.bank_type)}>
                        {bank.bank_type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Статус</span>
                      <Badge className={getBankStatusColor(bank.status)}>
                        {getBankStatusLabel(bank.status)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Криовиалы</span>
                      <span className="font-medium">{bank.cryo_vials_count}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Дата создания</span>
                      <span className="font-medium">
                        {bank.freezing_date ? formatDate(bank.freezing_date) : formatDate(bank.created_at)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Archive className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Банки ещё не созданы</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== OPERATIONS HISTORY TAB ==================== */}
        <TabsContent value="operations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>История операций (последние 20)</CardTitle>
            </CardHeader>
            <CardContent>
              {operations.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Примечания</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operations.map((op) => (
                      <TableRow key={op.id}>
                        <TableCell className="whitespace-nowrap">
                          {op.started_at
                            ? formatDateTime(op.started_at)
                            : formatDateTime(op.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getOperationTypeLabel(op.type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getOperationStatusColor(op.status)}>
                            {getOperationStatusLabel(op.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {op.notes || '---'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p>Операции не найдены</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
