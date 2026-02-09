"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, CheckCircle2, Package } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { createBatch, getNomenclatures } from "@/lib/api"

const unitOptions = [
  { value: "шт", label: "шт" },
  { value: "мл", label: "мл" },
  { value: "г", label: "г" },
  { value: "л", label: "л" },
]

export default function NewBatchPage() {
  const router = useRouter()

  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [nomenclatures, setNomenclatures] = useState<any[]>([])
  const [nomenclaturesLoading, setNomenclaturesLoading] = useState(true)

  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const [formData, setFormData] = useState({
    nomenclature_id: "",
    batch_number: "",
    quantity: "",
    unit: "шт",
    expiration_date: "",
    supplier: "",
    notes: "",
  })

  useEffect(() => {
    loadNomenclatures()
  }, [])

  async function loadNomenclatures() {
    setNomenclaturesLoading(true)
    try {
      const data = await getNomenclatures()
      setNomenclatures(data || [])
    } catch (err) {
      console.error("Error loading nomenclatures:", err)
      toast.error("Ошибка загрузки номенклатуры")
      setNomenclatures([])
    } finally {
      setNomenclaturesLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.nomenclature_id || !formData.batch_number || !formData.quantity) {
      toast.error("Заполните обязательные поля")
      return
    }

    setSubmitting(true)

    try {
      await createBatch({
        nomenclature_id: formData.nomenclature_id,
        batch_number: formData.batch_number,
        quantity: Number(formData.quantity),
        unit: formData.unit,
        expiration_date: formData.expiration_date || null,
        supplier: formData.supplier || null,
        notes: formData.notes || null,
      })

      setSuccess(true)
      toast.success("Партия успешно создана")
      setTimeout(() => router.push("/inventory"), 1500)
    } catch (err: any) {
      console.error("Error creating batch:", err)
      toast.error(err?.message || "Ошибка при создании партии")
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="container py-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Партия создана</h2>
              <p className="text-muted-foreground">
                Партия {formData.batch_number} успешно зарегистрирована
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Перенаправление на склад...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/inventory">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Новая партия</h1>
          <p className="text-muted-foreground">
            Регистрация новой партии реагентов / расходных материалов
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Данные партии
          </CardTitle>
          <CardDescription>Заполните информацию о новой партии</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category filter + Nomenclature */}
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setFormData({ ...formData, nomenclature_id: '' }) }}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Все категории" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  <SelectItem value="MEDIUM">Среда</SelectItem>
                  <SelectItem value="SERUM">Сыворотка</SelectItem>
                  <SelectItem value="BUFFER">Буфер</SelectItem>
                  <SelectItem value="SUPPLEMENT">Добавка</SelectItem>
                  <SelectItem value="ENZYME">Фермент</SelectItem>
                  <SelectItem value="REAGENT">Реагент</SelectItem>
                  <SelectItem value="CONSUMABLE">Расходный материал</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nomenclature_id">Номенклатура *</Label>
              {nomenclaturesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загрузка номенклатуры...
                </div>
              ) : (
                <Select
                  value={formData.nomenclature_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, nomenclature_id: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите номенклатуру" />
                  </SelectTrigger>
                  <SelectContent>
                    {nomenclatures
                      .filter((n) => categoryFilter === 'all' || n.category === categoryFilter)
                      .map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.name}
                        {n.category ? ` [${getCatLabel(n.category)}]` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Batch number + Quantity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch_number">Номер партии *</Label>
                <Input
                  id="batch_number"
                  value={formData.batch_number}
                  onChange={(e) =>
                    setFormData({ ...formData, batch_number: e.target.value })
                  }
                  placeholder="Например: LOT-2024-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Количество *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  step="any"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  placeholder="0"
                  required
                />
              </div>
            </div>

            {/* Unit + Expiration date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit">Единица измерения</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(value) =>
                    setFormData({ ...formData, unit: value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите единицу" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiration_date">Срок годности</Label>
                <Input
                  id="expiration_date"
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expiration_date: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Supplier */}
            <div className="space-y-2">
              <Label htmlFor="supplier">Поставщик</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) =>
                  setFormData({ ...formData, supplier: e.target.value })
                }
                placeholder="Название поставщика"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Примечания</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Дополнительная информация о партии..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создание...
                  </>
                ) : (
                  "Создать партию"
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/inventory">Отмена</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function getCatLabel(category: string): string {
  const labels: Record<string, string> = {
    MEDIUM: 'Среда', SERUM: 'Сыворотка', BUFFER: 'Буфер',
    SUPPLEMENT: 'Добавка', ENZYME: 'Фермент', REAGENT: 'Реагент',
    CONSUMABLE: 'Расходка', EQUIP: 'Оборудование',
  }
  return labels[category] || category
}
