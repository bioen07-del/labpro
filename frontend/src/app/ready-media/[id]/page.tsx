"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

import { getReadyMediumById } from "@/lib/api"
import { formatDate } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Status configuration
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  AVAILABLE: {
    label: "Доступна",
    className: "bg-green-600 hover:bg-green-600 text-white",
  },
  ACTIVE: {
    label: "Активна",
    className: "bg-green-600 hover:bg-green-600 text-white",
  },
  IN_USE: {
    label: "В использовании",
    className: "bg-blue-600 hover:bg-blue-600 text-white",
  },
  EXPIRED: {
    label: "Просрочена",
    className: "bg-red-600 hover:bg-red-600 text-white",
  },
  DEPLETED: {
    label: "Израсходована",
    className: "bg-gray-500 hover:bg-gray-500 text-white",
  },
  PREPARED: {
    label: "Приготовлена",
    className: "bg-blue-500 hover:bg-blue-500 text-white",
  },
  DISPOSE: {
    label: "Утилизирована",
    className: "bg-gray-500 hover:bg-gray-500 text-white",
  },
}

// ---------------------------------------------------------------------------
// Info row helper
// ---------------------------------------------------------------------------

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ReadyMediumDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [medium, setMedium] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getReadyMediumById(id)
        setMedium(data)
      } catch (err: any) {
        const msg = err?.message || "Ошибка загрузки рабочей среды"
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
      <div className="container py-10 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ---- Error / not found ----
  if (error || !medium) {
    return (
      <div className="container py-10 space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">
            {error || "Рабочая среда не найдена"}
          </span>
        </div>
        <Button variant="outline" asChild>
          <Link href="/ready-media">
            <ArrowLeft className="mr-2 h-4 w-4" />
            К списку готовых сред
          </Link>
        </Button>
      </div>
    )
  }

  // ---- Derived data ----
  const position = medium.storage_position as any | null
  const equipment = position?.equipment as any | null

  const statusCfg = STATUS_CONFIG[medium.status] ?? {
    label: medium.status,
    className: "bg-gray-400 hover:bg-gray-400 text-white",
  }

  const positionDisplay = position
    ? [equipment?.name, position.path].filter(Boolean).join(" / ") ||
      position.id
    : "Не указана"

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="container mx-auto max-w-3xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/ready-media">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {medium.code}
            </h1>
            <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
          </div>
          {medium.name && (
            <p className="text-muted-foreground mt-1">{medium.name}</p>
          )}
        </div>
      </div>

      {/* Main info card */}
      <Card>
        <CardHeader>
          <CardTitle>Информация о рабочей среде</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <InfoRow label="Код" value={medium.code || "---"} />
            <InfoRow label="Название / состав" value={medium.name || "---"} />
            <InfoRow
              label="Объём (мл)"
              value={
                medium.volume_ml != null ? `${medium.volume_ml} мл` : "---"
              }
            />
            <InfoRow
              label="Текущий объём (мл)"
              value={
                medium.current_volume_ml != null
                  ? `${medium.current_volume_ml} мл`
                  : "---"
              }
            />
            <InfoRow
              label="Дата приготовления"
              value={
                medium.prepared_at
                  ? formatDate(medium.prepared_at)
                  : medium.created_at
                    ? formatDate(medium.created_at)
                    : "---"
              }
            />
            <InfoRow
              label="Срок годности"
              value={
                medium.expiration_date
                  ? formatDate(medium.expiration_date)
                  : "---"
              }
            />
            <InfoRow
              label="Статус"
              value={statusCfg.label}
            />
            <InfoRow
              label="Позиция хранения"
              value={positionDisplay}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notes card */}
      <Card>
        <CardHeader>
          <CardTitle>Примечания</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap">
            {medium.notes || "Нет примечаний"}
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-4">
        <Button variant="outline" asChild>
          <Link href="/ready-media">
            <ArrowLeft className="mr-2 h-4 w-4" />
            К списку готовых сред
          </Link>
        </Button>
      </div>
    </div>
  )
}
