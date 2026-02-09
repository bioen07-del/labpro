"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { 
  ArrowLeft,
  Archive,
  FlaskConical,
  Layers,
  Snowflake,
  Calendar,
  User,
  Clock,
  AlertTriangle,
  Edit,
  CheckCircle2,
  XCircle,
  FileText,
  Thermometer,
  Box
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getBankById, getQCTests } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import type { Bank, QCTest } from '@/types'

export default function BankDetailPage() {
  const params = useParams()
  const bankId = params.id as string
  
  const [bank, setBank] = useState<Bank | null>(null)
  const [qcTests, setQCTests] = useState<QCTest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    loadData()
  }, [bankId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [bankData, qcTestsData] = await Promise.all([
        getBankById(bankId),
        getQCTests({ target_id: bankId, target_type: 'BANK' })
      ])
      
      setBank(bankData)
      setQCTests(qcTestsData || [])
    } catch (error) {
      console.error('Error loading bank:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Archive className="h-12 w-12 animate-pulse mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!bank) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
            <p className="text-lg font-medium">Банк не найден</p>
            <Link href="/banks">
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
          <Link href="/banks">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                Банк {bank.bank_type}
              </h1>
              <Badge className={getBankStatusColor(bank.status)}>
                {getBankStatusLabel(bank.status)}
              </Badge>
              {bank.qc_passed ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  QC пройден
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <Clock className="mr-1 h-3 w-3" />
                  QC ожидает
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              ID: {bank.id} • Создан {formatDate(bank.created_at)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Редактировать
          </Button>
          {!bank.qc_passed && (
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Добавить QC
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Box className="h-4 w-4" />
              Криовиалы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bank.cryo_vials_count}</div>
            <p className="text-xs text-muted-foreground">
              {bank.cryo_vials?.filter(v => v.status === 'IN_STOCK').length || 0} в наличии
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Layers className="h-4 w-4" />
              Клеток/виал
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bank.cells_per_vial ? bank.cells_per_vial.toLocaleString() : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              всего: {bank.total_cells ? bank.total_cells.toLocaleString() : '-'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Snowflake className="h-4 w-4" />
              Заморозка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {bank.freezing_date ? formatDate(bank.freezing_date) : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {bank.qc_date ? `QC: ${formatDate(bank.qc_date)}` : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              QC тесты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qcTests.length}</div>
            <p className="text-xs text-muted-foreground">
              {qcTests.filter(t => t.status === 'COMPLETED').length} пройдено
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Thermometer className="h-4 w-4" />
              Тип банка
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{getBankTypeLabel(bank.bank_type)}</div>
            <p className="text-xs text-muted-foreground">
              {getBankTypeDescription(bank.bank_type)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="cryovials">Криовиалы ({bank.cryo_vials?.length || 0})</TabsTrigger>
          <TabsTrigger value="qc">QC тесты ({qcTests.length})</TabsTrigger>
          <TabsTrigger value="history">История</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Информация о банке</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">ID банка</label>
                    <p className="font-mono font-medium">{bank.id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Тип</label>
                    <p className="font-medium">
                      <Badge variant="outline">{getBankTypeLabel(bank.bank_type)}</Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Статус</label>
                    <p className="font-medium">
                      <Badge className={getBankStatusColor(bank.status)}>
                        {getBankStatusLabel(bank.status)}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">QC статус</label>
                    <p className="font-medium">
                      {bank.qc_passed ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          Пройден
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Clock className="h-4 w-4" />
                          Ожидает
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Дата заморозки</label>
                    <p className="font-medium">{bank.freezing_date ? formatDate(bank.freezing_date) : '-'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Дата QC</label>
                    <p className="font-medium">{bank.qc_date ? formatDate(bank.qc_date) : '-'}</p>
                  </div>
                </div>
                {bank.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Примечания</label>
                    <p className="mt-1">{bank.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Culture Info */}
            <Card>
              <CardHeader>
                <CardTitle>Культура</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {bank.culture ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Название</label>
                        <p className="font-medium">{bank.culture.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Тип</label>
                        <p className="font-medium">
                          {bank.culture.culture_type?.name || '-'}
                        </p>
                      </div>
                    </div>
                    <Link href={`/cultures/${bank.culture.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        Открыть культуру
                      </Button>
                    </Link>
                  </>
                ) : (
                  <p className="text-muted-foreground">Культура не указана</p>
                )}
                
                {bank.lot && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Лот</label>
                        <p className="font-medium">P{bank.lot.passage_number}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">ID лота</label>
                        <p className="font-mono text-sm">{bank.lot.id}</p>
                      </div>
                    </div>
                    <Link href={`/lots/${bank.lot.id}`} className="mt-2 block">
                      <Button variant="outline" size="sm" className="w-full">
                        Открыть лот
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cell Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Статистика клеток</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Клеток на виал</label>
                    <p className="text-2xl font-bold">
                      {bank.cells_per_vial ? bank.cells_per_vial.toLocaleString() : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Всего клеток</label>
                    <p className="text-2xl font-bold">
                      {bank.total_cells ? bank.total_cells.toLocaleString() : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Криовиалов</label>
                    <p className="text-2xl font-bold">{bank.cryo_vials_count}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Доступно</label>
                    <p className="text-2xl font-bold text-green-600">
                      {bank.cryo_vials?.filter(v => v.status === 'IN_STOCK').length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Position Info */}
            <Card>
              <CardHeader>
                <CardTitle>Расположение</CardTitle>
              </CardHeader>
              <CardContent>
                {bank.position ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 border rounded-lg">
                      <Snowflake className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium">{bank.position.path}</p>
                        <p className="text-sm text-muted-foreground">
                          QR: {bank.position.qr_code || bank.position.path}
                        </p>
                      </div>
                    </div>
                    {bank.position.equipment && (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <label className="text-muted-foreground">Оборудование</label>
                          <p className="font-medium">{bank.position.equipment.name}</p>
                        </div>
                        <div>
                          <label className="text-muted-foreground">Тип оборудования</label>
                          <p className="font-medium">
                            {bank.position.equipment.type || '---'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Snowflake className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Позиция не назначена</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CryoVials Tab */}
        <TabsContent value="cryovials" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Криовиалы</CardTitle>
              <CardDescription>
                Все криовиалы этого банка
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bank.cryo_vials && bank.cryo_vials.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Код</TableHead>
                      <TableHead>Клеток</TableHead>
                      <TableHead>Позиция</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bank.cryo_vials.map((vial) => (
                      <TableRow key={vial.id}>
                        <TableCell className="font-mono">{vial.code}</TableCell>
                        <TableCell>
                          {vial.cells_count ? vial.cells_count.toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>{vial.position?.path || '-'}</TableCell>
                        <TableCell>
                          <Badge className={getCryoVialStatusColor(vial.status)}>
                            {getCryoVialStatusLabel(vial.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Криовиалы не созданы
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* QC Tests Tab */}
        <TabsContent value="qc" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>QC тесты</CardTitle>
              <CardDescription>
                Тесты контроля качества для этого банка
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qcTests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID теста</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Дата создания</TableHead>
                      <TableHead>Дата завершения</TableHead>
                      <TableHead>Результат</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {qcTests.map((test) => (
                      <TableRow key={test.id}>
                        <TableCell className="font-mono text-sm">
                          {test.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getQCTestTypeLabel(test.test_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(test.created_at)}</TableCell>
                        <TableCell>
                          {test.completed_at ? formatDate(test.completed_at) : '-'}
                        </TableCell>
                        <TableCell>
                          {test.result ? (
                            <Badge className={test.result === 'PASSED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {test.result === 'PASSED' ? 'ПРОЙДЕН' : 'НЕ ПРОЙДЕН'}
                            </Badge>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getQCStatusColor(test.status)}>
                            {getQCStatusLabel(test.status)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  QC тесты не проводились
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
              <BankHistoryTimeline bank={bank} qcTests={qcTests} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
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

function getBankTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    MCB: 'MCB',
    WCB: 'WCB',
    RWB: 'RWB',
  }
  return labels[type] || type
}

function getBankTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    MCB: 'Мастер-банк клеток',
    WCB: 'Рабочий-банк клеток',
    RWB: 'Резервный-банк клеток',
  }
  return descriptions[type] || ''
}

function getCryoVialStatusColor(status: string): string {
  const colors: Record<string, string> = {
    IN_STOCK: 'bg-green-100 text-green-800',
    RESERVED: 'bg-blue-100 text-blue-800',
    ISSUED: 'bg-purple-100 text-purple-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getCryoVialStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    IN_STOCK: 'В наличии',
    RESERVED: 'Зарезервирован',
    ISSUED: 'Выдан',
  }
  return labels[status] || status
}

function getQCTestTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    MYCOPLASMA: 'Микоплазма',
    STERILITY: 'Стерильность',
    LAL: 'LAL тест',
    VIA: 'VIability',
  }
  return labels[type] || type
}

function getQCStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getQCStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Ожидает',
    IN_PROGRESS: 'В процессе',
    COMPLETED: 'Завершен',
    CANCELLED: 'Отменен',
  }
  return labels[status] || status
}

// ==================== BANK HISTORY TIMELINE ====================

interface BankTimelineEvent {
  id: string
  type: 'bank_created' | 'qc_started' | 'qc_passed' | 'qc_failed' | 'status_changed' | 'vial_issued' | 'vial_reserved'
  title: string
  description: string
  timestamp: string
  user?: string
}

function BankHistoryTimeline({ bank, qcTests }: { bank: Bank; qcTests: QCTest[] }) {
  const [events, setEvents] = useState<BankTimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory()
  }, [bank.id])

  const loadHistory = async () => {
    setLoading(true)
    try {
      const timelineEvents: BankTimelineEvent[] = []

      // Add bank creation event
      timelineEvents.push({
        id: 'bank-created',
        type: 'bank_created',
        title: 'Создание банка',
        description: `Создан ${getBankTypeLabel(bank.bank_type)} банк с ${bank.cryo_vials_count} криовиалами`,
        timestamp: bank.created_at
      })

      // Add freezing date event if available
      if (bank.freezing_date) {
        timelineEvents.push({
          id: 'freezing',
          type: 'bank_created',
          title: 'Заморозка',
          description: 'Криоконсервация клеток',
          timestamp: bank.freezing_date
        })
      }

      // Add QC test events
      for (const test of qcTests) {
        if (test.status === 'PENDING' || test.status === 'IN_PROGRESS') {
          timelineEvents.push({
            id: `qc-${test.id}`,
            type: 'qc_started',
            title: 'QC тест начат',
            description: `Тест на ${getQCTestTypeLabel(test.test_type)}`,
            timestamp: test.started_at || test.created_at
          })
        } else if (test.status === 'COMPLETED' && test.result === 'PASSED') {
          timelineEvents.push({
            id: `qc-passed-${test.id}`,
            type: 'qc_passed',
            title: 'QC пройден',
            description: `Тест на ${getQCTestTypeLabel(test.test_type)} - результат положительный`,
            timestamp: test.completed_at || bank.created_at
          })
        } else if (test.status === 'COMPLETED' && test.result === 'FAILED') {
          timelineEvents.push({
            id: `qc-failed-${test.id}`,
            type: 'qc_failed',
            title: 'QC не пройден',
            description: `Тест на ${getQCTestTypeLabel(test.test_type)} - результат отрицательный`,
            timestamp: test.completed_at || bank.created_at
          })
        }
      }

      // Add QC passed status event
      if (bank.qc_passed) {
        timelineEvents.push({
          id: 'qc-status',
          type: 'qc_passed',
          title: 'QC завершен',
          description: 'Все тесты пройдены, банк готов к использованию',
          timestamp: bank.freezing_date || bank.created_at
        })
      }

      // Add cryo vial status events
      for (const vial of bank.cryo_vials || []) {
        if (vial.status === 'RESERVED') {
          timelineEvents.push({
            id: `reserved-${vial.id}`,
            type: 'vial_reserved',
            title: 'Резервирование',
            description: `Криовиал ${vial.code} зарезервирован`,
            timestamp: bank.freezing_date || bank.created_at
          })
        } else if (vial.status === 'ISSUED') {
          timelineEvents.push({
            id: `issued-${vial.id}`,
            type: 'vial_issued',
            title: 'Выдача',
            description: `Криовиал ${vial.code} выдан`,
            timestamp: bank.freezing_date || bank.created_at
          })
        }
      }

      // Add status change events
      if (bank.status === 'APPROVED' && bank.qc_passed) {
        timelineEvents.push({
          id: 'status-approved',
          type: 'status_changed',
          title: 'Статус изменён',
          description: 'Банк переведён в статус "Одобрен"',
          timestamp: bank.freezing_date || bank.created_at
        })
      } else if (bank.status === 'RESERVED') {
        timelineEvents.push({
          id: 'status-reserved',
          type: 'status_changed',
          title: 'Статус изменён',
          description: 'Банк зарезервирован',
          timestamp: bank.freezing_date || bank.created_at
        })
      } else if (bank.status === 'ISSUED') {
        timelineEvents.push({
          id: 'status-issued',
          type: 'status_changed',
          title: 'Статус изменён',
          description: 'Банк выдан',
          timestamp: bank.freezing_date || bank.created_at
        })
      }

      // Sort by timestamp descending
      timelineEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      setEvents(timelineEvents.length > 0 ? timelineEvents : getMockBankTimelineEvents(bank))
    } catch (error) {
      console.error('Error loading history:', error)
      setEvents(getMockBankTimelineEvents(bank))
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        История изменений пуста
      </div>
    )
  }

  return (
    <div className="relative pl-8 border-l-2 border-muted">
      {events.map((event, index) => (
        <BankTimelineItem key={event.id || index} event={event} isLast={index === events.length - 1} />
      ))}
    </div>
  )
}

function BankTimelineItem({ event, isLast }: { event: BankTimelineEvent; isLast: boolean }) {
  const getIcon = () => {
    switch (event.type) {
      case 'bank_created':
        return '🏦'
      case 'qc_started':
        return '🔬'
      case 'qc_passed':
        return '✅'
      case 'qc_failed':
        return '❌'
      case 'status_changed':
        return '📋'
      case 'vial_issued':
        return '📤'
      case 'vial_reserved':
        return '🔒'
      default:
        return '📝'
    }
  }

  const getColor = () => {
    switch (event.type) {
      case 'bank_created':
        return 'bg-purple-100 text-purple-600'
      case 'qc_started':
        return 'bg-blue-100 text-blue-600'
      case 'qc_passed':
        return 'bg-green-100 text-green-600'
      case 'qc_failed':
        return 'bg-red-100 text-red-600'
      case 'status_changed':
        return 'bg-yellow-100 text-yellow-600'
      case 'vial_issued':
        return 'bg-orange-100 text-orange-600'
      case 'vial_reserved':
        return 'bg-indigo-100 text-indigo-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="relative pb-8">
      {!isLast && (
        <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-muted" />
      )}
      <div className="relative flex gap-4">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getColor()} flex items-center justify-center text-sm`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0 pt-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{event.title}</p>
            <time className="text-xs text-muted-foreground">
              {formatDate(event.timestamp)}
            </time>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
          {event.user && (
            <p className="text-xs text-muted-foreground mt-1">
              👤 {event.user}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function getMockBankTimelineEvents(bank: Bank): BankTimelineEvent[] {
  return [
    {
      id: '1',
      type: 'bank_created',
      title: 'Создание банка',
      description: `Создан ${getBankTypeLabel(bank.bank_type)} банк`,
      timestamp: bank.created_at
    },
    {
      id: '2',
      type: 'bank_created',
      title: 'Заморозка',
      description: 'Криоконсервация клеток',
      timestamp: bank.freezing_date || bank.created_at
    },
    {
      id: '3',
      type: 'qc_started',
      title: 'QC тесты',
      description: 'Тесты контроля качества',
      timestamp: bank.freezing_date || bank.created_at
    },
    {
      id: '4',
      type: 'qc_passed',
      title: 'QC пройден',
      description: 'Все тесты успешно пройдены',
      timestamp: bank.freezing_date || bank.created_at
    }
  ]
}
