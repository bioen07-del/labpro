"use client"

import { use, useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Eye,
  Utensils,
  RefreshCw,
  Snowflake,
  Trash2,
  MapPin,
  AlertTriangle,
  CheckSquare,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { getLotById, getContainersByLot, getOperations, forecastCells, calculateAndUpdateCoefficient } from "@/lib/api"

// ==================== CONSTANTS ====================

const LOT_STATUS_VARIANT: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800 border-green-300",
  DISPOSE: "bg-red-100 text-red-800 border-red-300",
  CLOSED: "bg-gray-100 text-gray-800 border-gray-300",
}

const LOT_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Активен",
  DISPOSE: "Утилизирован",
  CLOSED: "Закрыт",
}

const CONTAINER_STATUS_VARIANT: Record<string, string> = {
  IN_CULTURE: "bg-green-100 text-green-800 border-green-300",
  IN_BANK: "bg-blue-100 text-blue-800 border-blue-300",
  ISSUED: "bg-purple-100 text-purple-800 border-purple-300",
  DISPOSE: "bg-red-100 text-red-800 border-red-300",
  QUARANTINE: "bg-yellow-100 text-yellow-800 border-yellow-300",
}

const CONTAINER_STATUS_LABEL: Record<string, string> = {
  IN_CULTURE: "В культуре",
  IN_BANK: "В банке",
  ISSUED: "Выдан",
  DISPOSE: "Утилизирован",
  QUARANTINE: "Карантин",
}

const OP_TYPE_LABEL: Record<string, string> = {
  OBSERVE: "Осмотр",
  FEED: "Подкормка",
  PASSAGE: "Пассаж",
  FREEZE: "Заморозка",
  THAW: "Разморозка",
  DISPOSE: "Утилизация",
  QCREG: "QC",
}

const OP_TYPE_VARIANT: Record<string, string> = {
  OBSERVE: "bg-sky-100 text-sky-800",
  FEED: "bg-amber-100 text-amber-800",
  PASSAGE: "bg-indigo-100 text-indigo-800",
  FREEZE: "bg-cyan-100 text-cyan-800",
  THAW: "bg-orange-100 text-orange-800",
  DISPOSE: "bg-red-100 text-red-800",
  QCREG: "bg-emerald-100 text-emerald-800",
}

// ==================== HELPERS ====================

function confluenceColor(percent: number): string {
  if (percent >= 80) return "text-green-600"
  if (percent >= 50) return "text-yellow-600"
  return "text-red-600"
}

function confluenceBg(percent: number): string {
  if (percent >= 80) return "bg-green-500"
  if (percent >= 50) return "bg-yellow-500"
  return "bg-red-500"
}

function fmtDate(iso?: string | null): string {
  if (!iso) return "\u2014"
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function fmtDateTime(iso?: string | null): string {
  if (!iso) return "\u2014"
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ==================== PAGE ====================

export default function LotDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [lot, setLot] = useState<any>(null)
  const [containers, setContainers] = useState<any[]>([])
  const [operations, setOperations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confidence, setConfidence] = useState<'high' | 'medium' | 'none'>('none')

  // Container selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [lotData, containersData, opsData] = await Promise.all([
        getLotById(id),
        getContainersByLot(id),
        getOperations({ lot_id: id }),
      ])
      setLot(lotData)
      setContainers(containersData || [])
      setOperations(opsData || [])

      // Load confidence level for cell forecast
      if (lotData?.culture?.id) {
        try {
          const coeffData = await calculateAndUpdateCoefficient(lotData.culture.id)
          setConfidence(coeffData.confidence)
        } catch { /* ignore */ }
      }
    } catch (err: any) {
      const msg = err?.message || "Ошибка загрузки данных лота"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    if (id) loadData()
  }, [id, loadData])

  // ---- Selection helpers ----

  const activeContainers = containers.filter(
    (c) => (c.container_status || c.status) !== 'DISPOSE'
  )

  const toggleSelect = (containerId: string) => {
    // Don't allow selecting disposed containers
    const container = containers.find((c) => c.id === containerId)
    if ((container?.container_status || container?.status) === 'DISPOSE') return
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(containerId)) next.delete(containerId)
      else next.add(containerId)
      return next
    })
  }

  const selectAll = () => {
    if (selectedIds.size === activeContainers.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(activeContainers.map((c) => c.id)))
    }
  }

  const allSelected =
    activeContainers.length > 0 && selectedIds.size === activeContainers.length

  // ---- Render states ----

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-10 bg-muted rounded w-full" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-40 bg-muted rounded" />
            <div className="h-40 bg-muted rounded col-span-2" />
          </div>
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    )
  }

  if (error || !lot) {
    return (
      <div className="container mx-auto py-6 max-w-6xl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-10 text-center">
            <p className="text-red-600 font-medium">
              {error || "Лот не найден"}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.back()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const culture = lot.culture

  return (
    <div className="container mx-auto py-6 max-w-6xl space-y-6">
      {/* ==================== HEADER ==================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">
                {lot.lot_number || `Лот #${id.substring(0, 8)}`}
              </h1>
              <Badge
                variant="outline"
                className="bg-indigo-100 text-indigo-800 border-indigo-300 font-mono"
              >
                P{lot.passage_number ?? 0}
              </Badge>
              <Badge
                variant="outline"
                className={
                  LOT_STATUS_VARIANT[lot.status] || "bg-gray-100 text-gray-800"
                }
              >
                {LOT_STATUS_LABEL[lot.status] || lot.status}
              </Badge>
            </div>

            {culture && (
              <Link
                href={`/cultures/${culture.id}`}
                className="text-sm text-muted-foreground hover:text-primary hover:underline"
              >
                {culture.name || culture.culture_type?.name || "Культура"}
              </Link>
            )}
          </div>
        </div>

        {/* ===== ACTION BUTTONS ===== */}
        {lot.status === 'ACTIVE' && activeContainers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <Link href={`/operations/observe?lot_id=${id}`}>
            <Button variant="outline" size="sm">
              <Eye className="mr-1.5 h-4 w-4" />
              Осмотр
            </Button>
          </Link>
          <Link href={`/operations/feed?lot_id=${id}`}>
            <Button variant="outline" size="sm">
              <Utensils className="mr-1.5 h-4 w-4" />
              Подкормка
            </Button>
          </Link>
          <Link href={`/operations/passage?lot_id=${id}`}>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Пассаж
            </Button>
          </Link>
          <Link href={`/operations/freeze?lot_id=${id}`}>
            <Button variant="outline" size="sm">
              <Snowflake className="mr-1.5 h-4 w-4" />
              Заморозка
            </Button>
          </Link>
          <Link href={`/operations/dispose?lot_id=${id}`}>
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:border-red-300"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Утилизация
            </Button>
          </Link>
        </div>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            {lot.status === 'DISPOSE' ? 'Лот утилизирован' : lot.status === 'CLOSED' ? 'Лот закрыт' : 'Нет активных контейнеров'}
          </Badge>
        )}
      </div>

      <Separator />

      {/* ==================== INFO GRID ==================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Информация о лоте</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Культура */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Культура</p>
              {culture ? (
                <Link
                  href={`/cultures/${culture.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {culture.name || "\u2014"}
                </Link>
              ) : (
                <p className="font-medium">{"\u2014"}</p>
              )}
            </div>

            {/* Пассаж */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Пассаж</p>
              <p className="font-medium font-mono">
                P{lot.passage_number ?? 0}
              </p>
            </div>

            {/* Дата создания */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Дата создания
              </p>
              <p className="font-medium">{fmtDate(lot.seeded_at)}</p>
            </div>

            {/* Статус */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">Статус</p>
              <Badge
                variant="outline"
                className={
                  LOT_STATUS_VARIANT[lot.status] || "bg-gray-100 text-gray-800"
                }
              >
                {LOT_STATUS_LABEL[lot.status] || lot.status}
              </Badge>
            </div>

            {/* Родительский лот */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Родительский лот
              </p>
              {lot.parent_lot_id ? (
                <Link
                  href={`/lots/${lot.parent_lot_id}`}
                  className="font-medium text-primary hover:underline"
                >
                  P{(lot.passage_number ?? 1) - 1} (родитель)
                </Link>
              ) : (
                <p className="font-medium text-muted-foreground">{"\u2014"}</p>
              )}
            </div>

            {/* Контейнеров */}
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Контейнеров
              </p>
              <p className="font-medium">{containers.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ==================== LOT METRICS ==================== */}
      {(() => {
        // Extract metrics from operations (latest values)
        const passageOps = operations.filter((op: any) => op.type === 'PASSAGE' || op.type === 'FREEZE')
        const observeOps = operations.filter((op: any) => op.type === 'OBSERVE' || op.type === 'PASSAGE')

        // Get latest metrics from any operation that has them
        let latestConcentration: number | null = null
        let latestViability: number | null = null
        let latestTotalCells: number | null = null
        let latestVolume: number | null = null

        for (const op of operations) {
          const metrics = (op.operation_metrics as any[])?.[0]
          if (!metrics) continue
          if (latestConcentration === null && metrics.concentration) latestConcentration = metrics.concentration
          if (latestViability === null && metrics.viability_percent) latestViability = metrics.viability_percent
          if (latestTotalCells === null && metrics.total_cells) latestTotalCells = metrics.total_cells
          if (latestVolume === null && metrics.volume_ml) latestVolume = metrics.volume_ml
        }

        // Latest confluency from containers
        const maxConfluent = activeContainers.reduce((max: number, c: any) => Math.max(max, c.confluent_percent ?? 0), 0)

        // Last observation date
        const lastObserve = observeOps[0]
        const lastObserveDate = lastObserve?.started_at || lastObserve?.created_at

        const hasMetrics = latestConcentration || latestViability || latestTotalCells || maxConfluent > 0

        if (!hasMetrics) return null

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Метрики лота</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {maxConfluent > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Конфлюэнтность (макс.)</p>
                    <p className={`font-semibold text-lg ${confluenceColor(maxConfluent)}`}>{maxConfluent}%</p>
                  </div>
                )}
                {latestViability != null && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Жизнеспособность</p>
                    <p className="font-semibold text-lg">{latestViability}%</p>
                  </div>
                )}
                {latestConcentration != null && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Концентрация</p>
                    <p className="font-medium">{latestConcentration.toLocaleString('ru-RU')} кл/мл</p>
                  </div>
                )}
                {latestTotalCells != null && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Общее кол-во клеток</p>
                    <p className="font-medium">{(latestTotalCells / 1e6).toFixed(2)} млн</p>
                  </div>
                )}
                {latestVolume != null && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Объём суспензии</p>
                    <p className="font-medium">{latestVolume} мл</p>
                  </div>
                )}
                {lastObserveDate && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Последний осмотр</p>
                    <p className="font-medium">{fmtDate(lastObserveDate)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* ==================== CELL FORECAST ==================== */}
      {culture?.coefficient != null && culture.coefficient > 0 && activeContainers.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Прогноз выхода клеток</CardTitle>
              <Badge
                variant="outline"
                className={
                  confidence === 'high'
                    ? 'bg-green-100 text-green-800 border-green-300'
                    : confidence === 'medium'
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                      : 'bg-gray-100 text-gray-600 border-gray-300'
                }
              >
                {confidence === 'high' ? 'Высокая точность' : confidence === 'medium' ? 'Средняя точность' : 'Нет данных'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const coeff = culture.coefficient
              const totalForecast = activeContainers.reduce((sum: number, c: any) => {
                const area = c.container_type?.surface_area || 0
                return sum + forecastCells(coeff, area, 0.9)
              }, 0)
              const firstContainer = activeContainers[0]
              const firstArea = firstContainer?.container_type?.surface_area || 0
              const singleForecast = forecastCells(coeff, firstArea, 0.9)
              return (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Коэффициент</p>
                    <p className="font-medium">{coeff.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">С контейнера ({firstContainer?.container_type?.name || 'N/A'}, 90%)</p>
                    <p className="font-medium">{(singleForecast / 1e6).toFixed(2)} млн клеток</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">С лота ({activeContainers.length} конт.)</p>
                    <p className="font-medium text-lg">{(totalForecast / 1e6).toFixed(2)} млн клеток</p>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* ==================== CONTAINERS SECTION ==================== */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg">
              Контейнеры{" "}
              <span className="text-muted-foreground font-normal text-base">
                ({containers.length})
              </span>
            </CardTitle>

            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <span className="text-sm text-muted-foreground">
                  Выбрано: {selectedIds.size}
                </span>
              )}
              <Button variant="outline" size="sm" onClick={selectAll}>
                <CheckSquare className="mr-1.5 h-4 w-4" />
                {allSelected ? "Снять все" : "Выбрать все"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {containers.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Контейнеры отсутствуют
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {containers.map((c) => {
                const confluent = c.confluent_percent ?? 0
                const isSelected = selectedIds.has(c.id)
                const isDisposed = (c.container_status || c.status) === 'DISPOSE'
                const positionPath =
                  c.position?.equipment?.name && c.position?.path
                    ? `${c.position.equipment.name} / ${c.position.path}`
                    : c.position?.path || null

                return (
                  <div
                    key={c.id}
                    className={`
                      relative rounded-lg border p-4 transition-all
                      ${isDisposed ? "opacity-50 cursor-not-allowed bg-muted/50" : "cursor-pointer"}
                      ${
                        isSelected && !isDisposed
                          ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                          : !isDisposed ? "hover:border-muted-foreground/30 hover:shadow-sm" : ""
                      }
                    `}
                    onClick={() => !isDisposed && toggleSelect(c.id)}
                  >
                    {/* Checkbox */}
                    <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(c.id)}
                      />
                    </div>

                    {/* Code + type */}
                    <div className="pr-6">
                      <p className="font-mono font-semibold text-sm truncate">
                        {c.code}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {c.container_type?.name || c.type?.name || "Контейнер"}
                      </p>
                    </div>

                    <Separator className="my-2.5" />

                    {/* Confluence */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-1">
                        <div
                          className={`h-2.5 w-2.5 rounded-full ${confluenceBg(confluent)}`}
                        />
                        <span className="text-xs text-muted-foreground">
                          Конфлюэнтность
                        </span>
                      </div>
                      <span
                        className={`text-sm font-semibold ${confluenceColor(confluent)}`}
                      >
                        {confluent}%
                      </span>
                    </div>

                    {/* Morphology */}
                    {c.morphology && (
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">
                          Морфология
                        </span>
                        <span className="text-xs font-medium">
                          {c.morphology}
                        </span>
                      </div>
                    )}

                    {/* Contamination */}
                    {c.contaminated && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span className="text-xs font-semibold">
                          Контаминация!
                        </span>
                      </div>
                    )}

                    {/* Position */}
                    {positionPath && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        <span className="text-xs truncate">{positionPath}</span>
                      </div>
                    )}

                    {/* Status badge */}
                    <div className="mt-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          CONTAINER_STATUS_VARIANT[c.container_status || c.status] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {CONTAINER_STATUS_LABEL[c.container_status || c.status] || c.container_status || c.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ==================== OPERATIONS HISTORY ==================== */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            История операций{" "}
            <span className="text-muted-foreground font-normal text-base">
              ({operations.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {operations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              Операции отсутствуют
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Viability</TableHead>
                  <TableHead>Конц-ция</TableHead>
                  <TableHead>Примечания</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.map((op) => {
                  const metrics = (op.operation_metrics as any[])?.[0]
                  return (
                  <TableRow key={op.id}>
                    <TableCell className="text-sm whitespace-nowrap">
                      {fmtDateTime(op.started_at || op.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          OP_TYPE_VARIANT[op.type] ||
                          "bg-gray-100 text-gray-800"
                        }
                      >
                        {OP_TYPE_LABEL[op.type] || op.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {metrics?.viability_percent != null ? `${metrics.viability_percent}%` : "\u2014"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {metrics?.concentration != null ? `${metrics.concentration.toLocaleString('ru-RU')}` : "\u2014"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {op.notes || "\u2014"}
                    </TableCell>
                  </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
