"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  FlaskConical,
  Package,
  TestTubes,
  BarChart3,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { getOperationById } from "@/lib/api"
import { formatDate } from "@/lib/utils"

const OPERATION_TYPE_LABELS: Record<string, string> = {
  OBSERVE: "Осмотр",
  FEED: "Подкормка",
  PASSAGE: "Пассаж",
  FREEZE: "Заморозка",
  THAW: "Размораживание",
  DISPOSE: "Утилизация",
}

function statusBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Завершена</Badge>
    case "IN_PROGRESS":
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">В работе</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function OperationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [loading, setLoading] = useState(true)
  const [operation, setOperation] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getOperationById(id)
      setOperation(data)
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки операции")
      toast.error("Не удалось загрузить данные операции")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !operation) {
    return (
      <div className="container py-10 space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{error || "Операция не найдена"}</span>
        </div>
        <Button variant="outline" asChild>
          <Link href="/operations">
            <ArrowLeft className="mr-2 h-4 w-4" />
            К списку операций
          </Link>
        </Button>
      </div>
    )
  }

  const containers = operation.operation_containers ?? []
  const media = operation.operation_media ?? []
  const metrics = Array.isArray(operation.operation_metrics)
    ? operation.operation_metrics[0]
    : operation.operation_metrics

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/operations">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Badge variant="outline">
                {OPERATION_TYPE_LABELS[operation.type] || operation.type}
              </Badge>
              {statusBadge(operation.status)}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {OPERATION_TYPE_LABELS[operation.type] || operation.type}
            </h1>
            {operation.lot?.culture && (
              <p className="text-sm text-muted-foreground">
                Культура:{" "}
                <Link href={`/cultures/${operation.lot.culture.id}`} className="underline">
                  {operation.lot.culture.name}
                </Link>
                {" | "}
                Лот: {operation.lot.lot_number}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* General Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5" />
                Информация
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <InfoRow label="Тип" value={OPERATION_TYPE_LABELS[operation.type] || operation.type} />
                <InfoRow label="Статус" value={operation.status} />
                <InfoRow label="Начало" value={operation.started_at ? formatDate(operation.started_at) : "---"} />
                <InfoRow label="Завершение" value={operation.completed_at ? formatDate(operation.completed_at) : "---"} />
                <InfoRow label="Лот" value={operation.lot?.lot_number ?? "---"} />
                <InfoRow label="Культура" value={operation.lot?.culture?.name ?? "---"} />
              </div>
              {operation.notes && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-1">Примечания</p>
                  <p className="text-sm whitespace-pre-wrap">{operation.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Containers */}
          {containers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Контейнеры ({containers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Код</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Конфлюенция</TableHead>
                      <TableHead>Морфология</TableHead>
                      <TableHead>Контаминация</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {containers.map((oc: any) => (
                      <TableRow key={oc.id}>
                        <TableCell>
                          <Link href={`/containers/${oc.container?.id}`} className="font-mono text-sm underline">
                            {oc.container?.code ?? "---"}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={oc.role === "SOURCE" ? "outline" : "default"}>
                            {oc.role === "SOURCE" ? "Источник" : "Целевой"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {oc.confluent_percent != null ? `${oc.confluent_percent}%` : "---"}
                        </TableCell>
                        <TableCell>{oc.morphology ?? "---"}</TableCell>
                        <TableCell>
                          {oc.contaminated ? (
                            <Badge variant="destructive">Да</Badge>
                          ) : (
                            <span className="text-muted-foreground">Нет</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Media */}
          {media.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TestTubes className="h-5 w-5" />
                  Использованные среды ({media.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Среда / Партия</TableHead>
                      <TableHead>Объём (мл)</TableHead>
                      <TableHead>Назначение</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {media.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-sm">
                          {m.ready_medium?.name ?? m.batch?.batch_number ?? "---"}
                        </TableCell>
                        <TableCell>{m.quantity_ml ?? "---"}</TableCell>
                        <TableCell>{m.purpose ?? "---"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar — Metrics */}
        <div className="space-y-6">
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Метрики
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {metrics.concentration != null && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Концентрация</span>
                    <span className="font-mono text-sm">{metrics.concentration.toLocaleString()} кл/мл</span>
                  </div>
                )}
                {metrics.viability_percent != null && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Жизнеспособность</span>
                    <span className="font-mono text-sm">{metrics.viability_percent}%</span>
                  </div>
                )}
                {metrics.total_cells != null && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Всего клеток</span>
                    <span className="font-mono text-sm">{metrics.total_cells.toLocaleString()}</span>
                  </div>
                )}
                {metrics.volume_ml != null && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Объём</span>
                    <span className="font-mono text-sm">{metrics.volume_ml} мл</span>
                  </div>
                )}
                {metrics.passage_yield != null && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Выход пассажа</span>
                    <span className="font-mono text-sm">{metrics.passage_yield}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Параметры</CardTitle>
            </CardHeader>
            <CardContent>
              {operation.parameters && Object.keys(operation.parameters).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(operation.parameters).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-sm text-muted-foreground">{key}</span>
                      <span className="text-sm font-mono">{String(value)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Нет дополнительных параметров</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}
