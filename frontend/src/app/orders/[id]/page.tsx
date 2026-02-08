"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  ClipboardList,
  Calendar,
  User,
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
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { getOrderById } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { Order, OrderItem } from "@/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORDER_TYPE_LABELS: Record<string, string> = {
  STANDARD: "Стандартный",
  URGENT: "Срочный",
  RESEARCH: "Исследовательский",
}

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "Низкий",
  NORMAL: "Обычный",
  HIGH: "Высокий",
  URGENT: "Срочный",
}

function orderTypeBadge(type: string) {
  if (type === "URGENT") {
    return (
      <Badge variant="outline" className="border-red-300 text-red-700">
        {ORDER_TYPE_LABELS[type] ?? type}
      </Badge>
    )
  }
  if (type === "RESEARCH") {
    return (
      <Badge variant="outline" className="border-purple-300 text-purple-700">
        {ORDER_TYPE_LABELS[type] ?? type}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="border-blue-300 text-blue-700">
      {ORDER_TYPE_LABELS[type] ?? type}
    </Badge>
  )
}

function orderStatusBadge(status: string) {
  switch (status) {
    case "NEW":
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          Новый
        </Badge>
      )
    case "IN_PROGRESS":
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
          В работе
        </Badge>
      )
    case "COMPLETED":
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          Завершён
        </Badge>
      )
    case "CANCELLED":
      return <Badge variant="destructive">Отменён</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function priorityBadge(priority: string | undefined | null) {
  if (!priority) return <span className="text-sm text-muted-foreground">---</span>
  switch (priority) {
    case "URGENT":
      return (
        <Badge variant="destructive">
          {PRIORITY_LABELS[priority]}
        </Badge>
      )
    case "HIGH":
      return (
        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
          {PRIORITY_LABELS[priority]}
        </Badge>
      )
    case "NORMAL":
      return (
        <Badge variant="secondary">
          {PRIORITY_LABELS[priority]}
        </Badge>
      )
    case "LOW":
      return (
        <Badge variant="outline">
          {PRIORITY_LABELS[priority]}
        </Badge>
      )
    default:
      return <Badge variant="outline">{priority}</Badge>
  }
}

function orderItemStatusBadge(status: string) {
  switch (status) {
    case "PENDING":
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
          Ожидает
        </Badge>
      )
    case "RESERVED":
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          Зарезервировано
        </Badge>
      )
    case "ISSUED":
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          Выдано
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<(Order & Record<string, any>) | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getOrderById(id)
      setOrder(data as Order & Record<string, any>)
    } catch (err: any) {
      const msg = err?.message || "Ошибка загрузки заказа"
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
  if (error || !order) {
    return (
      <div className="container py-10 space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{error || "Заказ не найден"}</span>
        </div>
        <Button variant="outline" asChild>
          <Link href="/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            К списку заказов
          </Link>
        </Button>
      </div>
    )
  }

  const items: OrderItem[] = order.items ?? []

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="container py-6 space-y-6">
      {/* ================================================================= */}
      {/* HEADER                                                            */}
      {/* ================================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/orders">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">
                {order.order_number}
              </span>
              {orderStatusBadge(order.status)}
              {orderTypeBadge(order.order_type)}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              Заказ {order.order_number}
            </h1>
          </div>
        </div>

        <Button variant="outline" asChild>
          <Link href="/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            К списку заказов
          </Link>
        </Button>
      </div>

      {/* ================================================================= */}
      {/* ORDER INFO                                                        */}
      {/* ================================================================= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Информация о заказе
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <InfoRow
              label="Номер заказа"
              value={order.order_number}
            />
            <InfoRow
              label="Заказчик"
              value={order.customer_name || "---"}
            />
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">
                Тип заказа
              </dt>
              <dd>{orderTypeBadge(order.order_type)}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">
                Статус
              </dt>
              <dd>{orderStatusBadge(order.status)}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">
                Приоритет
              </dt>
              <dd>{priorityBadge((order as any).priority)}</dd>
            </div>
            <InfoRow
              label="Срок выполнения"
              value={order.deadline ? formatDate(order.deadline) : "Не указан"}
            />
            <InfoRow
              label="Дата создания"
              value={formatDate(order.created_at)}
            />
            {order.cells_quantity_mln != null && (
              <InfoRow
                label="Количество клеток (млн)"
                value={String(order.cells_quantity_mln)}
              />
            )}
          </div>

          {order.notes && (
            <>
              <Separator className="my-4" />
              <div className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground">
                  Примечания
                </dt>
                <dd className="text-sm whitespace-pre-wrap">{order.notes}</dd>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ================================================================= */}
      {/* CULTURE TYPE                                                      */}
      {/* ================================================================= */}
      {order.culture_type && (
        <Card>
          <CardHeader>
            <CardTitle>Тип культуры</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <InfoRow
                label="Название"
                value={order.culture_type.name}
              />
              <InfoRow
                label="Код"
                value={order.culture_type.code || "---"}
              />
              {order.culture_type.description && (
                <div className="sm:col-span-2 space-y-1">
                  <dt className="text-sm font-medium text-muted-foreground">
                    Описание
                  </dt>
                  <dd className="text-sm">{order.culture_type.description}</dd>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* BANK INFO (if available from Supabase join)                       */}
      {/* ================================================================= */}
      {(order as any).bank && (
        <Card>
          <CardHeader>
            <CardTitle>Банк</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              <InfoRow
                label="ID банка"
                value={(order as any).bank.id}
              />
              <InfoRow
                label="Тип банка"
                value={(order as any).bank.bank_type || "---"}
              />
              <InfoRow
                label="Статус банка"
                value={(order as any).bank.status || "---"}
              />
              {(order as any).bank.freezing_date && (
                <InfoRow
                  label="Дата заморозки"
                  value={formatDate((order as any).bank.freezing_date)}
                />
              )}
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/banks/${(order as any).bank.id}`}>
                  Открыть банк
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ================================================================= */}
      {/* ORDER ITEMS                                                       */}
      {/* ================================================================= */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Позиции заказа ({items.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Банк</TableHead>
                    <TableHead>Криовиал</TableHead>
                    <TableHead className="text-right">Количество</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Дата создания</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.bank ? (
                          <Link
                            href={`/banks/${item.bank_id}`}
                            className="font-medium hover:underline"
                          >
                            {item.bank.bank_type} ({item.bank_id?.slice(0, 8)}...)
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">---</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.cryo_vial ? (
                          <span className="font-mono text-sm">
                            {(item.cryo_vial as any).code ?? item.cryo_vial_id?.slice(0, 8)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">---</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.quantity}
                      </TableCell>
                      <TableCell>{orderItemStatusBadge(item.status)}</TableCell>
                      <TableCell>{formatDate(item.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small info-row component for the 2-column grid
// ---------------------------------------------------------------------------
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}
