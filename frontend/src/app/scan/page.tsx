"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Camera,
  Search,
  QrCode,
  Package,
  FlaskConical,
  Thermometer,
  ArrowRight,
  X,
  Loader2,
  Beaker,
  Database,
  Smartphone,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "sonner"
import {
  parseQRCode,
  getContainerByQR,
  getEquipmentByQR,
  getCultureByQR,
  getLotByQR,
  getBankByQR,
  getReadyMediumByQR,
  getPositionByQR,
} from "@/lib/api"

// ---------------------------------------------------------------------------
// Type map: parsed type -> label, icon, Tailwind color
// ---------------------------------------------------------------------------
const ENTITY_META: Record<
  string,
  { label: string; icon: React.ElementType; color: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }
> = {
  container:    { label: "Контейнер",       icon: Package,       color: "bg-blue-500",    badgeVariant: "default" },
  equipment:    { label: "Оборудование",    icon: Thermometer,   color: "bg-orange-500",  badgeVariant: "default" },
  culture:      { label: "Культура",        icon: Beaker,        color: "bg-cyan-500",    badgeVariant: "default" },
  lot:          { label: "Партия",          icon: Package,       color: "bg-amber-500",   badgeVariant: "default" },
  bank:         { label: "Банк",            icon: Database,      color: "bg-indigo-500",  badgeVariant: "default" },
  ready_medium: { label: "Готовая среда",   icon: FlaskConical,  color: "bg-purple-500",  badgeVariant: "default" },
  position:     { label: "Позиция",         icon: Thermometer,   color: "bg-green-500",   badgeVariant: "default" },
  unknown:      { label: "Неизвестный тип", icon: QrCode,        color: "bg-gray-400",    badgeVariant: "secondary" },
}

// ---------------------------------------------------------------------------
// Navigation helpers
// ---------------------------------------------------------------------------
function getEntityRoute(type: string, entity: Record<string, unknown>): string | null {
  switch (type) {
    case "container":
      return entity.id ? `/containers/${entity.id}` : null
    case "equipment":
      return entity.id ? `/equipment/${entity.id}` : "/equipment"
    case "culture":
      return entity.id ? `/cultures/${entity.id}` : null
    case "lot":
      return entity.id ? `/lots/${entity.id}` : null
    case "bank":
      return entity.id ? `/banks/${entity.id}` : null
    case "ready_medium":
      return "/ready-media"
    case "position":
      return "/equipment"
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Lookup dispatcher — calls the right getXxxByQR based on parsed type
// ---------------------------------------------------------------------------
async function lookupEntity(
  type: string,
  value: string
): Promise<Record<string, unknown> | null> {
  try {
    switch (type) {
      case "container":
        return await getContainerByQR(value)
      case "equipment":
        return await getEquipmentByQR(value)
      case "culture":
        return await getCultureByQR(value)
      case "lot":
        return await getLotByQR(value)
      case "bank":
        return await getBankByQR(value)
      case "ready_medium":
        return await getReadyMediumByQR(value)
      case "position":
        return await getPositionByQR(value)
      default:
        return null
    }
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Entity preview card content
// ---------------------------------------------------------------------------
function EntityPreview({
  type,
  entity,
}: {
  type: string
  entity: Record<string, unknown>
}) {
  const rows: { label: string; value: React.ReactNode }[] = []

  switch (type) {
    case "container": {
      rows.push({ label: "Код", value: (entity.code ?? entity.qr_code ?? "—") as string })
      rows.push({
        label: "Статус",
        value: <Badge variant="outline">{(entity.status as string) ?? "—"}</Badge>,
      })
      const lot = entity.lot as Record<string, unknown> | undefined
      const culture = lot?.culture as Record<string, unknown> | undefined
      if (culture?.name) {
        rows.push({ label: "Культура", value: culture.name as string })
      }
      break
    }
    case "equipment": {
      rows.push({ label: "Название", value: (entity.name ?? "—") as string })
      rows.push({ label: "Тип", value: (entity.type ?? "—") as string })
      if (entity.current_temperature !== undefined && entity.current_temperature !== null) {
        rows.push({ label: "Температура", value: `${entity.current_temperature}°C` })
      }
      break
    }
    case "culture": {
      rows.push({ label: "Название", value: (entity.name ?? "—") as string })
      const ctype = entity.culture_type as Record<string, unknown> | undefined
      if (ctype?.name) {
        rows.push({ label: "Тип культуры", value: ctype.name as string })
      }
      rows.push({
        label: "Статус",
        value: <Badge variant="outline">{(entity.status as string) ?? "—"}</Badge>,
      })
      if (entity.current_passage !== undefined && entity.current_passage !== null) {
        rows.push({ label: "Пассаж", value: String(entity.current_passage) })
      }
      break
    }
    case "lot": {
      rows.push({ label: "Номер партии", value: (entity.lot_number ?? "—") as string })
      rows.push({
        label: "Статус",
        value: <Badge variant="outline">{(entity.status as string) ?? "—"}</Badge>,
      })
      const culture = entity.culture as Record<string, unknown> | undefined
      if (culture?.name) {
        rows.push({ label: "Культура", value: culture.name as string })
      }
      const containers = entity.containers as unknown[] | undefined
      if (containers) {
        rows.push({ label: "Контейнеров", value: String(containers.length) })
      }
      break
    }
    case "bank": {
      rows.push({ label: "Код банка", value: (entity.code ?? "—") as string })
      rows.push({
        label: "Статус",
        value: <Badge variant="outline">{(entity.status as string) ?? "—"}</Badge>,
      })
      const culture = entity.culture as Record<string, unknown> | undefined
      if (culture?.name) {
        rows.push({ label: "Культура", value: culture.name as string })
      }
      const vials = entity.cryo_vials as unknown[] | undefined
      if (vials) {
        rows.push({ label: "Криовиалов", value: String(vials.length) })
      }
      rows.push({
        label: "QC",
        value: (
          <Badge variant={entity.qc_passed ? "default" : "secondary"}>
            {entity.qc_passed ? "Пройден" : "Не пройден"}
          </Badge>
        ),
      })
      break
    }
    case "ready_medium": {
      rows.push({ label: "Название", value: (entity.name ?? "—") as string })
      rows.push({ label: "Код", value: (entity.code ?? "—") as string })
      if (entity.volume_ml !== undefined) {
        rows.push({ label: "Объём", value: `${entity.volume_ml} мл` })
      }
      break
    }
    case "position": {
      rows.push({ label: "Путь", value: (entity.path ?? "—") as string })
      const eq = entity.equipment as Record<string, unknown> | undefined
      if (eq?.name) {
        rows.push({ label: "Оборудование", value: eq.name as string })
      }
      if (entity.qr_code) {
        rows.push({ label: "QR-код", value: (entity.qr_code as string) })
      }
      break
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((r, i) => (
        <div key={i}>
          <p className="text-xs text-muted-foreground">{r.label}</p>
          <div className="mt-0.5 font-medium text-sm">{r.value}</div>
        </div>
      ))}
    </div>
  )
}

// ===========================================================================
// MAIN PAGE COMPONENT
// ===========================================================================
export default function ScanPage() {
  const router = useRouter()

  // --- state ---
  const [qrInput, setQrInput] = useState("")
  const [parsedType, setParsedType] = useState<string | null>(null)
  const [parsedValue, setParsedValue] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [entity, setEntity] = useState<Record<string, unknown> | null>(null)
  const [entityType, setEntityType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Auto-parse on input change
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const trimmed = qrInput.trim()
    if (!trimmed) {
      setParsedType(null)
      setParsedValue(null)
      return
    }
    const parsed = parseQRCode(trimmed)
    if (parsed) {
      setParsedType(parsed.type)
      setParsedValue(parsed.value)
    } else {
      setParsedType("unknown")
      setParsedValue(trimmed)
    }
  }, [qrInput])

  // ---------------------------------------------------------------------------
  // Lookup handler
  // ---------------------------------------------------------------------------
  const handleLookup = useCallback(async () => {
    if (!parsedType || !parsedValue) return
    if (parsedType === "unknown") {
      setError("Неизвестный формат QR-кода. Поддерживаемые префиксы: CNT:, EQP:, CULT:, POS:, RM:, BK:")
      setEntity(null)
      setEntityType(null)
      return
    }

    setLoading(true)
    setError(null)
    setEntity(null)
    setEntityType(null)

    try {
      const result = await lookupEntity(parsedType, parsedValue)
      if (result) {
        setEntity(result)
        setEntityType(parsedType)
        toast.success(`${ENTITY_META[parsedType]?.label ?? "Объект"} найден`)
      } else {
        setError(`Объект не найден по коду: ${parsedValue}`)
      }
    } catch {
      setError("Ошибка при поиске объекта. Попробуйте ещё раз.")
    } finally {
      setLoading(false)
    }
  }, [parsedType, parsedValue])

  // ---------------------------------------------------------------------------
  // Navigate to entity
  // ---------------------------------------------------------------------------
  const handleNavigate = useCallback(() => {
    if (!entity || !entityType) return
    const route = getEntityRoute(entityType, entity)
    if (route) {
      router.push(route)
    } else {
      toast.error("Невозможно перейти к объекту")
    }
  }, [entity, entityType, router])

  // ---------------------------------------------------------------------------
  // Clear all
  // ---------------------------------------------------------------------------
  const handleClear = useCallback(() => {
    setQrInput("")
    setParsedType(null)
    setParsedValue(null)
    setEntity(null)
    setEntityType(null)
    setError(null)
  }, [])

  // ---------------------------------------------------------------------------
  // Resolve meta for the current parsed type
  // ---------------------------------------------------------------------------
  const meta = parsedType ? ENTITY_META[parsedType] ?? ENTITY_META.unknown : null
  const MetaIcon = meta?.icon ?? QrCode

  // ===========================================================================
  // RENDER
  // ===========================================================================
  return (
    <div className="container mx-auto max-w-2xl py-8 px-4 space-y-6">
      {/* ---------- Header ---------- */}
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">QR Сканер</h1>
        <p className="text-sm text-muted-foreground">
          Введите или вставьте QR-код для быстрого поиска объекта
        </p>
      </div>

      {/* ---------- Camera placeholder ---------- */}
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-10 gap-3 text-center">
          <div className="rounded-full bg-muted p-4">
            <Camera className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Сканирование QR доступно в PWA
          </p>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
            <Smartphone className="h-3.5 w-3.5" />
            <span>Камера работает в PWA-версии приложения</span>
          </div>
        </CardContent>
      </Card>

      {/* ---------- Manual input ---------- */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Ручной ввод кода
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="CNT:CT-0001-L1-P2-FL-003"
                value={qrInput}
                onChange={(e) => {
                  setQrInput(e.target.value)
                  // Reset results on new input
                  setEntity(null)
                  setEntityType(null)
                  setError(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleLookup()
                  }
                }}
                className="pr-8"
              />
              {qrInput && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              onClick={handleLookup}
              disabled={!parsedType || parsedType === "unknown" || loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Найти
            </Button>
          </div>

          {/* Parsed type badge */}
          {parsedType && qrInput.trim() && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Тип:</span>
              <Badge variant={meta?.badgeVariant ?? "secondary"} className="gap-1">
                <MetaIcon className="h-3 w-3" />
                {meta?.label ?? parsedType}
              </Badge>
              {parsedValue && parsedType !== "unknown" && (
                <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                  {parsedValue}
                </span>
              )}
            </div>
          )}

          {/* Supported formats hint */}
          <p className="text-xs text-muted-foreground">
            Форматы: <code className="text-[11px]">CNT:</code> контейнер,{" "}
            <code className="text-[11px]">EQP:</code> оборудование,{" "}
            <code className="text-[11px]">CULT:</code> культура,{" "}
            <code className="text-[11px]">POS:</code> позиция,{" "}
            <code className="text-[11px]">RM:</code> готовая среда,{" "}
            <code className="text-[11px]">BK:</code> банк
          </p>
        </CardContent>
      </Card>

      {/* ---------- Error ---------- */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* ---------- Result preview card ---------- */}
      {entity && entityType && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center justify-center rounded-lg p-2 ${
                    ENTITY_META[entityType]?.color ?? "bg-gray-500"
                  }`}
                >
                  {(() => {
                    const Icon = ENTITY_META[entityType]?.icon ?? QrCode
                    return <Icon className="h-5 w-5 text-white" />
                  })()}
                </div>
                <CardTitle className="text-base">
                  {ENTITY_META[entityType]?.label ?? "Объект"}
                </CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClear}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <EntityPreview type={entityType} entity={entity} />

            <Button className="w-full" onClick={handleNavigate}>
              Перейти
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
