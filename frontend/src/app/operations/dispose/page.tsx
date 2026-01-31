"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createOperationDispose } from "@/lib/api"

interface DisposePageProps {
  targetType: 'container' | 'batch' | 'ready_medium'
  targetId: string
  targetCode: string
  targetName?: string
}

const DISPOSE_REASONS = [
  { value: "expired", label: "Истёк срок годности" },
  { value: "contamination", label: "Контаминация" },
  { value: "low_quality", label: "Низкое качество" },
  { value: "protocol_complete", label: "Протокол завершён" },
  { value: "damaged", label: "Повреждён" },
  { value: "other", label: "Другое" },
]

export default function DisposePage({ targetType, targetId, targetCode, targetName }: DisposePageProps) {
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const targetLabel = {
    container: "контейнер",
    batch: "партию",
    ready_medium: "готовую среду"
  }
  
  const label = targetLabel[targetType] || "объект"

  const handleSubmit = async () => {
    if (!reason) {
      setError("Выберите причину утилизации")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createOperationDispose({
        target_type: targetType,
        target_id: targetId,
        reason,
        notes
      })

      setSuccess(true)
      
      // Редирект через 2 секунды
      setTimeout(() => {
        router.push("/inventory")
        router.refresh()
      }, 2000)
    } catch (err: any) {
      setError(err.message || "Ошибка при утилизации")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="container mx-auto py-6 max-w-2xl">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Утилизация выполнена</h2>
            <p className="text-muted-foreground text-center">
              {targetCode} успешно утилизирован
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Утилизация</h1>
          <p className="text-muted-foreground">
            {targetCode} {targetName && `- ${targetName}`}
          </p>
        </div>
      </div>

      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Это действие нельзя отменить. {label.charAt(0).toUpperCase() + label.slice(1)} будет помечен как утилизированный и не сможет использоваться в операциях.
        </AlertDescription>
      </Alert>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Причина утилизации</CardTitle>
          <CardDescription>
            Укажите причину утилизации {label}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Причина *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Выберите причину" />
              </SelectTrigger>
              <SelectContent>
                {DISPOSE_REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Примечания</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация..."
              className="mt-1"
            />
          </div>

          <div className="flex gap-4 justify-end pt-4">
            <Button variant="outline" onClick={() => router.back()}>
              Отмена
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSubmit} 
              disabled={isSubmitting || !reason}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isSubmitting ? "Утилизация..." : "Утилизировать"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
