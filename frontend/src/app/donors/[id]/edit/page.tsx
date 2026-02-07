"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, AlertCircle, Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { getDonorById, updateDonor } from "@/lib/api"

export default function EditDonorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [lastName, setLastName] = useState("")
  const [firstName, setFirstName] = useState("")
  const [middleName, setMiddleName] = useState("")
  const [birthDate, setBirthDate] = useState("")
  const [sex, setSex] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [bloodType, setBloodType] = useState("")
  const [status, setStatus] = useState("ACTIVE")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    loadDonor()
  }, [id])

  async function loadDonor() {
    setLoading(true)
    try {
      const donor = await getDonorById(id)
      setLastName(donor.last_name || "")
      setFirstName(donor.first_name || "")
      setMiddleName(donor.middle_name || "")
      setBirthDate(donor.birth_date || "")
      setSex(donor.sex || "")
      setPhone(donor.phone || "")
      setEmail(donor.email || "")
      setBloodType(donor.blood_type || "")
      setStatus(donor.status || "ACTIVE")
      setNotes(donor.notes || "")
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки донора")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await updateDonor(id, {
        last_name: lastName || null,
        first_name: firstName || null,
        middle_name: middleName || null,
        birth_date: birthDate || null,
        sex: sex || null,
        phone: phone || null,
        email: email || null,
        blood_type: bloodType || null,
        status,
        notes: notes || null,
      })
      toast.success("Донор обновлён")
      router.push(`/donors/${id}`)
    } catch (err: any) {
      setError(err?.message || "Ошибка сохранения")
      toast.error("Не удалось сохранить")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error && !lastName && !firstName) {
    return (
      <div className="container py-10 space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{error}</span>
        </div>
        <Button variant="outline" asChild>
          <Link href="/donors">
            <ArrowLeft className="mr-2 h-4 w-4" />
            К списку доноров
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/donors/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Редактирование донора</h1>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Личные данные</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName">Имя</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="middleName">Отчество</Label>
              <Input id="middleName" value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Дата рождения</Label>
              <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Пол</Label>
              <Select value={sex} onValueChange={setSex}>
                <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Мужской</SelectItem>
                  <SelectItem value="F">Женский</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Группа крови</Label>
              <Select value={bloodType} onValueChange={setBloodType}>
                <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="O(I)+">O(I)+</SelectItem>
                  <SelectItem value="O(I)-">O(I)-</SelectItem>
                  <SelectItem value="A(II)+">A(II)+</SelectItem>
                  <SelectItem value="A(II)-">A(II)-</SelectItem>
                  <SelectItem value="B(III)+">B(III)+</SelectItem>
                  <SelectItem value="B(III)-">B(III)-</SelectItem>
                  <SelectItem value="AB(IV)+">AB(IV)+</SelectItem>
                  <SelectItem value="AB(IV)-">AB(IV)-</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Активен</SelectItem>
                <SelectItem value="ARCHIVED">Архив</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Примечания</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Сохранение...</>
          ) : (
            <><Save className="mr-2 h-4 w-4" />Сохранить</>
          )}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/donors/${id}`}>Отмена</Link>
        </Button>
      </div>
    </div>
  )
}
