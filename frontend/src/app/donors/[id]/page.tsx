"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Plus,
  Dna,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { getDonorById, getDonations, getCultures } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import type { Donor, Donation, Culture, CultureType, InfectionTestResult } from "@/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Colored dot for infection test result */
function InfectionDot({ status }: { status: InfectionTestResult | string | null | undefined }) {
  const s = status ?? "PENDING"
  let color = "bg-yellow-400" // PENDING
  if (s === "NEGATIVE") color = "bg-green-500"
  if (s === "POSITIVE") color = "bg-red-500"
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
}

/** Human-readable label for infection dot legend */
function infectionLabel(status: InfectionTestResult | string | null | undefined) {
  switch (status) {
    case "NEGATIVE":
      return "Отр."
    case "POSITIVE":
      return "Пол."
    default:
      return "Ожид."
  }
}

/** Badge for donor status */
function donorStatusBadge(status: string | undefined) {
  switch (status) {
    case "ACTIVE":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Активен</Badge>
    case "ARCHIVED":
      return <Badge variant="secondary">Архив</Badge>
    default:
      return <Badge variant="outline">{status ?? "---"}</Badge>
  }
}

/** Badge for donation status */
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

/** Badge for culture status */
function cultureStatusBadge(status: string) {
  switch (status) {
    case "ACTIVE":
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Активна</Badge>
    case "ARCHIVED":
      return <Badge variant="secondary">Архив</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

/** Sex display */
function sexLabel(sex: string | null | undefined) {
  if (sex === "M") return "Мужской"
  if (sex === "F") return "Женский"
  return "Не указан"
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function DonorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [donor, setDonor] = useState<Donor | null>(null)
  const [donations, setDonations] = useState<(Donation & { tissue_type?: { id: string; name: string } })[]>([])
  const [cultures, setCultures] = useState<(Culture & { culture_type?: CultureType })[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadData() {
    setLoading(true)
    try {
      const [donorData, donationsData, culturesData] = await Promise.all([
        getDonorById(id),
        getDonations({ donor_id: id }),
        getCultures(),
      ])

      setDonor(donorData as Donor)
      setDonations((donationsData as typeof donations) ?? [])

      // Filter cultures that belong to this donor
      const donorCultures = (culturesData ?? []).filter(
        (c: any) => c.donor_id === id
      )
      setCultures(donorCultures as typeof cultures)
    } catch (err: any) {
      const msg = err?.message || "Ошибка загрузки данных донора"
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // ---- Full name -----------------------------------------------------------
  const fullName = donor
    ? [donor.last_name, donor.first_name, donor.middle_name].filter(Boolean).join(" ") || "ФИО не указано"
    : ""

  // ---- Loading state -------------------------------------------------------
  if (loading) {
    return (
      <div className="container py-10 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ---- Error state ---------------------------------------------------------
  if (error || !donor) {
    return (
      <div className="container py-10 space-y-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">{error || "Донор не найден"}</span>
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

  // =========================================================================
  // RENDER
  // =========================================================================
  return (
    <div className="container py-6 space-y-6">
      {/* ================================================================= */}
      {/* HEADER                                                            */}
      {/* ================================================================= */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/donors">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm text-muted-foreground">{donor.code}</span>
              {donorStatusBadge(donor.status)}
            </div>
            <h1 className="text-2xl font-bold tracking-tight">{fullName}</h1>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/donors/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Редактировать
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/donors/${id}/donations/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Донация
            </Link>
          </Button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* INFO GRID (2 columns)                                             */}
      {/* ================================================================= */}
      <Card>
        <CardHeader>
          <CardTitle>Информация о доноре</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            <InfoRow label="Дата рождения" value={donor.birth_date ? formatDate(donor.birth_date) : "Не указана"} />
            <InfoRow label="Пол" value={sexLabel(donor.sex)} />
            <InfoRow label="Группа крови" value={donor.blood_type || "Не указана"} />
            <InfoRow label="Телефон" value={donor.phone || "Не указан"} />
            <InfoRow label="Email" value={donor.email || "Не указан"} />
            <InfoRow label="Примечания" value={donor.notes || "---"} />
          </div>
        </CardContent>
      </Card>

      {/* ================================================================= */}
      {/* DONATIONS SECTION                                                 */}
      {/* ================================================================= */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Донации ({donations.length})</CardTitle>
          <Button size="sm" asChild>
            <Link href={`/donors/${id}/donations/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Новая донация
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {donations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <p className="mb-4">Нет зарегистрированных донаций</p>
              <Button variant="outline" asChild>
                <Link href={`/donors/${id}/donations/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Зарегистрировать донацию
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Код</TableHead>
                    <TableHead>Дата сбора</TableHead>
                    <TableHead>Тип ткани</TableHead>
                    <TableHead className="text-center">
                      <span className="sr-only">Статус инфекций</span>
                      ВИЧ / HBV / HCV / Сифилис
                    </TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="w-[1%]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donations.map((d) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer hover:bg-muted/60"
                      onClick={() => router.push(`/donors/${id}/donations/${d.id}`)}
                    >
                      <TableCell className="font-mono text-sm">{d.code}</TableCell>
                      <TableCell>
                        {d.collected_at ? formatDate(d.collected_at) : "---"}
                      </TableCell>
                      <TableCell>{d.tissue_type?.name ?? "---"}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-3">
                          <span className="inline-flex items-center gap-1 text-xs" title={`ВИЧ: ${infectionLabel(d.inf_hiv)}`}>
                            <InfectionDot status={d.inf_hiv} />
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs" title={`HBV: ${infectionLabel(d.inf_hbv)}`}>
                            <InfectionDot status={d.inf_hbv} />
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs" title={`HCV: ${infectionLabel(d.inf_hcv)}`}>
                            <InfectionDot status={d.inf_hcv} />
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs" title={`Сифилис: ${infectionLabel(d.inf_syphilis)}`}>
                            <InfectionDot status={d.inf_syphilis} />
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{donationStatusBadge(d.status)}</TableCell>
                      <TableCell>
                        {d.status === "APPROVED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Link href={`/cultures/new?donor_id=${id}&donation_id=${d.id}`}>
                              <Dna className="mr-1.5 h-3.5 w-3.5" />
                              Создать культуру
                            </Link>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ================================================================= */}
      {/* CULTURES SECTION                                                  */}
      {/* ================================================================= */}
      <Card>
        <CardHeader>
          <CardTitle>Культуры ({cultures.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {cultures.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              Нет культур, созданных из донаций этого донора
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Код</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Пассаж</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cultures.map((c) => (
                    <TableRow
                      key={c.id}
                      className="cursor-pointer hover:bg-muted/60"
                      onClick={() => router.push(`/cultures/${c.id}`)}
                    >
                      <TableCell className="font-mono text-sm">{c.name}</TableCell>
                      <TableCell>{c.culture_type?.name ?? "---"}</TableCell>
                      <TableCell>{cultureStatusBadge(c.status)}</TableCell>
                      <TableCell className="text-right font-mono">
                        P{(c as any).passage_number ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small info-row component for the 2-column grid
// ---------------------------------------------------------------------------
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  )
}
