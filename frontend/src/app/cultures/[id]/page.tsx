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
  TrendingUp,
  Zap,
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
import { getCultureById, getBanks, getOperations, getDonorById, calculateCultureMetrics } from '@/lib/api'
import type { CultureMetrics } from '@/lib/api'
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
    USED: 'bg-gray-100 text-gray-600',
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
    USED: 'Использован',
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
  const [metrics, setMetrics] = useState<CultureMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedLots, setExpandedLots] = useState<Set<string>>(new Set())
  const [showClosedLots, setShowClosedLots] = useState(false)
  const [showInactiveContainers, setShowInactiveContainers] = useState<Set<string>>(new Set())

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
      // 5. Load culture metrics (Td, CPD)
      try {
        const m = await calculateCultureMetrics(id)
        setMetrics(m)
      } catch {
        // metrics calculation may fail if no passage data
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

  // Contamination check across all non-disposed containers
  const contaminatedContainers = lots.flatMap(l =>
    (l.containers || []).filter((c: Container) =>
      (c as any).contaminated === true &&
      (c.container_status || (c as any).status) !== 'DISPOSE'
    )
  )
  const hasContamination = contaminatedContainers.length > 0

  // ==================== Main render - single scrollable page ====================
  return (
    <div className="container py-6 space-y-6">

      {/* ==================== CONTAMINATION ALERT ==================== */}
      {hasContamination && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-red-300 bg-red-50 text-red-800">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="font-semibold">
              Контаминация обнаружена!
            </p>
            <p className="text-sm">
              {contaminatedContainers.length} контейнер(ов) помечены как контаминированные:
              {' '}
              {contaminatedContainers.map((c: Container) => c.code).join(', ')}
            </p>
            <p className="text-sm text-red-600">
              Рекомендуется немедленная утилизация контаминированных контейнеров.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                const containerIds = contaminatedContainers.map((c: Container) => c.id).join(',')
                // Find the lot(s) for the contaminated containers
                const lotId = lots.find(l => (l.containers || []).some((c: Container) => contaminatedContainers.some((cc: Container) => cc.id === c.id)))?.id
                const params = new URLSearchParams({
                  type: 'container',
                  reason: 'CONTAMINATION',
                  container_ids: containerIds,
                  ...(lotId ? { lot_id: lotId } : {}),
                })
                router.push(`/operations/dispose?${params.toString()}`)
              }}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Утилизировать
            </Button>
          </div>
        </div>
      )}

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

      {/* ==================== CUMULATIVE SUMMARY CARDS ==================== */}
      {(() => {
        // Gather CUMULATIVE metrics across ALL operations in ALL lots
        // Per-lot metrics will be displayed inside each lot's expanded view
        let latestViability: number | null = null
        let latestConcentration: number | null = null
        let lastObserveDate: string | null = null
        let totalCellsAccum: number = 0
        let viabilityValues: number[] = []
        let concentrationValues: number[] = []

        for (const op of operations) {
          const metrics = (op as any).operation_metrics?.[0]
          if (metrics?.viability_percent != null) {
            viabilityValues.push(metrics.viability_percent)
            if (latestViability === null) latestViability = metrics.viability_percent
          }
          if (metrics?.concentration != null) {
            concentrationValues.push(metrics.concentration)
            if (latestConcentration === null) latestConcentration = metrics.concentration
          }
          if (metrics?.total_cells != null) {
            totalCellsAccum += metrics.total_cells
          }
          if (!lastObserveDate && (op.type === 'OBSERVE' || op.type === 'PASSAGE')) {
            lastObserveDate = op.started_at || op.created_at
          }
        }

        // Cumulative averages
        const avgViability = viabilityValues.length > 0
          ? viabilityValues.reduce((s, v) => s + v, 0) / viabilityValues.length
          : null
        const avgConcentration = concentrationValues.length > 0
          ? concentrationValues.reduce((s, v) => s + v, 0) / concentrationValues.length
          : null

        // Max confluency across all active containers in all lots
        const allActiveConts = lots.flatMap(l => (l.containers || []).filter((c: Container) => c.container_status === 'IN_CULTURE'))
        const maxConfluent = allActiveConts.reduce((max: number, c: Container) => Math.max(max, (c as any).confluent_percent ?? 0), 0)
        // Average confluency
        const confluentValues = allActiveConts
          .map((c: Container) => (c as any).confluent_percent ?? 0)
          .filter((v: number) => v > 0)
        const avgConfluent = confluentValues.length > 0
          ? confluentValues.reduce((s: number, v: number) => s + v, 0) / confluentValues.length
          : 0

        // Total operations count
        const totalOps = operations.length

        // ===== Row 3: Aggregated metrics across active lots =====
        // Total cells across all active lots (latest measurement per lot)
        let cultureTotalCells = 0
        const lotViabilities: number[] = []
        let cultureTotalPDL = 0
        const lotProlifRates: number[] = []
        const lotDaysTo80: number[] = []

        for (const lot of activeLots) {
          const lotOps = operations.filter((op: Operation) => op.lot_id === lot.id)

          // Latest total_cells for this lot (fallback: lot.initial_cells)
          let lotCellsFound = false
          for (const op of lotOps) {
            const m = (op as any).operation_metrics?.[0]
            if (m?.total_cells) { cultureTotalCells += m.total_cells; lotCellsFound = true; break }
          }
          if (!lotCellsFound && lot.initial_cells) {
            cultureTotalCells += lot.initial_cells
          }
          // Latest viability for this lot
          for (const op of lotOps) {
            const m = (op as any).operation_metrics?.[0]
            if (m?.viability_percent != null) { lotViabilities.push(m.viability_percent); break }
          }

          // PDL per lot
          const lotInitial = lot.initial_cells ?? 0
          const lotFinal = lot.final_cells ?? 0
          let lotLatestCells = 0
          for (const op of lotOps) {
            const m = (op as any).operation_metrics?.[0]
            if (m?.total_cells) { lotLatestCells = m.total_cells; break }
          }
          const cellsForPDL = lotFinal || lotLatestCells
          if (lotInitial > 0 && cellsForPDL > 0) {
            const pdl = Math.log2(cellsForPDL / lotInitial)
            if (isFinite(pdl) && pdl > 0) cultureTotalPDL += pdl
          }

          // Proliferation rate per lot
          if (lotInitial > 0 && cellsForPDL > 0 && lot.seeded_at) {
            const pdl = Math.log2(cellsForPDL / lotInitial)
            if (isFinite(pdl) && pdl > 0) {
              const startDate = new Date(lot.seeded_at).getTime()
              const lastOp = lotOps[0]
              const endDate = lastOp ? new Date(lastOp.started_at || lastOp.created_at).getTime() : Date.now()
              const days = (endDate - startDate) / (1000 * 60 * 60 * 24)
              if (days > 0) lotProlifRates.push(pdl / days)
            }
          }

          // Days to 80% per lot (linear regression)
          const lotContainers = (lot.containers || []) as Container[]
          const lotActiveConts = lotContainers.filter((c: Container) => c.container_status === 'IN_CULTURE')
          const lotAvgConf = lotActiveConts.length > 0
            ? lotActiveConts.reduce((s: number, c: Container) => s + ((c as any).confluent_percent ?? 0), 0) / lotActiveConts.length
            : 0
          const lotObsOps = [...lotOps.filter((op: Operation) => op.type === 'OBSERVE' || op.type === 'PASSAGE')].reverse()
          if (lotObsOps.length >= 2 && lot.seeded_at) {
            const lotStart = new Date(lot.seeded_at).getTime()
            const dp: { d: number; c: number }[] = []
            for (const op of lotObsOps) {
              const opC = (op as any).operation_containers || []
              const vals = opC.map((c: any) => c.confluent_percent).filter((v: any) => v != null && v > 0)
              if (vals.length > 0) {
                const avg = vals.reduce((s: number, v: number) => s + v, 0) / vals.length
                const d = (new Date(op.started_at || op.created_at).getTime() - lotStart) / (1000 * 60 * 60 * 24)
                if (d >= 0) dp.push({ d, c: avg })
              }
            }
            if (dp.length >= 2) {
              const n = dp.length
              const sX = dp.reduce((s, p) => s + p.d, 0)
              const sY = dp.reduce((s, p) => s + p.c, 0)
              const sXY = dp.reduce((s, p) => s + p.d * p.c, 0)
              const sX2 = dp.reduce((s, p) => s + p.d * p.d, 0)
              const den = n * sX2 - sX * sX
              if (den !== 0) {
                const slope = (n * sXY - sX * sY) / den
                if (slope > 0 && lotAvgConf < 80) {
                  const est = Math.round((80 - lotAvgConf) / slope)
                  if (est > 0 && est < 365) lotDaysTo80.push(est)
                }
              }
            }
          }
        }

        const cultureAvgViability = lotViabilities.length > 0
          ? lotViabilities.reduce((s, v) => s + v, 0) / lotViabilities.length
          : null
        const cultureAvgProlifRate = lotProlifRates.length > 0
          ? lotProlifRates.reduce((s, v) => s + v, 0) / lotProlifRates.length
          : null
        const cultureAvgDaysTo80 = lotDaysTo80.length > 0
          ? Math.round(lotDaysTo80.reduce((s, v) => s + v, 0) / lotDaysTo80.length)
          : null

        const hasRow3 = cultureTotalCells > 0 || cultureAvgViability != null || cultureTotalPDL > 0 || cultureAvgProlifRate != null || cultureAvgDaysTo80 != null || (metrics?.currentTd != null)

        return (
          <>
          {/* Row 1: Structure metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-2.5">
                    <Activity className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Конфлюэнтность</p>
                    <p className={`font-semibold text-lg ${maxConfluent >= 80 ? 'text-green-600' : maxConfluent >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {maxConfluent > 0 ? `${maxConfluent}%` : '---'}
                    </p>
                    {avgConfluent > 0 && maxConfluent !== Math.round(avgConfluent) && (
                      <p className="text-xs text-muted-foreground">сред. {Math.round(avgConfluent)}%</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Cumulative bio metrics */}
          {(latestViability != null || latestConcentration != null || lastObserveDate || totalCellsAccum > 0) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {latestViability != null && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-50 p-2.5">
                        <Activity className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Жизнеспособность</p>
                        <p className="font-semibold text-lg">{latestViability}%</p>
                        {avgViability != null && viabilityValues.length > 1 && (
                          <p className="text-xs text-muted-foreground">
                            сред. {avgViability.toFixed(1)}% ({viabilityValues.length} изм.)
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Концентрация (кл/мл) — технический показатель операций, не отображается */}
              {culture.coefficient != null && culture.coefficient > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-rose-50 p-2.5">
                        <Beaker className="h-5 w-5 text-rose-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Коэффициент роста</p>
                        <p className="font-semibold text-lg">{culture.coefficient.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {lastObserveDate && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-sky-50 p-2.5">
                        <Clock className="h-5 w-5 text-sky-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Последний осмотр</p>
                        <p className="font-semibold text-sm">{formatDate(lastObserveDate)}</p>
                        {totalOps > 0 && (
                          <p className="text-xs text-muted-foreground">
                            всего {totalOps} операций
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Row 3: Aggregated bio-metrics across active lots */}
          {hasRow3 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {cultureTotalCells > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-teal-50 p-2.5">
                        <Beaker className="h-5 w-5 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Общее кол-во клеток</p>
                        <p className="font-semibold text-lg">
                          {cultureTotalCells >= 1e6
                            ? `${(cultureTotalCells / 1e6).toFixed(2)} млн`
                            : cultureTotalCells.toLocaleString('ru-RU')}
                        </p>
                        <p className="text-xs text-muted-foreground">по {activeLots.length} акт. лотам</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {cultureAvgViability != null && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-50 p-2.5">
                        <Activity className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Средняя viability</p>
                        <p className="font-semibold text-lg">{cultureAvgViability.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">{lotViabilities.length} лот(ов)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {cultureTotalPDL > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-violet-50 p-2.5">
                        <TrendingUp className="h-5 w-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Общее PDL</p>
                        <p className="font-semibold text-lg">{cultureTotalPDL.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">кумулятивные удвоения</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {cultureAvgProlifRate != null && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-orange-50 p-2.5">
                        <Zap className="h-5 w-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ср. пролиферация</p>
                        <p className="font-semibold text-lg">{cultureAvgProlifRate.toFixed(3)}</p>
                        <p className="text-xs text-muted-foreground">удв./день</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {cultureAvgDaysTo80 != null && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-sky-50 p-2.5">
                        <Clock className="h-5 w-5 text-sky-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Ср. дорост до 80%</p>
                        <p className="font-semibold text-lg">~{cultureAvgDaysTo80} дн.</p>
                        <p className="text-xs text-muted-foreground">{lotDaysTo80.length} лот(ов)</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {metrics?.currentTd != null && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-indigo-50 p-2.5">
                        <TrendingUp className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Время удвоения (Td)</p>
                        <p className="font-semibold text-lg">{metrics.currentTd} ч</p>
                        {metrics.averageTd != null && metrics.averageTd !== metrics.currentTd && (
                          <p className="text-xs text-muted-foreground">сред. {metrics.averageTd} ч</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          </>
        )
      })()}

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

      {/* ==================== GROWTH KINETICS ==================== */}
      {metrics && metrics.confidence !== 'none' && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Кинетика роста
              </CardTitle>
              <Badge variant="outline" className={
                metrics.confidence === 'high' ? 'border-green-500 text-green-700' : 'border-amber-500 text-amber-700'
              }>
                {metrics.confidence === 'high' ? 'Высокая точность' : 'Мало данных'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Td (текущее)</p>
                <p className="text-lg font-semibold">
                  {metrics.currentTd != null ? `${metrics.currentTd} ч` : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Td (среднее)</p>
                <p className="text-lg font-semibold">
                  {metrics.averageTd != null ? `${metrics.averageTd} ч` : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">CPD</p>
                <p className="text-lg font-semibold">{metrics.cumulativePD}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Скорость (r)</p>
                <p className="text-lg font-semibold">
                  {metrics.growthRate != null ? `${metrics.growthRate} /ч` : '—'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Коэффициент</p>
                <p className="text-lg font-semibold">
                  {metrics.coefficient != null ? metrics.coefficient.toLocaleString('ru-RU') : '—'}
                </p>
              </div>
            </div>

            {/* Passage metrics table */}
            {metrics.passages.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-2">Метрики по пассажам</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-1.5 pr-3 font-medium">P#</th>
                        <th className="text-left py-1.5 pr-3 font-medium">Лот</th>
                        <th className="text-right py-1.5 pr-3 font-medium">N₀</th>
                        <th className="text-right py-1.5 pr-3 font-medium">Nf</th>
                        <th className="text-right py-1.5 pr-3 font-medium">V%</th>
                        <th className="text-right py-1.5 pr-3 font-medium">PD</th>
                        <th className="text-right py-1.5 pr-3 font-medium">Td (ч)</th>
                        <th className="text-right py-1.5 font-medium">Дл. (ч)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.passages.map((p, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1.5 pr-3 font-mono">P{p.passageNumber}</td>
                          <td className="py-1.5 pr-3">{p.lotNumber}</td>
                          <td className="py-1.5 pr-3 text-right font-mono">{formatCellsCount(p.initialCells)}</td>
                          <td className="py-1.5 pr-3 text-right font-mono">{formatCellsCount(p.finalCells)}</td>
                          <td className="py-1.5 pr-3 text-right">{p.viability}%</td>
                          <td className="py-1.5 pr-3 text-right font-semibold">{p.populationDoublings}</td>
                          <td className="py-1.5 pr-3 text-right font-semibold">{p.doublingTime ?? '—'}</td>
                          <td className="py-1.5 text-right text-muted-foreground">{p.durationHours ? Math.round(p.durationHours) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ==================== LOTS SECTION (INLINE) ==================== */}
      {(() => {
        const sortedLots = [...lots].sort((a, b) => (b.passage_number || 0) - (a.passage_number || 0))
        const closedLots = sortedLots.filter(l => l.status !== 'ACTIVE')

        // Helper: render a single lot card
        const renderLotCard = (lot: Lot) => {
          const containers = (lot.containers || []) as Container[]
          const isOpen = expandedLots.has(lot.id)
          const activeConts = containers.filter(c => c.container_status === 'IN_CULTURE')
          const lotBanks = banks.filter(b => b.lot_id === lot.id)
          const parentLot = lot.parent_lot_id ? lots.find(l => l.id === lot.parent_lot_id) : null

          return (
            <Collapsible key={lot.id} open={isOpen} onOpenChange={() => toggleLot(lot.id)}>
              <Card className={lot.status === 'ACTIVE' ? 'border-green-200' : ''}>
                {/* Lot header - always visible */}
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-base">
                          {lot.lot_number || lot.id.slice(0, 8)}
                        </CardTitle>
                        <Badge variant="outline" className="font-mono">P{lot.passage_number}</Badge>
                        <Badge className={getLotStatusColor(lot.status)}>
                          {getLotStatusLabel(lot.status)}
                        </Badge>
                        {lotBanks.map((bank: Bank) => (
                          <Badge
                            key={bank.id}
                            variant="outline"
                            className="bg-blue-100 text-blue-800 border-blue-300"
                          >
                            <Snowflake className="mr-1 h-3 w-3" />
                            {bank.bank_type} — {bank.code}
                            {bank.status === 'QUARANTINE' && ' (QC)'}
                            {bank.status === 'APPROVED' && ' \u2713'}
                          </Badge>
                        ))}
                        {parentLot && (
                          <span className="text-xs text-muted-foreground">
                            \u2190 {parentLot.lot_number} (P{parentLot.passage_number})
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        {/* Quick summary */}
                        <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
                          {lot.initial_cells && (
                            <span className="flex items-center gap-1" title="Начальные клетки">
                              {formatCellsCount(lot.initial_cells)}
                            </span>
                          )}
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

                    {/* Lot details + per-lot metrics */}
                    {(() => {
                      // Per-lot metrics: find operations for this lot
                      const lotOps = operations.filter((op: Operation) => op.lot_id === lot.id)
                      let lotViability: number | null = null
                      let lotTotalCells: number | null = null
                      let lotLastObserve: string | null = null

                      for (const op of lotOps) {
                        const m = (op as any).operation_metrics?.[0]
                        if (m?.viability_percent != null && lotViability === null) lotViability = m.viability_percent
                        if (m?.total_cells != null && lotTotalCells === null) lotTotalCells = m.total_cells
                        if (!lotLastObserve && (op.type === 'OBSERVE' || op.type === 'PASSAGE')) {
                          lotLastObserve = op.started_at || op.created_at
                        }
                      }

                      // Max confluency in this lot's containers
                      const lotMaxConfluent = activeConts.reduce((max: number, c: Container) => Math.max(max, (c as any).confluent_percent ?? 0), 0)

                      return (
                        <>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Дата посева</p>
                            <p className="font-medium">{lot.seeded_at ? formatDate(lot.seeded_at) : '---'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Конфлюэнтность (макс.)</p>
                            <p className={`font-medium ${lotMaxConfluent >= 80 ? 'text-green-600' : lotMaxConfluent >= 50 ? 'text-yellow-600' : ''}`}>
                              {lotMaxConfluent > 0 ? `${lotMaxConfluent}%` : '---'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Кол-во клеток (нач.)</p>
                            <p className="font-medium">{lot.initial_cells ? formatCellsCount(lot.initial_cells) : '---'}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Кол-во клеток (кон.)</p>
                            <p className="font-medium">{lot.final_cells ? formatCellsCount(lot.final_cells) : '---'}</p>
                          </div>
                        </div>

                        {/* Per-lot bio metrics from operations */}
                        {(lotViability != null || lotTotalCells != null || lotLastObserve) && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-3 rounded-lg bg-muted/30 border">
                            {lotViability != null && (
                              <div>
                                <p className="text-muted-foreground">Жизнеспособность</p>
                                <p className="font-medium">{lotViability}%</p>
                              </div>
                            )}
                            {lotTotalCells != null && (
                              <div>
                                <p className="text-muted-foreground">Общее кол-во клеток</p>
                                <p className="font-medium">{(lotTotalCells / 1e6).toFixed(2)} млн</p>
                              </div>
                            )}
                            {lotLastObserve && (
                              <div>
                                <p className="text-muted-foreground">Последний осмотр</p>
                                <p className="font-medium">{formatDate(lotLastObserve)}</p>
                              </div>
                            )}
                          </div>
                        )}
                        </>
                      )
                    })()}

                    {/* Containers grid */}
                    {containers.length > 0 && (() => {
                      const activeConts2 = containers.filter((c: Container) =>
                        c.container_status !== 'DISPOSE' && c.container_status !== 'USED'
                      )
                      const inactiveConts = containers.filter((c: Container) =>
                        c.container_status === 'DISPOSE' || c.container_status === 'USED'
                      )
                      const showInactive = showInactiveContainers.has(lot.id)
                      const displayedContainers = showInactive ? containers : activeConts2

                      return (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-muted-foreground">
                              Контейнеры ({activeConts2.length} активных{inactiveConts.length > 0 ? `, ${inactiveConts.length} завершённых` : ''})
                            </h4>
                            {inactiveConts.length > 0 && (
                              <button
                                type="button"
                                className="text-xs text-primary hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowInactiveContainers(prev => {
                                    const next = new Set(prev)
                                    if (next.has(lot.id)) next.delete(lot.id)
                                    else next.add(lot.id)
                                    return next
                                  })
                                }}
                              >
                                {showInactive ? 'Скрыть завершённые' : `Показать завершённые (${inactiveConts.length})`}
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {displayedContainers.map((container: Container) => (
                              <div
                                key={container.id}
                                className={`flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 cursor-pointer transition-colors ${
                                  container.container_status === 'DISPOSE' || container.container_status === 'USED' ? 'opacity-60' : ''
                                }`}
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
                                  {(container as any).contaminated && (
                                    <Badge variant="destructive" className="text-xs">
                                      Контаминация
                                    </Badge>
                                  )}
                                  <Badge className={`text-xs ${getContainerStatusColor(container.container_status)}`}>
                                    {getContainerStatusLabel(container.container_status)}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })()}

                    {containers.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        Нет контейнеров в данном лоте
                      </p>
                    )}

                    {/* Quick actions for active lots */}
                    {lot.status === 'ACTIVE' && (() => {
                      const isBankedLot = containers.length > 0 && containers.every((c: Container) => c.container_status === 'IN_BANK')

                      if (isBankedLot) {
                        // Banked lot: only thaw, issue, dispose
                        return (
                          <div className="flex flex-wrap gap-2 pt-1">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <Snowflake className="mr-1 h-3 w-3" />
                              Все контейнеры в банке
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/operations/thaw?lot_id=${lot.id}`)
                              }}
                            >
                              <Snowflake className="mr-1.5 h-3.5 w-3.5" />
                              Разморозка
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
                        )
                      }

                      // Normal active lot: all operations
                      return (
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
                      )
                    })()}

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
        }

        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Boxes className="h-5 w-5" />
                Лоты ({lots.length})
              </h2>
            </div>

            {lots.length > 0 ? (
              <div className="space-y-3">
                {/* Active lots — always shown individually */}
                {activeLots
                  .sort((a, b) => (b.passage_number || 0) - (a.passage_number || 0))
                  .map(renderLotCard)}

                {/* Closed lots — grouped in a collapsible block */}
                {closedLots.length > 0 && (
                  <Collapsible open={showClosedLots} onOpenChange={setShowClosedLots}>
                    <Card className="border-dashed">
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Archive className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium text-muted-foreground">
                                Закрытые лоты ({closedLots.length})
                              </span>
                              <div className="flex gap-1.5">
                                {closedLots.slice(0, 5).map(l => (
                                  <Badge key={l.id} variant="outline" className="text-xs font-mono opacity-60">
                                    P{l.passage_number}
                                  </Badge>
                                ))}
                                {closedLots.length > 5 && (
                                  <Badge variant="outline" className="text-xs opacity-60">
                                    +{closedLots.length - 5}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            {showClosedLots ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-3">
                          {closedLots.map(renderLotCard)}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}
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
        )
      })()}

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
