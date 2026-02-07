"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  Pencil,
  Shield,
  Beaker,
  FileText,
  Dna,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { getDonationById, updateDonation } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { InfectionTestResult } from "@/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function infectionBadge(status: InfectionTestResult | string | null | undefined) {
  switch (status) {
    case "NEGATIVE":
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Отрицательный
        </Badge>
      )
    case "POSITIVE":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Положительный
        </Badge>
      )
    default:
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
          <Clock className="mr-1 h-3 w-3" />
          Ожидает
        </Badge>
      )
  }
}

function donationStatusBadge(status: string) {
  switch (status) {
    case "APPROVED":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Одобрена</Badge>
    case "REJECTED":
      return <Badge variant="destructive">Отклонена</Badge>
    default:
      return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Карантин</Badge>
  }
}

const INFECTION_OPTIONS: { value: string; label: string }[] = [
  { value: "PENDING", label: "Ожидает" },
  { value: "NEGATIVE", label: "Отрицательный" },
  { value: "POSITIVE", label: "Положительный" },
]

const DONATION_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "QUARANTINE", label: "Карантин" },
  { value: "APPROVED", label: "Одобрена" },
  { value: "REJECTED", label: "Отклонена" },
]

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function DonationDetailPage({
  params,
}: {
  params: Promise<{ id: string; donationId: string }>
}) {
  const { id: donorId, donationId } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [donation, setDonation] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Edit mode state
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form state
  const [editInfHiv, setEditInfHiv] = useState<string>("")
  const [editInfHbv, setEditInfHbv] = useState<string>("")
  const [editInfHcv, setEditInfHcv] = useState<string>("")
  const [editInfSyphilis, setEditInfSyphilis] = useState<string>("")
  const [editStatus, setEditStatus] = useState<string>("")

  useEffect(() => {
    loadData()
  }, [donationId])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getDonationById(donationId)
      setDonation(data)
    } catch (err: any) {
      setError(err?.message || "Ошибка загрузки донации")
      toast.error("Не удалось загрузить данные донации")
    } finally {
      setLoading(false)
    }
  }

  // Enter edit mode — populate form fields from current donation data
  function enterEdit() {
    if (!donation) return
    setEditInfHiv(donation.inf_hiv || "PENDING")
    setEditInfHbv(donation.inf_hbv || "PENDING")
    setEditInfHcv(donation.inf_hcv || "PENDING")
    setEditInfSyphilis(donation.inf_syphilis || "PENDING")
    setEditStatus(donation.status)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
  }

  // Auto-suggest: if all infections are NEGATIVE, suggest APPROVED
  function handleInfectionChange(
    field: "hiv" | "hbv" | "hcv" | "syphilis",
    value: string,
  ) {
    const next = {
      hiv: editInfHiv,
      hbv: editInfHbv,
      hcv: editInfHcv,
      syphilis: editInfSyphilis,
    }
    next[field] = value

    switch (field) {
      case "hiv":
        setEditInfHiv(value)
        break
      case "hbv":
        setEditInfHbv(value)
        break
      case "hcv":
        setEditInfHcv(value)
        break
      case "syphilis":
        setEditInfSyphilis(value)
        break
    }

    // Auto-suggest APPROVED when all tests are NEGATIVE
    const allNegative =
      next.hiv === "NEGATIVE" &&
      next.hbv === "NEGATIVE" &&
      next.hcv === "NEGATIVE" &&
      next.syphilis === "NEGATIVE"

    if (allNegative && editStatus === "QUARANTINE") {
      setEditStatus("APPROVED")
      toast.info("Все тесты отрицательны — статус изменён на «Одобрена»")
    }

    // If any test is POSITIVE and status was auto-set to APPROVED, suggest REJECTED
    const anyPositive =
      next.hiv === "POSITIVE" ||
      next.hbv === "POSITIVE" ||
      next.hcv === "POSITIVE" ||
      next.syphilis === "POSITIVE"

    if (anyPositive && editStatus === "APPROVED") {
      setEditStatus("REJECTED")
      toast.info("Обнаружен положительный результат — статус изменён на «Отклонена»")
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateDonation(donationId, {
        inf_hiv: editInfHiv,
        inf_hbv: editInfHbv,
        inf_hcv: editInfHcv,
        inf_syphilis: editInfSyphilis,
        status: editStatus,
      })
      toast.success("Донация обновлена")
      setEditing(false)
      loadData()
    } catch (err: any) {
      toast.error("Ошибка сохранения")
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Loading / Error states
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !donation) {
    return (
      <div className="container py-10 space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{error || "Донация не найдена"}</span>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/donors/${donorId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            К донору
          </Link>
        </Button>
      </div>
    )
  }

  const donorName = donation.donor
    ? [donation.donor.last_name, donation.donor.first_name, donation.donor.middle_name]
        .filter(Boolean)
        .join(" ")
    : "---"

  // "Создать первичную культуру" visible for APPROVED and QUARANTINE (not REJECTED)
  const canCreateCulture = donation.status === "APPROVED" || donation.status === "QUARANTINE"

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/donors/${donorId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">{donation.code}</span>
              {donationStatusBadge(donation.status)}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Донация</h1>
            <p className="text-sm text-muted-foreground">
              Донор: <Link href={`/donors/${donorId}`} className="underline">{donorName}</Link>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Edit / Save / Cancel buttons */}
          {!editing ? (
            <Button variant="outline" onClick={enterEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Редактировать
            </Button>
          ) : (
            <>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Сохранить
              </Button>
              <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                <X className="mr-2 h-4 w-4" />
                Отмена
              </Button>
            </>
          )}

          {canCreateCulture && !editing && (
            <Button asChild>
              <Link href={`/cultures/new?donor_id=${donorId}&donation_id=${donationId}`}>
                <Dna className="mr-2 h-4 w-4" />
                Создать культуру
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Collection Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                Данные забора
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <InfoRow label="Дата забора" value={donation.collected_at ? formatDate(donation.collected_at) : "---"} />
                <InfoRow label="Тип ткани" value={donation.tissue_type?.name ?? "Не указан"} />
                <InfoRow
                  label="Форма ткани"
                  value={
                    donation.tissue_form === "LIQUID"
                      ? "Жидкая"
                      : donation.tissue_form === "SOLID"
                        ? "Твёрдая"
                        : "---"
                  }
                />
                {donation.tissue_form === "LIQUID" ? (
                  <InfoRow label="Объём (мл)" value={donation.tissue_volume_ml?.toString() ?? "---"} />
                ) : (
                  <InfoRow label="Масса (г)" value={donation.tissue_weight_g?.toString() ?? "---"} />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Infection Tests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Результаты инфекционных исследований
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {/* HIV */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">ВИЧ</p>
                  {editing ? (
                    <Select
                      value={editInfHiv}
                      onValueChange={(v) => handleInfectionChange("hiv", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INFECTION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    infectionBadge(donation.inf_hiv)
                  )}
                </div>

                {/* HBV */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Гепатит B</p>
                  {editing ? (
                    <Select
                      value={editInfHbv}
                      onValueChange={(v) => handleInfectionChange("hbv", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INFECTION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    infectionBadge(donation.inf_hbv)
                  )}
                </div>

                {/* HCV */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Гепатит C</p>
                  {editing ? (
                    <Select
                      value={editInfHcv}
                      onValueChange={(v) => handleInfectionChange("hcv", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INFECTION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    infectionBadge(donation.inf_hcv)
                  )}
                </div>

                {/* Syphilis */}
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Сифилис</p>
                  {editing ? (
                    <Select
                      value={editInfSyphilis}
                      onValueChange={(v) => handleInfectionChange("syphilis", v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INFECTION_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    infectionBadge(donation.inf_syphilis)
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consent & Contract */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Согласие и договор
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
                <InfoRow
                  label="Согласие получено"
                  value={donation.consent_received ? "Да" : "Нет"}
                />
                <InfoRow label="Документ согласия" value={donation.consent_document ?? "---"} />
                <InfoRow label="Номер договора" value={donation.contract_number ?? "---"} />
                <InfoRow
                  label="Дата договора"
                  value={donation.contract_date ? formatDate(donation.contract_date) : "---"}
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {donation.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Примечания</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{donation.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status card */}
          <Card>
            <CardHeader>
              <CardTitle>Статус</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Статус донации</span>
                {editing ? (
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DONATION_STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  donationStatusBadge(donation.status)
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Код</span>
                <span className="font-mono text-sm">{donation.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Создана</span>
                <span className="text-sm">{formatDate(donation.created_at)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Cultures from this donation */}
          <Card>
            <CardHeader>
              <CardTitle>Культуры ({donation.cultures?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {(!donation.cultures || donation.cultures.length === 0) ? (
                <p className="text-sm text-muted-foreground py-2">Нет культур</p>
              ) : (
                <div className="space-y-2">
                  {donation.cultures.map((c: any) => (
                    <Link
                      key={c.id}
                      href={`/cultures/${c.id}`}
                      className="flex items-center justify-between p-2 rounded-md border hover:bg-muted/50 transition-colors"
                    >
                      <span className="font-mono text-sm">{c.name}</span>
                      <Badge variant="outline">{c.status}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}
