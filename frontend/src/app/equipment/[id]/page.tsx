"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Settings,
  MapPin,
  Calendar,
  Thermometer,
  Hash,
  Building2,
  FileText,
  Pencil,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { getEquipmentById, updateEquipment } from "@/lib/api"
import { formatDate } from "@/lib/utils"

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  ACTIVE: {
    label: "Активно",
    className: "bg-green-100 text-green-700 hover:bg-green-100",
  },
  MAINTENANCE: {
    label: "На обслуживании",
    className: "bg-yellow-100 text-yellow-700 hover:bg-yellow-100",
  },
  DECOMMISSIONED: {
    label: "Списано",
    className: "",
  },
}

function statusBadge(status: string) {
  const cfg = STATUS_CONFIG[status]
  if (!cfg) return <Badge variant="outline">{status}</Badge>
  if (status === "DECOMMISSIONED") {
    return <Badge variant="secondary">{cfg.label}</Badge>
  }
  return <Badge className={cfg.className}>{cfg.label}</Badge>
}

// ---------------------------------------------------------------------------
// Equipment type helpers
// ---------------------------------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  INCUBATOR: "Инкубатор",
  LAMINAR: "Ламинарный шкаф",
  CENTRIFUGE: "Центрифуга",
  MICROSCOPE: "Микроскоп",
  FREEZER: "Морозильник",
  FRIDGE: "Холодильник",
  OTHER: "Другое",
}

function typeLabel(type: string | null | undefined): string {
  if (!type) return "---"
  return TYPE_LABELS[type] ?? type
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [equipment, setEquipment] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getEquipmentById(id)
      setEquipment(data)
    } catch (err: any) {
      const msg = err?.message || "Ошибка загрузки оборудования"
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
  if (error || !equipment) {
    return (
      <div className="container py-10 space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{error || "Оборудование не найдено"}</span>
        </div>
        <Button variant="outline" asChild>
          <Link href="/equipment">
            <ArrowLeft className="mr-2 h-4 w-4" />
            К списку оборудования
          </Link>
        </Button>
      </div>
    )
  }

  // ---- Derived data --------------------------------------------------------
  const positions: any[] = equipment.positions ?? []

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="container py-6 space-y-6 max-w-3xl mx-auto">
      {/* ================================================================= */}
      {/* HEADER                                                            */}
      {/* ================================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/equipment">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {equipment.name}
              </h1>
              {statusBadge(equipment.status)}
            </div>
            {equipment.code && (
              <p className="text-sm text-muted-foreground font-mono">
                {equipment.code}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/equipment/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Редактировать
            </Link>
          </Button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* EQUIPMENT INFO                                                    */}
      {/* ================================================================= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4" />
            Информация об оборудовании
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <InfoRow label="Название" value={equipment.name || "---"} />
            <InfoRow label="Тип" value={typeLabel(equipment.type)} />
            <InfoRow label="Модель" value={equipment.model || "---"} />
            <InfoRow label="Серийный номер" value={equipment.serial_number || "---"} />
            <InfoRow label="Инвентарный номер" value={equipment.inventory_number || "---"} icon={<Hash className="h-3.5 w-3.5 text-muted-foreground" />} />
            <InfoRow
              label="Расположение"
              value={equipment.location || "---"}
              icon={<MapPin className="h-3.5 w-3.5 text-muted-foreground" />}
            />
            <InfoRow
              label="Статус"
              value=""
              badge={statusBadge(equipment.status)}
            />
            <InfoRow
              label="Дата валидации"
              value={equipment.validation_date ? formatDate(equipment.validation_date) : "---"}
              icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
            />
            <InfoRow
              label="Следующая валидация"
              value={equipment.next_validation ? formatDate(equipment.next_validation) : "---"}
              icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
            />
            <InfoRow
              label="Последнее ТО"
              value={equipment.last_maintenance ? formatDate(equipment.last_maintenance) : "---"}
              icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
            />
            <InfoRow
              label="Следующее ТО"
              value={equipment.next_maintenance ? formatDate(equipment.next_maintenance) : "---"}
              icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
            />
          </div>

          {equipment.notes && (
            <div className="mt-4 pt-4 border-t space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">Примечания</dt>
              <dd className="text-sm whitespace-pre-wrap">{equipment.notes}</dd>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================= */}
      {/* POSITIONS TABLE                                                   */}
      {/* ================================================================= */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MapPin className="h-4 w-4" />
            Позиции ({positions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              Нет привязанных позиций
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Путь</TableHead>
                    <TableHead>QR-код</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions.map((pos: any) => (
                    <TableRow key={pos.id}>
                      <TableCell className="font-mono text-sm">
                        {pos.path || "---"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {pos.qr_code || "---"}
                      </TableCell>
                      <TableCell>
                        {pos.is_active === false ? (
                          <Badge variant="secondary">Неактивна</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                            Активна
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// InfoRow helper (matches project pattern from donors/[id], containers/[id])
// ---------------------------------------------------------------------------

function InfoRow({
  label,
  value,
  icon,
  badge,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm flex items-center gap-1.5">
        {icon}
        {badge ?? <span className="font-medium">{value}</span>}
      </dd>
    </div>
  )
}
