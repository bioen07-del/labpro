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
  PowerOff,
  Power,
  Trash2,
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

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"

import { getEquipmentById, updateEquipment, getMonitoringParams, getEquipmentLogs, createEquipmentLog, deactivateEquipment, activateEquipment, deleteEquipment } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { EquipmentMonitoringParam, EquipmentLog } from "@/types"

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
  const [monitoringParams, setMonitoringParams] = useState<EquipmentMonitoringParam[]>([])
  const [logs, setLogs] = useState<EquipmentLog[]>([])
  const [showLogDialog, setShowLogDialog] = useState(false)
  const [logValues, setLogValues] = useState<Record<string, string>>({})
  const [logNotes, setLogNotes] = useState('')
  const [savingLog, setSavingLog] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getEquipmentById(id)
      setEquipment(data)

      // Load monitoring params and logs
      const params = await getMonitoringParams(id)
      setMonitoringParams(params || [])

      if (params && params.length > 0) {
        const logData = await getEquipmentLogs(id, 50)
        setLogs(logData || [])
      }
    } catch (err: any) {
      const msg = err?.message || "Ошибка загрузки оборудования"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeactivate() {
    try {
      if (equipment.is_active === false) {
        await activateEquipment(id)
        toast.success('Оборудование активировано')
      } else {
        await deactivateEquipment(id)
        toast.success('Оборудование деактивировано')
      }
      loadData()
    } catch (err) {
      console.error(err)
      toast.error('Ошибка при изменении статуса')
    }
  }

  async function handleDelete() {
    try {
      await deleteEquipment(id)
      toast.success('Оборудование удалено')
      router.push('/equipment')
    } catch (err: any) {
      console.error(err)
      if (err?.message?.includes('foreign key') || err?.code === '23503') {
        toast.error('Нельзя удалить — есть связанные записи. Деактивируйте вместо удаления.')
      } else {
        toast.error('Ошибка при удалении')
      }
      setConfirmDelete(false)
    }
  }

  async function handleSaveLog() {
    setSavingLog(true)
    try {
      const logData: Record<string, any> = { notes: logNotes || undefined }
      for (const param of monitoringParams) {
        const val = logValues[param.param_key]
        if (val !== undefined && val !== '') {
          logData[param.param_key] = Number(val)
        }
      }
      await createEquipmentLog(id, logData)
      toast.success('Показатели сохранены')
      setShowLogDialog(false)
      setLogValues({})
      setLogNotes('')
      // Reload logs
      const freshLogs = await getEquipmentLogs(id, 50)
      setLogs(freshLogs || [])
    } catch (err: any) {
      toast.error(err?.message || 'Ошибка сохранения')
    } finally {
      setSavingLog(false)
    }
  }

  function isOutOfRange(param: EquipmentMonitoringParam, value: number | null | undefined): boolean {
    if (value == null) return false
    if (param.min_value != null && value < param.min_value) return true
    if (param.max_value != null && value > param.max_value) return true
    return false
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
  const topLevelPositions = positions.filter((p: any) => !p.parent_id)
  const getChildren = (parentId: string) => positions.filter((p: any) => p.parent_id === parentId)

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
              {equipment.is_active === false && (
                <Badge variant="outline" className="text-gray-500 border-gray-400">Деактивировано</Badge>
              )}
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
          <Button
            variant={equipment.is_active === false ? "default" : "outline"}
            onClick={handleDeactivate}
          >
            {equipment.is_active === false ? (
              <><Power className="mr-2 h-4 w-4" />Активировать</>
            ) : (
              <><PowerOff className="mr-2 h-4 w-4" />Деактивировать</>
            )}
          </Button>
          <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Удалить
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
      {/* MONITORING SECTION                                                */}
      {/* ================================================================= */}
      {monitoringParams.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Thermometer className="h-4 w-4" />
              Мониторинг
            </CardTitle>
            <Button size="sm" onClick={() => {
              setLogValues({})
              setLogNotes('')
              setShowLogDialog(true)
            }}>
              Внести показатели
            </Button>
          </CardHeader>
          <CardContent>
            {/* Configured params */}
            <div className="flex flex-wrap gap-3 mb-4">
              {monitoringParams.map(p => (
                <Badge key={p.param_key} variant="outline" className="text-sm px-3 py-1">
                  {p.param_label} ({p.unit})
                  {p.min_value != null || p.max_value != null ? (
                    <span className="ml-1 text-muted-foreground">
                      [{p.min_value ?? '…'} — {p.max_value ?? '…'}]
                    </span>
                  ) : null}
                </Badge>
              ))}
            </div>

            {/* Logs table */}
            {logs.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">Нет записей мониторинга</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Дата/время</TableHead>
                      {monitoringParams.map(p => (
                        <TableHead key={p.param_key}>{p.param_label} ({p.unit})</TableHead>
                      ))}
                      <TableHead>Примечание</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm whitespace-nowrap">
                          {log.logged_at ? new Date(log.logged_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                        </TableCell>
                        {monitoringParams.map(p => {
                          const val = (log as any)[p.param_key] as number | null
                          const outOfRange = isOutOfRange(p, val)
                          return (
                            <TableCell key={p.param_key} className={outOfRange ? 'text-red-600 font-bold' : ''}>
                              {val != null ? val : '-'}
                              {outOfRange && ' ⚠'}
                            </TableCell>
                          )
                        })}
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{log.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Log Dialog */}
      <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Внести показатели мониторинга</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {monitoringParams.map(p => (
              <div key={p.param_key} className="flex items-center gap-4">
                <Label className="min-w-[140px]">{p.param_label} ({p.unit})</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={logValues[p.param_key] || ''}
                  onChange={(e) => setLogValues(prev => ({ ...prev, [p.param_key]: e.target.value }))}
                  placeholder={p.min_value != null && p.max_value != null ? `${p.min_value} — ${p.max_value}` : ''}
                />
              </div>
            ))}
            <div>
              <Label>Примечание</Label>
              <Input value={logNotes} onChange={(e) => setLogNotes(e.target.value)} placeholder="Дополнительная информация" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLogDialog(false)}>Отмена</Button>
            <Button onClick={handleSaveLog} disabled={savingLog}>
              {savingLog ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
            <div className="space-y-2">
              {topLevelPositions.map((pos: any) => {
                const children = getChildren(pos.id)
                return (
                  <div key={pos.id}>
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${pos.is_active === false ? 'opacity-50 bg-muted/50' : 'bg-background'}`}>
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-mono text-sm font-medium flex-1">{pos.path || '---'}</span>
                      {children.length > 0 && (
                        <span className="text-xs text-muted-foreground">{children.filter((c: any) => c.is_active !== false).length} мест</span>
                      )}
                      {pos.qr_code && <span className="text-xs text-muted-foreground">QR: {pos.qr_code}</span>}
                      {pos.is_active === false ? (
                        <Badge variant="secondary" className="text-xs">Неактивна</Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Активна</Badge>
                      )}
                    </div>
                    {children.length > 0 && (
                      <div className="ml-8 mt-1 space-y-1">
                        {children.map((child: any) => (
                          <div key={child.id} className={`flex items-center gap-3 px-3 py-1.5 rounded-md border border-dashed ${child.is_active === false ? 'opacity-50 bg-muted/50' : 'bg-muted/30'}`}>
                            <div className="w-3 h-3 border-l-2 border-b-2 border-muted-foreground/30 shrink-0" />
                            <span className="font-mono text-sm flex-1">{child.path || '---'}</span>
                            {child.qr_code && <span className="text-xs text-muted-foreground">QR: {child.qr_code}</span>}
                            {child.is_active === false ? (
                              <Badge variant="secondary" className="text-xs">Неактивна</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Активна</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader>
              <CardTitle className="text-destructive">Удалить оборудование?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">
                Вы уверены, что хотите удалить <strong>{equipment.name}</strong>?
                Все позиции будут удалены. Действие необратимо.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                  Отмена
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Удалить
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
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
