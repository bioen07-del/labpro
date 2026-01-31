"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { 
  ArrowLeft, 
  Eye, 
  RefreshCw, 
  Trash2, 
  MapPin, 
  Thermometer,
  AlertTriangle,
  CheckCircle2
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { getContainerById } from "@/lib/api"

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500",
  DISPOSE: "bg-red-500",
  IN_BANK: "bg-blue-500",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активен",
  DISPOSE: "Утилизирован",
  IN_BANK: "В банке",
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

export default function ContainerDetailPage() {
  const router = useRouter()
  const params = useParams()
  const containerId = params.id as string

  const [container, setContainer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getContainerById(containerId)
        setContainer(data)
      } catch (err: any) {
        setError(err.message || "Ошибка загрузки данных")
      } finally {
        setLoading(false)
      }
    }
    
    if (containerId) {
      loadData()
    }
  }, [containerId])

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !container) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center text-red-600">
            {error || "Контейнер не найден"}
          </CardContent>
        </Card>
      </div>
    )
  }

  const lot = container.lot
  const culture = lot?.culture
  const position = container.position
  const bank = container.bank

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{container.code}</h1>
            <Badge className={STATUS_COLORS[container.status] || "bg-gray-500"}>
              {STATUS_LABELS[container.status] || container.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {container.type?.name || "Тип контейнера не указан"}
          </p>
        </div>
      </div>

      {/* Contamination Alert */}
      {container.contaminated && (
        <Alert className="mb-6 border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <CardTitle className="text-red-600 ml-2">Контаминация!</CardTitle>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle>Текущее состояние</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Конфлюэнтность</p>
                <div className="flex items-center gap-3">
                  <Progress value={container.confluent_percent || 0} className="flex-1 h-3" />
                  <span className="font-semibold text-lg">{container.confluent_percent || 0}%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Морфология</p>
                <p className="font-semibold">
                  {MORPHOLOGY_LABELS[container.morphology] || container.morphology || "—"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Контаминация</p>
                <div className="flex items-center gap-2">
                  {container.contaminated ? (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="font-semibold text-red-600">Да</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-semibold text-green-600">Нет</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Position Card */}
        <Card>
          <CardHeader>
            <CardTitle>Размещение</CardTitle>
          </CardHeader>
          <CardContent>
            {position ? (
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">{position.path}</p>
                  {position.equipment && (
                    <p className="text-sm text-muted-foreground">
                      {position.equipment.name} — {position.equipment.location}
                    </p>
                  )}
                  {position.equipment?.temperature && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Thermometer className="h-3 w-3" />
                      {position.equipment.temperature}°C
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Позиция не указана</p>
            )}
          </CardContent>
        </Card>

        {/* Hierarchy */}
        <Card>
          <CardHeader>
            <CardTitle>Принадлежность</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-semibold">
                  К
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Культура</p>
                  {culture ? (
                    <Link href={`/cultures/${culture.id}`} className="font-medium hover:underline">
                      {culture.name}
                    </Link>
                  ) : (
                    <p className="font-medium">—</p>
                  )}
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                  Л
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Лот</p>
                  {lot ? (
                    <Link href={`/lots/${lot.id}`} className="font-medium hover:underline">
                      L{lot.passage_number} (P{lot.passage_number})
                    </Link>
                  ) : (
                    <p className="font-medium">—</p>
                  )}
                </div>
              </div>

              {bank && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-semibold">
                      Б
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Банк</p>
                      <Link href={`/banks/${bank.id}`} className="font-medium hover:underline">
                        {bank.bank_type} — {bank.code}
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Действия</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Link href={`/operations/observe?container_id=${containerId}`}>
                <Button variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  Осмотр
                </Button>
              </Link>
              
              {container.status === "ACTIVE" && (
                <>
                  <Link href={`/operations/new?container_id=${containerId}&type=passage`}>
                    <Button variant="outline">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Пассаж
                    </Button>
                  </Link>
                  
                  <Separator orientation="vertical" className="h-8" />
                  
                  <Link href={`/operations/dispose?type=container&id=${containerId}`}>
                    <Button variant="outline" className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Утилизировать
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Создан</p>
                  <p className="font-medium">
                    {container.created_at 
                      ? new Date(container.created_at).toLocaleDateString("ru-RU")
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Размещён</p>
                  <p className="font-medium">
                    {container.placed_at 
                      ? new Date(container.placed_at).toLocaleDateString("ru-RU")
                      : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Площадь</p>
                  <p className="font-medium">{container.type?.surface_area_cm2 || "—"} см²</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Объём</p>
                  <p className="font-medium">{container.type?.volume_ml || "—"} мл</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
