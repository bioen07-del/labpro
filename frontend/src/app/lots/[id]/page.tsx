"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { 
  ArrowLeft, 
  Eye, 
  Utensils, 
  RefreshCw, 
  Snowflake, 
  Thermometer, 
  Trash2, 
  Plus,
  MapPin,
  Calendar,
  Activity,
  FlaskConical
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { getLotById, getContainersByLot } from "@/lib/api"

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-500",
  DISPOSE: "bg-red-500",
  CLOSED: "bg-gray-500",
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Активен",
  DISPOSE: "Утилизирован",
  CLOSED: "Закрыт",
}

export default function LotDetailPage() {
  const router = useRouter()
  const params = useParams()
  const lotId = params.id as string

  const [lot, setLot] = useState<any>(null)
  const [containers, setContainers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const [lotData, containersData] = await Promise.all([
          getLotById(lotId),
          getContainersByLot(lotId)
        ])
        setLot(lotData)
        setContainers(containersData || [])
      } catch (err: any) {
        setError(err.message || "Ошибка загрузки данных")
      } finally {
        setLoading(false)
      }
    }
    
    if (lotId) {
      loadData()
    }
  }, [lotId])

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !lot) {
    return (
      <div className="container mx-auto py-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-8 text-center text-red-600">
            {error || "Лот не найден"}
          </CardContent>
        </Card>
      </div>
    )
  }

  const culture = lot.culture
  const activeContainers = containers.filter(c => c.container_status === "IN_CULTURE")
  const avgConfluent = activeContainers.length > 0
    ? Math.round(activeContainers.reduce((sum, c) => sum + (c.confluent_percent || 0), 0) / activeContainers.length)
    : 0

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.push("/cultures")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{lot.code || `L${lot.passage_number}`}</h1>
            <Badge className={STATUS_COLORS[lot.status] || "bg-gray-500"}>
              {STATUS_LABELS[lot.status] || lot.status}
            </Badge>
          </div>
          {culture && (
            <p className="text-muted-foreground">
              {culture.name || culture.culture_type?.name}
            </p>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FlaskConical className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Контейнеры</p>
                <p className="text-2xl font-bold">{containers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Активны</p>
                <p className="text-2xl font-bold">{activeContainers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Конфлюэнтность</p>
                <p className="text-2xl font-bold">{avgConfluent}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <RefreshCw className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Пассаж</p>
                <p className="text-2xl font-bold">P{lot.passage_number}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Link href={`/operations/observe?lot_id=${lotId}`}>
          <Button variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            Осмотр
          </Button>
        </Link>
        <Link href={`/operations/new?lot_id=${lotId}&type=feed`}>
          <Button variant="outline">
            <Utensils className="mr-2 h-4 w-4" />
            Подкормка
          </Button>
        </Link>
        <Link href={`/operations/new?lot_id=${lotId}&type=passage`}>
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Пассаж
          </Button>
        </Link>
        <Link href={`/operations/new?lot_id=${lotId}&type=freeze`}>
          <Button variant="outline">
            <Snowflake className="mr-2 h-4 w-4" />
            Заморозка
          </Button>
        </Link>
        <Link href={`/operations/new?lot_id=${lotId}&type=thaw`}>
          <Button variant="outline">
            <Thermometer className="mr-2 h-4 w-4" />
            Разморозка
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-8 mx-2" />
        <Link href={`/operations/dispose?type=lot&id=${lotId}`}>
          <Button variant="outline" className="text-red-600">
            <Trash2 className="mr-2 h-4 w-4" />
            Утилизировать
          </Button>
        </Link>
      </div>

      {/* Info & Containers */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Lot Info */}
        <Card>
          <CardHeader>
            <CardTitle>Информация о лоте</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Культура</p>
              <p className="font-medium">{culture?.name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Тип культуры</p>
              <p className="font-medium">{culture?.culture_type?.name || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Пассаж</p>
              <p className="font-medium">P{lot.passage_number}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Дата создания</p>
              <p className="font-medium">
                {lot.created_at ? new Date(lot.created_at).toLocaleDateString("ru-RU") : "—"}
              </p>
            </div>
            {lot.parent_lot_id && (
              <div>
                <p className="text-sm text-muted-foreground">Родительский лот</p>
                <p className="font-medium">L{lot.passage_number - 1}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Containers */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Контейнеры</CardTitle>
              <Link href={`/operations/new?lot_id=${lotId}&type=passage`}>
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {containers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Контейнеры не добавлены
              </div>
            ) : (
              <div className="space-y-3">
                {containers.map(container => (
                  <div
                    key={container.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs font-medium">
                        {container.type?.name?.substring(0, 2) || "CT"}
                      </div>
                      <div>
                        <p className="font-medium">{container.code}</p>
                        {container.position && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {container.position.path}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <Progress value={container.confluent_percent || 0} className="w-20 h-2" />
                          <span className="text-sm">{container.confluent_percent || 0}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{container.morphology}</p>
                      </div>
                      <Badge className={STATUS_COLORS[container.container_status]}>
                        {STATUS_LABELS[container.container_status] || container.container_status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Прогресс культивирования</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span>Конфлюэнтность (цель: 85%)</span>
              <span>{avgConfluent}%</span>
            </div>
            <Progress value={avgConfluent} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>85%</span>
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
