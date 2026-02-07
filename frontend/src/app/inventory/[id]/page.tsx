"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2, AlertCircle, AlertTriangle, Package } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table"

import { getBatchById } from "@/lib/api"
import { formatDate, daysUntilExpiration, getExpirationWarningLevel } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: string) {
  switch (status) {
    case "AVAILABLE":
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          В наличии
        </Badge>
      )
    case "RESERVED":
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          Зарезервировано
        </Badge>
      )
    case "EXPIRED":
      return <Badge variant="destructive">Просрочено</Badge>
    case "DEPLETED":
      return <Badge variant="secondary">Израсходовано</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function ExpirationWarning({ expirationDate }: { expirationDate: string | null }) {
  if (!expirationDate) return null

  const daysLeft = daysUntilExpiration(expirationDate)
  if (daysLeft === null) return null

  const level = getExpirationWarningLevel(daysLeft)

  if (level === "critical") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {daysLeft < 0
          ? `Срок годности истёк ${Math.abs(daysLeft)} дн. назад`
          : daysLeft === 0
            ? "Срок годности истекает сегодня"
            : `Срок годности истекает через ${daysLeft} дн.`}
      </div>
    )
  }

  if (level === "warning") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-700">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Срок годности истекает через {daysLeft} дн.
      </div>
    )
  }

  return null
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function BatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [loading, setLoading] = useState(true)
  const [batch, setBatch] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBatch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadBatch() {
    setLoading(true)
    try {
      const data = await getBatchById(id)
      setBatch(data)
    } catch (err: any) {
      const msg = err?.message || "Ошибка загрузки данных партии"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // ---- Loading state -------------------------------------------------------
  if (loading) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ---- Error state ---------------------------------------------------------
  if (error || !batch) {
    return (
      <div className="container py-10 space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{error || "Партия не найдена"}</span>
        </div>
        <Button variant="outline" asChild>
          <Link href="/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" />
            К списку инвентаря
          </Link>
        </Button>
      </div>
    )
  }

  // =========================================================================
  // RENDER
  // =========================================================================
  const nomenclatureName =
    batch.nomenclature?.name || "Номенклатура не указана"

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/inventory">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">
                {batch.batch_number || batch.id?.slice(0, 8)}
              </span>
              {statusBadge(batch.status)}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {nomenclatureName}
            </h1>
          </div>
        </div>
      </div>

      {/* Expiration warning */}
      <ExpirationWarning expirationDate={batch.expiration_date} />

      {/* Batch details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Информация о партии
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground w-[200px]">
                  Номер партии
                </TableCell>
                <TableCell>{batch.batch_number || "---"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Номенклатура
                </TableCell>
                <TableCell>{nomenclatureName}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Количество
                </TableCell>
                <TableCell>
                  {batch.quantity != null ? batch.quantity : "---"}{" "}
                  {batch.unit || ""}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Единица измерения
                </TableCell>
                <TableCell>{batch.unit || "---"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Статус
                </TableCell>
                <TableCell>{statusBadge(batch.status)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Срок годности
                </TableCell>
                <TableCell>
                  {batch.expiration_date ? (
                    <div className="flex items-center gap-2">
                      <span>{formatDate(batch.expiration_date)}</span>
                      {(() => {
                        const daysLeft = daysUntilExpiration(batch.expiration_date)
                        if (daysLeft !== null && daysLeft > 0) {
                          return (
                            <Badge variant="outline" className="text-xs">
                              {daysLeft} дн.
                            </Badge>
                          )
                        }
                        return null
                      })()}
                    </div>
                  ) : (
                    "---"
                  )}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Поставщик
                </TableCell>
                <TableCell>{batch.supplier || "---"}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium text-muted-foreground">
                  Примечания
                </TableCell>
                <TableCell>{batch.notes || "---"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Back button */}
      <div>
        <Button variant="outline" asChild>
          <Link href="/inventory">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к инвентарю
          </Link>
        </Button>
      </div>
    </div>
  )
}
