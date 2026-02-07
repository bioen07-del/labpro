"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { createReadyMedium, getBatches } from "@/lib/api"

export default function NewReadyMediumPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [batches, setBatches] = useState<any[]>([])
  const [batchesLoading, setBatchesLoading] = useState(true)

  const [formData, setFormData] = useState({
    name: "",
    batch_id: "",
    volume_ml: "",
    preparation_date: new Date().toISOString().split("T")[0],
    expiration_date: "",
    storage_position_id: "",
    notes: "",
  })

  useEffect(() => {
    loadBatches()
  }, [])

  async function loadBatches() {
    setBatchesLoading(true)
    try {
      const data = await getBatches({ status: "AVAILABLE" })
      setBatches(data || [])
    } catch (err) {
      console.error("Error loading batches:", err)
      toast.error("Ошибка загрузки партий")
    } finally {
      setBatchesLoading(false)
    }
  }

  // Filter batches to only show those whose nomenclature category is "medium"
  const mediumBatches = batches.filter(
    (b) =>
      b.nomenclature?.category === "medium" ||
      b.nomenclature?.category === "MEDIUM"
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const batch = mediumBatches.find((b) => b.id === formData.batch_id)

      await createReadyMedium({
        name: formData.name,
        batch_id: formData.batch_id || null,
        nomenclature_id: batch?.nomenclature_id || null,
        volume_ml: formData.volume_ml ? parseFloat(formData.volume_ml) : 0,
        current_volume_ml: formData.volume_ml
          ? parseFloat(formData.volume_ml)
          : 0,
        prepared_at: formData.preparation_date || null,
        expiration_date: formData.expiration_date || null,
        storage_position_id: formData.storage_position_id || null,
        notes: formData.notes || null,
        status: "ACTIVE",
      })

      toast.success("Рабочая среда создана")
      router.push("/ready-media")
    } catch (err) {
      console.error("Error creating ready medium:", err)
      toast.error("Ошибка при создании рабочей среды")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      {/* Back link */}
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/ready-media">
            <ArrowLeft className="mr-2 h-4 w-4" />
            К списку готовых сред
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Приготовление рабочей среды</CardTitle>
          <CardDescription>
            Заполните форму для регистрации новой рабочей среды
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Название */}
            <div className="space-y-2">
              <Label htmlFor="name">Название / состав *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Например: DMEM + 10% FBS + 1% P/S"
                required
              />
            </div>

            {/* Базовая среда (партия) */}
            <div className="space-y-2">
              <Label>Партия базовой среды *</Label>
              {batchesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загрузка партий...
                </div>
              ) : (
                <Select
                  value={formData.batch_id}
                  onValueChange={(v) =>
                    setFormData({ ...formData, batch_id: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите партию среды..." />
                  </SelectTrigger>
                  <SelectContent>
                    {mediumBatches.length === 0 ? (
                      <SelectItem value="__empty" disabled>
                        Нет доступных партий сред
                      </SelectItem>
                    ) : (
                      mediumBatches.map((batch) => (
                        <SelectItem key={batch.id} value={batch.id}>
                          {batch.nomenclature?.name} — Партия:{" "}
                          {batch.batch_number}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Объём и даты */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="volume_ml">Объём (мл) *</Label>
                <Input
                  id="volume_ml"
                  type="number"
                  min="0"
                  step="0.1"
                  value={formData.volume_ml}
                  onChange={(e) =>
                    setFormData({ ...formData, volume_ml: e.target.value })
                  }
                  placeholder="500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prepared_at">Дата приготовления *</Label>
                <Input
                  id="prepared_at"
                  type="date"
                  value={formData.preparation_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preparation_date: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiration_date">Срок годности *</Label>
                <Input
                  id="expiration_date"
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expiration_date: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>

            {/* Позиция хранения */}
            <div className="space-y-2">
              <Label htmlFor="storage_position_id">
                Позиция хранения (необязательно)
              </Label>
              <Input
                id="storage_position_id"
                value={formData.storage_position_id}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    storage_position_id: e.target.value,
                  })
                }
                placeholder="UUID позиции хранения"
              />
            </div>

            {/* Примечания */}
            <div className="space-y-2">
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Дополнительная информация о приготовлении среды..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-2">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  "Создать"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/ready-media">Отмена</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
