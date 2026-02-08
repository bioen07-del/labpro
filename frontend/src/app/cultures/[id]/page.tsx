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
  FileText,
  Plus,
  ExternalLink,
  Boxes,
  Archive,
  Eye,
  Droplets,
  GitBranch,
  Snowflake,
  Trash2,
  ChevronDown,
  ChevronUp,
  Package,
  Activity,
  Beaker,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { getCultureById, getBanks, getOperations, getDonorById } from '@/lib/api'
import { formatDate, formatDateTime, getStatusColor, getStatusLabel, getOperationTypeLabel, formatCellsCount } from '@/lib/utils'
import type { Culture, Lot, Bank, Operation, Donor, Container } from '@/types'

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

function getContainerStatusColor(status: string): string {
  const colors: Record<string, string> = {
    IN_CULTURE: 'bg-green-100 text-green-800',
    IN_BANK: 'bg-purple-100 text-purple-800',
    ISSUED: 'bg-blue-100 text-blue-800',
    DISPOSE: 'bg-red-100 text-red-800',
    QUARANTINE: 'bg-yellow-100 text-yellow-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

function getContainerStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    IN_CULTURE: 'В работе',
    IN_BANK: 'В банке',
    ISSUED: 'Выдан',
    DISPOSE: 'Утилизирован',
    QUARANTINE: 'Карантин',
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

function getOperationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Ожидает',
    IN_PROGRESS: 'В работе',
    COMPLETED: 'Завершена',
  }
  return labels[status] || status
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
  const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      // 1. Load culture with culture_type, lots and containers
      const cultureData = await getCultureById(id)
      setCulture(cultureData as Culture)

      // Auto-expand active lots
      const activeLots = ((cultureData?.lots || []) as Lot[]).filter(l => l.status === 'ACTIVE')
      setExpandedLots(new Set(activeLots.map(l => l.id)))

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

      // 4. Load operations for all lots
      const lots = (cultureData?.lots || []) as Lot[]
      if (lots.length > 0) {
        try {
          const allOperations: Operation[] = []
          for (const lot of lots) {
            const opsData = await getOperations({ lot_id: lot.id })
            if (opsData) {
              allOperations.push(...(opsData as Operation[]))
            }
          }
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

  const toggleLot = (lotId: string) => {
    setExpandedLots(prev => {
      const next = new Set(prev)
      if (next.has(lotId)) next.delete(lotId)
      else next.add(lotId)
      return next
    })
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
  const activeLots = lots.filter(l => l.status === 'ACTIVE')
  const totalContainers = lots.reduce((sum, l) => sum + (l.containers?.length || 0), 0)
  const activeContainers = lots.reduce(
    (sum, l) => sum + (l.containers?.filter((c: Container) => c.container_status === 'IN_CULTURE').length || 0),
    0
  )
  const maxPassage = lots.reduce((max, l) => Math.max(max, l.passage_number || 0), 0)

  // ==================== Main render - single scrollable page ====================
  return (
    <div className="container py-6 space-y-6">

      {/* ==================== HEADER ==================== */}
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
            onClick={() => router.push(`/cultures/passport?culture_id=${id}`)}
          >
            <FileText className="mr-2 h-4 w-4" />
            Паспорт
          </Button>
          <Button
            onClick={() => toast.info('Создание лота (тестовая функция)')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Создать лот
          </Button>
        </div>
      </div>

      <Separator />

      {/* ==================== SUMMARY CARDS ==================== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2.5">
                <Beaker className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Тип клеток</p>
                <p className="font-semibold text-sm">{culture.culture_type?.name || '---'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-50 p-2.5">
                <Boxes className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Активных лотов</p>
                <p className="font-semibold text-lg">{activeLots.length} <span className="text-sm font-normal text-muted-foreground">/ {lots.length}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-purple-50 p-2.5">
                <GitBranch className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Макс. пассаж</p>
                <p className="font-semibold text-lg">P{maxPassage}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2.5">
                <Package className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Контейнеры</p>
                <p className="font-semibold text-lg">{activeContainers} <span className="text-sm font-normal text-muted-foreground">/ {totalContainers}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ==================== INFO CARD ==================== */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Основная информация</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Донор</p>
              <p className="font-medium mt-0.5">
                {donor ? (
                  <Link href={`/donors/${donor.id}`} className="text-blue-600 hover:underline">
                    {donor.code} — {[donor.last_name, donor.first_name].filter(Boolean).join(' ') || 'Без имени'}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">Не указан</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Способ выделения</p>
              <p className="font-medium mt-0.5">
                {culture.extraction_method ? getExtractionMethodLabel(culture.extraction_method) : '---'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Дата получения</p>
              <p className="font-medium mt-0.5">
                {culture.received_date ? formatDate(culture.received_date) : '---'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Коэффициент роста</p>
              <p className="font-medium mt-0.5">
                {culture.coefficient != null ? culture.coefficient.toLocaleString('ru-RU') : '---'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Банков заморозки</p>
              <p className="font-medium mt-0.5 flex items-center gap-2">
                <Archive className="h-4 w-4 text-muted-foreground" />
                {banks.length}
              </p>
            </div>
            {culture.description && (
              <div className="md:col-span-3">
                <p className="text-sm text-muted-foreground">Описание</p>
                <p className="font-medium mt-0.5">{culture.description}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ==================== LOTS SECTION (INLINE) ==================== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Boxes className="h-5 w-5" />
            Лоты ({lots.length})
          </h2>
        </div>

        {lots.length > 0 ? (
          <div className="space-y-3">
            {lots
              .sort((a, b) => (b.passage_number || 0) - (a.passage_number || 0))
              .map((lot) => {
                const containers = (lot.containers || []) as Container[]
                const isOpen = expandedLots.has(lot.id)
                const activeConts = containers.filter(c => c.container_status === 'IN_CULTURE')

                return (
                  <Collapsible key={lot.id} open={isOpen} onOpenChange={() => toggleLot(lot.id)}>
                    <Card className={lot.status === 'ACTIVE' ? 'border-green-200' : ''}>
                      {/* Lot header - always visible */}
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-wrap">
                              <CardTitle className="text-base">
                                {lot.lot_number || lot.id.slice(0, 8)}
                              </CardTitle>
                              <Badge variant="outline" className="font-mono">P{lot.passage_number}</Badge>
                              <Badge className={getLotStatusColor(lot.status)}>
                                {getLotStatusLabel(lot.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              {/* Quick summary */}
                              <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Package className="h-3.5 w-3.5" />
                                  {activeConts.length}/{containers.length}
                                </span>
                                {lot.seeded_at && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {formatDate(lot.seeded_at)}
                                  </span>
                                )}
                              </div>
                              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>

                      {/* Expanded content */}
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          <Separator />

                          {/* Lot details */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Дата посева</p>
                              <p className="font-medium">{lot.seeded_at ? formatDate(lot.seeded_at) : '---'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Кол-во клеток (нач.)</p>
                              <p className="font-medium">{lot.initial_cells ? formatCellsCount(lot.initial_cells) : '---'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Кол-во клеток (кон.)</p>
                              <p className="font-medium">{lot.final_cells ? formatCellsCount(lot.final_cells) : '---'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Жизнеспособность</p>
                              <p className="font-medium">{lot.viability ? `${lot.viability}%` : '---'}</p>
                            </div>
                          </div>

                          {/* Containers grid */}
                          {containers.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                                Контейнеры ({containers.length})
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {containers.map((container: Container) => (
                                  <div
                                    key={container.id}
                                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
                                    onClick={() => router.push(`/containers/${container.id}`)}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <div className="min-w-0">
                                        <p className="font-medium text-sm truncate">{container.code}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {container.container_type?.name || 'Тип N/A'}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {container.confluent_percent != null && (
                                        <span className="text-xs font-medium text-muted-foreground">
                                          {container.confluent_percent}%
                                        </span>
                                      )}
                                      <Badge className={`text-xs ${getContainerStatusColor(container.container_status)}`}>
                                        {getContainerStatusLabel(container.container_status)}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {containers.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              Нет контейнеров в данном лоте
                            </p>
                          )}

                          {/* Quick actions for active lots */}
                          {lot.status === 'ACTIVE' && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/operations/observe?lot_id=${lot.id}`)
                                }}
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                Наблюдение
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/operations/feed?lot_id=${lot.id}`)
                                }}
                              >
                                <Droplets className="mr-1.5 h-3.5 w-3.5" />
                                Кормление
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/operations/passage?lot_id=${lot.id}`)
                                }}
                              >
                                <GitBranch className="mr-1.5 h-3.5 w-3.5" />
                                Пассаж
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/operations/freeze?lot_id=${lot.id}`)
                                }}
                              >
                                <Snowflake className="mr-1.5 h-3.5 w-3.5" />
                                Заморозка
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/operations/dispose?lot_id=${lot.id}`)
                                }}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                Утилизация
                              </Button>
                            </div>
                          )}

                          {/* Link to lot detail */}
                          <div className="flex justify-end pt-1">
                            <Link href={`/lots/${lot.id}`}>
                              <Button variant="ghost" size="sm" className="text-blue-600">
                                Открыть лот
                                <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Boxes className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>Лоты ещё не созданы</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ==================== BANKS SECTION ==================== */}
      {banks.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Archive className="h-5 w-5" />
            Банки ({banks.length})
          </h2>
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
                    <span className="text-muted-foreground">Дата заморозки</span>
                    <span className="font-medium">
                      {bank.freezing_date ? formatDate(bank.freezing_date) : formatDate(bank.created_at)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ==================== RECENT OPERATIONS ==================== */}
      {operations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
            <Activity className="h-5 w-5" />
            Последние операции
          </h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {operations.slice(0, 10).map((op) => (
                  <div key={op.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-muted p-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {getOperationTypeLabel(op.type)}
                          </Badge>
                          <Badge className={`text-xs ${getOperationStatusColor(op.status)}`}>
                            {getOperationStatusLabel(op.status)}
                          </Badge>
                        </div>
                        {op.notes && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-[400px] truncate">
                            {op.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {op.started_at ? formatDateTime(op.started_at) : formatDateTime(op.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
