"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  RefreshCw,
  Trash2,
  MapPin,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  FlaskConical,
  Layers,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { QRLabel } from "@/components/qr-label"
import { Separator } from "@/components/ui/separator"
import { getContainerById } from "@/lib/api"
import { formatDate } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Status maps
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; variant: string; className: string }> = {
  IN_CULTURE: {
    label: "В культуре",
    variant: "default",
    className: "bg-green-600 hover:bg-green-600 text-white",
  },
  IN_BANK: {
    label: "В банке",
    variant: "default",
    className: "bg-blue-600 hover:bg-blue-600 text-white",
  },
  DISPOSE: {
    label: "Утилизирован",
    variant: "destructive",
    className: "bg-red-600 hover:bg-red-600 text-white",
  },
  ISSUED: {
    label: "Выдан",
    variant: "secondary",
    className: "bg-gray-500 hover:bg-gray-500 text-white",
  },
  QUARANTINE: {
    label: "Карантин",
    variant: "default",
    className: "bg-yellow-500 hover:bg-yellow-500 text-white",
  },
}

const MORPHOLOGY_LABELS: Record<string, string> = {
  spindle: "Веретенообразная",
  cobblestone: "Булыжная",
  fibroblast: "Фибробластная",
  epithelial: "Эпителиальная",
  mixed: "Смешанная",
  rounded: "Округлая",
  degenerate: "Дегенеративная",
}

// ---------------------------------------------------------------------------
// Confluence color helper
// ---------------------------------------------------------------------------

function getConfluenceColor(percent: number): string {
  if (percent >= 80) return "bg-green-500"
  if (percent >= 50) return "bg-yellow-500"
  return "bg-blue-500"
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ContainerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [container, setContainer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getContainerById(id)
        setContainer(data)
      } catch (err: any) {
        const msg = err?.message || "Ошибка загрузки контейнера"
        setError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }

    if (id) loadData()
  }, [id])

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="container mx-auto max-w-3xl py-8 space-y-4">
        <div className="h-8 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  // ---- Error / not found ----
  if (error || !container) {
    return (
      <div className="container mx-auto max-w-3xl py-8">
        <Card className="border-red-300 bg-red-50">
          <CardContent className="py-10 text-center text-red-600">
            {error || "Контейнер не найден"}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ---- Derived data ----
  const lot = container.lot as any | null
  const culture = lot?.culture as any | null
  const containerType = container.container_type as any | null
  const position = container.position as any | null
  const equipment = position?.equipment as any | null

  const statusCfg = STATUS_CONFIG[container.status] ?? {
    label: container.status,
    variant: "outline",
    className: "",
  }

  const confluencePercent = container.confluent_percent ?? 0

  return (
    <div className="container mx-auto max-w-3xl py-8 space-y-6">
      {/* ================================================================
          HEADER
          ================================================================ */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {container.code}
            </h1>
            <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
          </div>
        </div>
      </div>

      {/* ================================================================
          CONTAMINATION ALERT
          ================================================================ */}
      {container.contaminated && (
        <Card className="border-red-400 bg-red-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <span className="font-semibold text-red-700">
              Контаминация обнаружена!
            </span>
          </CardContent>
        </Card>
      )}

      {/* QR Label */}
      <QRLabel
        code={`CNT:${container.code}`}
        title={container.code}
        subtitle={container.container_type?.name}
        metadata={{
          'Пассаж': `P${container.passage_number ?? 0}`,
          'Статус': statusCfg.label,
        }}
      />

      {/* ================================================================
          OWNERSHIP (Culture + Lot links)
          ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />
            Принадлежность
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Культура</span>
            {culture ? (
              <Link
                href={`/cultures/${culture.id}`}
                className="font-medium text-primary hover:underline"
              >
                {culture.name}
              </Link>
            ) : (
              <span className="text-muted-foreground">--</span>
            )}
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Лот</span>
            {lot ? (
              <Link
                href={`/lots/${lot.id}`}
                className="font-medium text-primary hover:underline"
              >
                {lot.lot_number} (P{lot.passage_number})
              </Link>
            ) : (
              <span className="text-muted-foreground">--</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ================================================================
          INFO GRID
          ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4" />
            Информация
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Тип контейнера */}
            <InfoRow
              label="Тип контейнера"
              value={containerType?.name ?? "--"}
            />

            {/* Площадь роста */}
            {containerType?.surface_area_cm2 != null && (
              <InfoRow
                label="Площадь роста"
                value={`${containerType.surface_area_cm2} см\u00B2`}
              />
            )}

            {/* Дата создания */}
            <InfoRow
              label="Дата создания"
              value={container.created_at ? formatDate(container.created_at) : "--"}
              icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
            />

            {/* Пассаж */}
            <InfoRow
              label="Пассаж"
              value={
                container.passage_number != null
                  ? `P${container.passage_number}`
                  : "--"
              }
            />

            {/* Морфология */}
            <InfoRow
              label="Морфология"
              value={
                container.morphology
                  ? MORPHOLOGY_LABELS[container.morphology] ?? container.morphology
                  : "--"
              }
            />

            {/* Контаминация */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Контаминация</p>
              <div className="flex items-center gap-1.5">
                {container.contaminated ? (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="font-medium text-red-600">Да</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-green-600">Нет</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Confluency bar -- full width */}
          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Конфлюэнтность</p>
              <span className="text-sm font-semibold">{confluencePercent}%</span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`absolute left-0 top-0 h-full rounded-full transition-all ${getConfluenceColor(confluencePercent)}`}
                style={{ width: `${Math.min(confluencePercent, 100)}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ================================================================
          CURRENT LOCATION
          ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Текущее размещение
          </CardTitle>
        </CardHeader>
        <CardContent>
          {position ? (
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-100 p-2.5">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  {equipment && (
                    <p className="font-semibold">{equipment.name}</p>
                  )}
                  <p className="text-sm text-muted-foreground">{position.path}</p>
                  {equipment?.type && (
                    <p className="mt-1 text-xs text-muted-foreground">{equipment.type}</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Позиция не назначена</p>
          )}
        </CardContent>
      </Card>

      {/* ================================================================
          ACTION BUTTONS
          ================================================================ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Действия</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {/* Navigate to culture */}
            {culture && (
              <Link href={`/cultures/${culture.id}`}>
                <Button variant="outline">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Перейти к культуре
                </Button>
              </Link>
            )}

            {/* Navigate to lot */}
            {lot && (
              <Link href={`/lots/${lot.id}`}>
                <Button variant="outline">
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Перейти к лоту
                </Button>
              </Link>
            )}

            <Separator orientation="vertical" className="h-9 hidden sm:block" />

            {/* Observe */}
            <Link href={`/operations/observe?container_id=${id}`}>
              <Button variant="outline">
                <Eye className="mr-2 h-4 w-4" />
                Осмотр
              </Button>
            </Link>

            {/* Passage */}
            {container.status === "IN_CULTURE" && (
              <Link href={`/operations/passage?container_id=${id}`}>
                <Button variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Пассаж
                </Button>
              </Link>
            )}

            {/* Dispose */}
            {container.status === "IN_CULTURE" && (
              <Link href={`/operations/dispose?type=container&id=${id}`}>
                <Button variant="outline" className="text-red-600 hover:text-red-700">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Утилизировать
                </Button>
              </Link>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helper: simple label/value row
// ---------------------------------------------------------------------------
function InfoRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="flex items-center gap-1.5 font-medium">
        {icon}
        {value}
      </p>
    </div>
  )
}
