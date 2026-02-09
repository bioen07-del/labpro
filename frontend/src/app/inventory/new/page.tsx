"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, CheckCircle2, Package, FileText } from "lucide-react"
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
import { Separator } from "@/components/ui/separator"

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
    volume_per_unit: "",
    unit: "шт",
    expiration_date: "",
    manufacturer: "",
    catalog_number: "",
    supplier: "",
    invoice_number: "",
    invoice_date: "",
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
      const volumePerUnit = formData.volume_per_unit ? Number(formData.volume_per_unit) : null
      await createBatch({
        nomenclature_id: formData.nomenclature_id,
        batch_number: formData.batch_number,
        quantity: Number(formData.quantity),
        volume_per_unit: volumePerUnit,
        current_unit_volume: volumePerUnit, // инициализация: первый флакон полный
        unit: formData.unit,
        expiration_date: formData.expiration_date || null,
        manufacturer: formData.manufacturer || null,
        catalog_number: formData.catalog_number || null,
        supplier: formData.supplier || null,
        invoice_number: formData.invoice_number || null,
        invoice_date: formData.invoice_date || null,
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

  const update = (key: string, value: string) => setFormData(prev => ({ ...prev, [key]: value }))

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
            Приёмка товара на склад
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Номенклатура */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-4 w-4" />
              Товар
            </CardTitle>
            <CardDescription>Выберите номенклатуру и укажите параметры партии</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category filter */}
            <div className="space-y-2">
              <Label>Категория</Label>
              <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); update('nomenclature_id', '') }}>
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
                  <SelectItem value="CONSUMABLE">Контейнер</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Nomenclature */}
            <div className="space-y-2">
              <Label>Номенклатура *</Label>
              {nomenclaturesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Загрузка номенклатуры...
                </div>
              ) : (
                <Select value={formData.nomenclature_id} onValueChange={(v) => update('nomenclature_id', v)}>
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

            <Separator />

            {/* Batch number */}
            <div className="space-y-2">
              <Label>Номер партии (LOT) *</Label>
              <Input
                value={formData.batch_number}
                onChange={(e) => update('batch_number', e.target.value)}
                placeholder="LOT-2024-001"
                required
              />
            </div>

            {/* Quantity + Volume per unit + Unit */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Количество *</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.quantity}
                  onChange={(e) => update('quantity', e.target.value)}
                  placeholder="5"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Объём / масса на ед.</Label>
                <Input
                  type="number"
                  min="0"
                  step="any"
                  value={formData.volume_per_unit}
                  onChange={(e) => update('volume_per_unit', e.target.value)}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label>Ед. измерения</Label>
                <Select value={formData.unit} onValueChange={(v) => update('unit', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
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
            </div>
            {formData.quantity && formData.volume_per_unit && (
              <p className="text-sm text-muted-foreground">
                Итого: {Number(formData.quantity)} ед. × {Number(formData.volume_per_unit)} {formData.unit} = <strong>{(Number(formData.quantity) * Number(formData.volume_per_unit)).toFixed(1)} {formData.unit}</strong>
              </p>
            )}

            {/* Expiration date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Срок годности</Label>
                <Input
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => update('expiration_date', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Производитель и поставщик */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Производитель и поставщик
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Manufacturer + Catalog number */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Производитель</Label>
                <Input
                  value={formData.manufacturer}
                  onChange={(e) => update('manufacturer', e.target.value)}
                  placeholder="Gibco, Sigma-Aldrich..."
                />
              </div>
              <div className="space-y-2">
                <Label>Каталожный номер</Label>
                <Input
                  value={formData.catalog_number}
                  onChange={(e) => update('catalog_number', e.target.value)}
                  placeholder="12571-063"
                />
              </div>
            </div>

            {/* Supplier */}
            <div className="space-y-2">
              <Label>Поставщик</Label>
              <Input
                value={formData.supplier}
                onChange={(e) => update('supplier', e.target.value)}
                placeholder="Название поставщика / дистрибьютора"
              />
            </div>

            <Separator />

            {/* Invoice */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Номер накладной</Label>
                <Input
                  value={formData.invoice_number}
                  onChange={(e) => update('invoice_number', e.target.value)}
                  placeholder="ТН-2026-0001"
                />
              </div>
              <div className="space-y-2">
                <Label>Дата накладной</Label>
                <Input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => update('invoice_date', e.target.value)}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Примечания</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => update('notes', e.target.value)}
                placeholder="Дополнительная информация о партии..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
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
    </div>
  )
}

function getCatLabel(category: string): string {
  const labels: Record<string, string> = {
    MEDIUM: 'Среда', SERUM: 'Сыворотка', BUFFER: 'Буфер',
    SUPPLEMENT: 'Добавка', ENZYME: 'Фермент', REAGENT: 'Реагент',
    CONSUMABLE: 'Контейнер', EQUIP: 'Оборудование',
  }
  return labels[category] || category
}
