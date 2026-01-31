"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Save, AlertCircle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createOperationObserve } from "@/lib/api"

interface Container {
  id: string
  code: string
  type: { name: string }
  position?: { path: string }
  confluent_percent?: number
  morphology?: string
  contaminated?: boolean
}

interface ObserveFormProps {
  lotId: string
  lotCode: string
  cultureName: string
  containers: Container[]
}

export default function ObservePage({ lotId, lotCode, cultureName, containers }: ObserveFormProps) {
  const router = useRouter()
  const [selectedContainers, setSelectedContainers] = useState<string[]>([])
  const [observations, setObservations] = useState<Record<string, {
    confluent_percent: number
    morphology: string
    contaminated: boolean
    notes: string
  }>>({})
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleContainer = (id: string) => {
    setSelectedContainers(prev => 
      prev.includes(id) 
        ? prev.filter(c => c !== id)
        : [...prev, id]
    )
    
    // Инициализировать наблюдение для контейнера
    if (!observations[id]) {
      setObservations(prev => ({
        ...prev,
        [id]: {
          confluent_percent: observations[id]?.confluent_percent || 70,
          morphology: observations[id]?.morphology || "spindle",
          contaminated: false,
          notes: ""
        }
      }))
    }
  }

  const updateObservation = (id: string, field: string, value: any) => {
    setObservations(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }))
  }

  const handleSubmit = async () => {
    if (selectedContainers.length === 0) {
      setError("Выберите хотя бы один контейнер для осмотра")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const containersData = selectedContainers.map(id => ({
        container_id: id,
        confluent_percent: observations[id]?.confluent_percent || 70,
        morphology: observations[id]?.morphology || "spindle",
        contaminated: observations[id]?.contaminated || false
      }))

      await createOperationObserve({
        lot_id: lotId,
        containers: containersData,
        notes
      })

      router.push(`/lots/${lotId}`)
    } catch (err: any) {
      setError(err.message || "Ошибка при сохранении осмотра")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Осмотр — {lotCode}</h1>
          <p className="text-muted-foreground">{cultureName}</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* Выбор контейнеров */}
        <Card>
          <CardHeader>
            <CardTitle>Выберите контейнеры для осмотра</CardTitle>
            <CardDescription>
              Отметьте контейнеры, которые нужно осмотреть
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {containers.map(container => (
                <div
                  key={container.id}
                  onClick={() => toggleContainer(container.id)}
                  className={`
                    relative p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${selectedContainers.includes(container.id)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"}
                  `}
                >
                  {selectedContainers.includes(container.id) && (
                    <CheckCircle2 className="absolute top-2 right-2 h-5 w-5 text-primary" />
                  )}
                  <div className="font-medium">{container.code}</div>
                  <div className="text-sm text-muted-foreground">
                    {container.type.name}
                  </div>
                  {container.position && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {container.position.path}
                    </div>
                  )}
                  {container.confluent_percent !== undefined && (
                    <Badge variant="outline" className="mt-2">
                      Конфлюэнтность: {container.confluent_percent}%
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Форма наблюдений для выбранных контейнеров */}
        {selectedContainers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Наблюдения</CardTitle>
              <CardDescription>
                Укажите параметры для каждого выбранного контейнера
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedContainers.map(id => {
                const container = containers.find(c => c.id === id)
                const obs = observations[id] || { confluent_percent: 70, morphology: "spindle", contaminated: false, notes: "" }
                
                return (
                  <div key={id} className="p-4 rounded-lg border bg-muted/30">
                    <div className="font-medium mb-4">{container?.code}</div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <Label>Конфлюэнтность (%)</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={obs.confluent_percent}
                          onChange={(e) => updateObservation(id, "confluent_percent", parseInt(e.target.value) || 0)}
                          className="mt-1"
                        />
                        <div className="text-xs text-muted-foreground mt-1">
                          Оптимально: 70-90%
                        </div>
                      </div>
                      
                      <div>
                        <Label>Морфология</Label>
                        <Select
                          value={obs.morphology}
                          onValueChange={(value) => updateObservation(id, "morphology", value)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="spindle">Веретенообразная (Spindle)</SelectItem>
                            <SelectItem value="cobblestone">Булыжная (Cobblestone)</SelectItem>
                            <SelectItem value="fibroblast">Фибробластная (Fibroblast)</SelectItem>
                            <SelectItem value="epithelial">Эпителиальная (Epithelial)</SelectItem>
                            <SelectItem value="mixed">Смешанная (Mixed)</SelectItem>
                            <SelectItem value="rounded">Округлая (Rounded)</SelectItem>
                            <SelectItem value="degenerate">Дегенеративная (Degenerate)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Контаминация</Label>
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            variant={obs.contaminated ? "destructive" : "outline"}
                            size="sm"
                            onClick={() => updateObservation(id, "contaminated", true)}
                          >
                            Да
                          </Button>
                          <Button
                            type="button"
                            variant={!obs.contaminated ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateObservation(id, "contaminated", false)}
                          >
                            Нет
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Label>Примечания</Label>
                      <Textarea
                        value={obs.notes}
                        onChange={(e) => updateObservation(id, "notes", e.target.value)}
                        placeholder="Дополнительные наблюдения..."
                        className="mt-1"
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {/* Общие примечания */}
        <Card>
          <CardHeader>
            <CardTitle>Общие примечания</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Общие замечания по осмотру..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Кнопки действий */}
        <div className="flex gap-4 justify-end">
          <Button variant="outline" onClick={() => router.back()}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedContainers.length === 0}>
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? "Сохранение..." : "Сохранить осмотр"}
          </Button>
        </div>
      </div>
    </div>
  )
}
