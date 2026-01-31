"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Search, 
  FlaskConical, 
  Thermometer, 
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getReadyMedia, activateReadyMedium, disposeReadyMedium } from "@/lib/api"
import { format, differenceInDays } from "date-fns"
import { ru } from "date-fns/locale"

const STATUS_COLORS: Record<string, string> = {
  QUARANTINE: "bg-yellow-500",
  ACTIVE: "bg-green-500",
  EXPIRED: "bg-red-500",
  DISPOSE: "bg-gray-500",
}

const STATUS_LABELS: Record<string, string> = {
  QUARANTINE: "Карантин",
  ACTIVE: "Активна",
  EXPIRED: "Просрочена",
  DISPOSE: "Утилизирована",
}

const STERILIZATION_LABELS: Record<string, string> = {
  FILTRATION: "Фильтрация",
  AUTOCLAVE: "Автоклавирование",
}

export default function ReadyMediaPage() {
  const router = useRouter()
  const [media, setMedia] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")

  useEffect(() => {
    loadMedia()
  }, [])

  const loadMedia = async () => {
    try {
      const data = await getReadyMedia()
      setMedia(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async (id: string) => {
    try {
      await activateReadyMedium(id)
      loadMedia()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDispose = async (id: string) => {
    if (!confirm("Вы уверены, что хотите утилизировать эту среду?")) return
    
    try {
      await disposeReadyMedium(id)
      loadMedia()
    } catch (err) {
      console.error(err)
    }
  }

  const getDaysUntilExpiry = (date: string) => {
    return differenceInDays(new Date(date), new Date())
  }

  const filteredMedia = media.filter(item => {
    const matchesFilter = filter === "all" || item.status === filter
    const matchesSearch = !search || 
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.code?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const quarantineMedia = filteredMedia.filter(m => m.status === "QUARANTINE")
  const activeMedia = filteredMedia.filter(m => m.status === "ACTIVE")
  const expiredMedia = filteredMedia.filter(m => m.status === "EXPIRED")

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Готовые среды</h1>
          <p className="text-muted-foreground">Учёт приготовленных питательных сред</p>
        </div>
        <Button onClick={() => router.push("/ready-media/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Новая среда
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Карантин</p>
                <p className="text-2xl font-bold">{quarantineMedia.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Активны</p>
                <p className="text-2xl font-bold">{activeMedia.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Просрочено</p>
                <p className="text-2xl font-bold">{expiredMedia.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FlaskConical className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Всего</p>
                <p className="text-2xl font-bold">{filteredMedia.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по названию или коду..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="QUARANTINE">Карантин</TabsTrigger>
            <TabsTrigger value="ACTIVE">Активны</TabsTrigger>
            <TabsTrigger value="EXPIRED">Просрочено</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Media List */}
      <div className="space-y-4">
        {filteredMedia.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Среды не найдены
            </CardContent>
          </Card>
        ) : (
          filteredMedia.map(item => {
            const daysLeft = getDaysUntilExpiry(item.expiration_date)
            const isCritical = daysLeft <= 7 && daysLeft > 0
            
            return (
              <Card key={item.id} className="hover:bg-muted/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <FlaskConical className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{item.name}</p>
                          <Badge className={STATUS_COLORS[item.status]}>
                            {STATUS_LABELS[item.status]}
                          </Badge>
                          {isCritical && (
                            <Badge variant="destructive">Истекает</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                          <span>Код: {item.code}</span>
                          <span>Объём: {item.volume_ml} мл</span>
                          <span>Стерилизация: {STERILIZATION_LABELS[item.sterilization_method]}</span>
                        </div>
                        {item.storage_position && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                            <Thermometer className="h-3 w-3" />
                            {item.storage_position.path}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className={isCritical ? "text-red-600 font-semibold" : ""}>
                          Срок: {format(new Date(item.expiration_date), "dd MMM yyyy", { locale: ru })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {daysLeft > 0 ? `Осталось ${daysLeft} дней` : daysLeft === 0 ? "Истекает сегодня" : `Просрочено на ${Math.abs(daysLeft)} дней`}
                      </p>
                      <div className="flex gap-2 mt-3">
                        {item.status === "QUARANTINE" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleActivate(item.id)}
                          >
                            Активировать
                          </Button>
                        )}
                        {item.status !== "DISPOSE" && item.status !== "EXPIRED" && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-red-600"
                            onClick={() => handleDispose(item.id)}
                          >
                            Утилизировать
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
