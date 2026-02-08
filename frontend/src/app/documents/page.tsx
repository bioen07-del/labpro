"use client"

import { useEffect, useState, Suspense, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  FileText,
  Download,
  Printer,
  FlaskConical,
  Package,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  getLotById,
  getBankById,
  getContainersByLot,
  getOperations,
  getCultureById,
} from "@/lib/api"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Labels & mappings
// ---------------------------------------------------------------------------

const MORPHOLOGY_LABELS: Record<string, string> = {
  spindle: "Веретенообразная",
  cobblestone: "Булыжная",
  fibroblast: "Фибробластная",
  epithelial: "Эпителиальная",
  mixed: "Смешанная",
  rounded: "Округлая",
  degenerate: "Дегенеративная",
}

const EXTRACTION_METHOD_LABELS: Record<string, string> = {
  ENZYMATIC: "Ферментативный",
  EXPLANT: "Эксплант",
  MECHANICAL: "Механический",
  OTHER: "Другой",
}

const OPERATION_TYPE_LABELS: Record<string, string> = {
  OBSERVE: "Наблюдение",
  FEED: "Подкормка",
  PASSAGE: "Пассаж",
  FREEZE: "Заморозка",
  THAW: "Разморозка",
  DISPOSE: "Утилизация",
}

const INFECTION_STATUS_LABELS: Record<string, string> = {
  NEGATIVE: "Отрицательный",
  POSITIVE: "Положительный",
  PENDING: "Ожидание",
  NOT_TESTED: "Не тестировалось",
}

const INFECTION_STATUS_VARIANT: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  NEGATIVE: "default",
  POSITIVE: "destructive",
  PENDING: "outline",
  NOT_TESTED: "secondary",
}

// ---------------------------------------------------------------------------
// Helper: format a date or return dash
// ---------------------------------------------------------------------------

function fmt(value: string | null | undefined, pattern = "dd.MM.yyyy") {
  if (!value) return "\u2014"
  try {
    return format(new Date(value), pattern, { locale: ru })
  } catch {
    return "\u2014"
  }
}

function fmtLong(value: string | null | undefined) {
  return fmt(value, "dd MMMM yyyy")
}

// ---------------------------------------------------------------------------
// Infection status badge helper
// ---------------------------------------------------------------------------

function InfectionBadge({ status }: { status: string | null | undefined }) {
  const s = status || "NOT_TESTED"
  return (
    <Badge variant={INFECTION_STATUS_VARIANT[s] ?? "outline"}>
      {INFECTION_STATUS_LABELS[s] ?? s}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Print CSS  (injected once)
// ---------------------------------------------------------------------------

function PrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        /* Hide everything except the printable area */
        body * {
          visibility: hidden;
        }
        #document-print-area,
        #document-print-area * {
          visibility: visible;
        }
        #document-print-area {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          padding: 20mm;
          font-size: 11pt;
        }
        /* Hide screen-only elements */
        .no-print {
          display: none !important;
        }
        /* Reset background for badges / cells */
        .print-reset-bg {
          background: transparent !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        @page {
          size: A4;
          margin: 15mm;
        }
        table {
          page-break-inside: auto;
        }
        tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
      }
    `}</style>
  )
}

// ---------------------------------------------------------------------------
// Main content component
// ---------------------------------------------------------------------------

function DocumentsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lotId = searchParams.get("lot_id")
  const bankId = searchParams.get("bank_id")
  const cultureId = searchParams.get("culture_id")

  const [lot, setLot] = useState<any>(null)
  const [bank, setBank] = useState<any>(null)
  const [culture, setCulture] = useState<any>(null)
  const [containers, setContainers] = useState<any[]>([])
  const [operations, setOperations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [docType, setDocType] = useState<"worksheet" | "passport">("worksheet")

  // ---- Data loading -------------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // --- Lot-centric load ---
      if (lotId) {
        const lotData = await getLotById(lotId)
        setLot(lotData)

        // Containers
        const contData = await getContainersByLot(lotId)
        setContainers(contData || [])

        // Operations for this lot (OBSERVE + FEED)
        const opsData = await getOperations({ lot_id: lotId })
        setOperations(opsData || [])

        // Culture (lot already has embedded culture from getLotById)
        if (lotData?.culture) {
          setCulture(lotData.culture)
        } else if (lotData?.culture_id) {
          const cultureData = await getCultureById(lotData.culture_id)
          setCulture(cultureData)
        }
        return
      }

      // --- Bank-centric load ---
      if (bankId) {
        const bankData = await getBankById(bankId)
        setBank(bankData)
        setDocType("passport") // default to passport for bank

        if (bankData?.culture) {
          setCulture(bankData.culture)
        } else if (bankData?.culture_id) {
          const cultureData = await getCultureById(bankData.culture_id)
          setCulture(cultureData)
        }

        if (bankData?.lot) {
          setLot(bankData.lot)
          const contData = await getContainersByLot(bankData.lot.id)
          setContainers(contData || [])
          const opsData = await getOperations({ lot_id: bankData.lot.id })
          setOperations(opsData || [])
        }
        return
      }

      // --- Culture-centric load ---
      if (cultureId) {
        const cultureData = await getCultureById(cultureId)
        setCulture(cultureData)
        setDocType("passport")
        return
      }
    } catch (err: any) {
      console.error("Documents: load error", err)
      setError(err?.message || "Ошибка загрузки данных")
      toast.error("Не удалось загрузить данные для документа")
    } finally {
      setLoading(false)
    }
  }, [lotId, bankId, cultureId])

  useEffect(() => {
    if (lotId || bankId || cultureId) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [lotId, bankId, cultureId, loadData])

  // ---- Print / PDF handler ------------------------------------------------

  const handlePrint = () => {
    toast.info("Открываем диалог печати / сохранения PDF...")
    setTimeout(() => window.print(), 300)
  }

  // ---- Generate doc number -------------------------------------------------

  const docNumber = (() => {
    const datePart = format(new Date(), "yyyyMMdd")
    if (lot) return `WS-${lot.lot_number ?? "?"}-${datePart}`
    if (bank) return `PP-${bank.code ?? "?"}-${datePart}`
    if (culture) return `PP-${culture.name ?? "?"}-${datePart}`
    return `DOC-${datePart}`
  })()

  // ==========================================================================
  //  WORKSHEET
  // ==========================================================================

  const renderWorksheet = () => {
    if (!lot) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p>Для генерации рабочего журнала требуется лот.</p>
          <p className="text-sm mt-1">Укажите <code>?lot_id=</code> в URL.</p>
        </div>
      )
    }

    const observeOps = operations.filter((op: any) => op.type === "OBSERVE")
    const feedOps = operations.filter((op: any) => op.type === "FEEDING")

    return (
      <div className="space-y-6">
        {/* ---- Document header ---- */}
        <div className="text-center border-b pb-4">
          <h2 className="text-xl font-bold uppercase tracking-wide">
            Рабочий журнал (Worksheet)
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Лаборатория клеточных культур
          </p>
          <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
            <span>Документ: <strong>{docNumber}</strong></span>
            <span>Дата: <strong>{format(new Date(), "dd MMMM yyyy", { locale: ru })}</strong></span>
          </div>
        </div>

        {/* ---- Lot information ---- */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
            Информация о лоте
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <Field label="Номер лота" value={lot.lot_number} />
            <Field label="Пассаж" value={lot.passage_number != null ? `P${lot.passage_number}` : null} />
            <Field label="Культура" value={culture?.name} />
            <Field label="Тип культуры" value={culture?.culture_type?.name} />
            <Field label="Дата посева" value={fmtLong(lot.seeded_at)} />
            <Field label="Статус">
              <Badge>{lot.status}</Badge>
            </Field>
          </div>
        </div>

        {/* ---- Container table ---- */}
        <div className="border rounded-lg overflow-hidden">
          <h3 className="font-semibold p-3 text-sm uppercase tracking-wide text-muted-foreground bg-muted">
            Контейнеры лота
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium">Код</th>
                  <th className="p-2 text-left font-medium">Тип</th>
                  <th className="p-2 text-center font-medium">Конфлюэнтность, %</th>
                  <th className="p-2 text-left font-medium">Морфология</th>
                  <th className="p-2 text-center font-medium">Контаминация</th>
                  <th className="p-2 text-left font-medium">Позиция</th>
                </tr>
              </thead>
              <tbody>
                {containers.map((c: any) => (
                  <tr key={c.id} className="border-t hover:bg-muted/30">
                    <td className="p-2 font-mono text-xs">{c.code}</td>
                    <td className="p-2">{c.container_type?.name ?? c.container_type_id ?? "\u2014"}</td>
                    <td className="p-2 text-center">{c.confluent_percent ?? 0}%</td>
                    <td className="p-2">
                      {MORPHOLOGY_LABELS[c.morphology] || c.morphology || "\u2014"}
                    </td>
                    <td className="p-2 text-center">
                      {c.contaminated ? (
                        <Badge variant="destructive">Да</Badge>
                      ) : (
                        <Badge variant="outline">Нет</Badge>
                      )}
                    </td>
                    <td className="p-2 text-xs">
                      {c.position?.path ?? "\u2014"}
                    </td>
                  </tr>
                ))}
                {containers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      Нет данных о контейнерах
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- Operations history: OBSERVE ---- */}
        {observeOps.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              История наблюдений (OBSERVE)
            </h3>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium">Дата / время</th>
                  <th className="p-2 text-left font-medium">Статус</th>
                  <th className="p-2 text-left font-medium">Заметки</th>
                </tr>
              </thead>
              <tbody>
                {observeOps.map((op: any) => (
                  <tr key={op.id} className="border-t">
                    <td className="p-2 text-xs">{fmt(op.started_at, "dd.MM.yyyy HH:mm")}</td>
                    <td className="p-2">
                      <Badge variant="outline">{op.status}</Badge>
                    </td>
                    <td className="p-2 text-xs">{op.notes || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- Operations history: FEED ---- */}
        {feedOps.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              История подкормок (FEED)
            </h3>
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium">Дата / время</th>
                  <th className="p-2 text-left font-medium">Статус</th>
                  <th className="p-2 text-left font-medium">Заметки</th>
                </tr>
              </thead>
              <tbody>
                {feedOps.map((op: any) => (
                  <tr key={op.id} className="border-t">
                    <td className="p-2 text-xs">{fmt(op.started_at, "dd.MM.yyyy HH:mm")}</td>
                    <td className="p-2">
                      <Badge variant="outline">{op.status}</Badge>
                    </td>
                    <td className="p-2 text-xs">{op.notes || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- Empty rows for manual entries (pen/paper template) ---- */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
            Записи вручную
          </h3>
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-2 text-left font-medium w-28">Дата</th>
                <th className="p-2 text-left font-medium w-24">Время</th>
                <th className="p-2 text-left font-medium w-28">Тип операции</th>
                <th className="p-2 text-left font-medium">Контейнер</th>
                <th className="p-2 text-left font-medium">Примечание</th>
                <th className="p-2 text-left font-medium w-24">Подпись</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-t h-10">
                  <td className="p-2">&nbsp;</td>
                  <td className="p-2">&nbsp;</td>
                  <td className="p-2">&nbsp;</td>
                  <td className="p-2">&nbsp;</td>
                  <td className="p-2">&nbsp;</td>
                  <td className="p-2">&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ---- Signatures ---- */}
        <div className="grid gap-8 sm:grid-cols-2 pt-8 border-t">
          <SignatureBlock label="Исполнитель" />
          <SignatureBlock label="Проверил" />
        </div>

        {/* ---- Footer ---- */}
        <DocFooter />
      </div>
    )
  }

  // ==========================================================================
  //  PASSPORT
  // ==========================================================================

  const renderPassport = () => {
    const cultureData = culture || lot?.culture || bank?.culture
    const bankData = bank
    const donorData = cultureData?.donor
    const donationData = cultureData?.donation

    if (!cultureData && !bankData) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p>Для генерации паспорта требуется культура или банк.</p>
          <p className="text-sm mt-1">
            Укажите <code>?bank_id=</code>, <code>?culture_id=</code> или <code>?lot_id=</code> в URL.
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* ---- Header ---- */}
        <div className="text-center border-b pb-4">
          <h2 className="text-xl font-bold uppercase tracking-wide">
            Паспорт клеточной культуры
          </h2>
          <p className="text-muted-foreground text-sm mt-1">Cell Culture Passport</p>
          <div className="flex justify-center gap-6 mt-2 text-xs text-muted-foreground">
            <span>Документ: <strong>{docNumber}</strong></span>
            <span>Дата: <strong>{format(new Date(), "dd MMMM yyyy", { locale: ru })}</strong></span>
          </div>
        </div>

        {/* ---- Culture info ---- */}
        {cultureData && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Информация о культуре
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <Field label="Название" value={cultureData.name} />
              <Field label="Тип культуры" value={cultureData.culture_type?.name} />
              <Field label="Описание" value={cultureData.description} />
              <Field
                label="Метод выделения"
                value={
                  cultureData.extraction_method
                    ? EXTRACTION_METHOD_LABELS[cultureData.extraction_method] ?? cultureData.extraction_method
                    : null
                }
              />
              <Field label="Статус">
                <Badge>{cultureData.status}</Badge>
              </Field>
            </div>
          </div>
        )}

        {/* ---- Donor info ---- */}
        {donorData && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Информация о доноре
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <Field label="Код донора" value={donorData.code} />
              <Field
                label="Возраст"
                value={
                  donorData.birth_date
                    ? `${Math.floor((Date.now() - new Date(donorData.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))} лет`
                    : null
                }
              />
              <Field
                label="Пол"
                value={
                  donorData.sex === "M" ? "Мужской" : donorData.sex === "F" ? "Женский" : donorData.sex
                }
              />
            </div>
          </div>
        )}

        {/* ---- Donation info (incl. infection statuses) ---- */}
        {donationData && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Информация о донации
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 mb-4">
              <Field label="Тип ткани" value={donationData.tissue_type?.name} />
              <Field label="Дата донации" value={fmtLong(donationData.collected_at)} />
              <Field label="Статус донации">
                <Badge
                  variant={
                    donationData.status === "APPROVED"
                      ? "default"
                      : donationData.status === "REJECTED"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {donationData.status}
                </Badge>
              </Field>
            </div>

            <h4 className="font-medium text-sm mb-2">Инфекционный контроль</h4>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">ВИЧ (HIV)</p>
                <InfectionBadge status={donationData.hiv_status ?? donationData.inf_hiv} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Гепатит B (HBV)</p>
                <InfectionBadge status={donationData.hbv_status ?? donationData.inf_hbv} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Гепатит C (HCV)</p>
                <InfectionBadge status={donationData.hcv_status ?? donationData.inf_hcv} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Сифилис</p>
                <InfectionBadge status={donationData.syphilis_status ?? donationData.inf_syphilis} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">ЦМВ (CMV)</p>
                <InfectionBadge status={donationData.cmv_status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">ЭБВ (EBV)</p>
                <InfectionBadge status={donationData.ebv_status} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Микоплазма</p>
                <InfectionBadge status={donationData.mycoplasma_status} />
              </div>
            </div>
          </div>
        )}

        {/* ---- Bank info ---- */}
        {bankData && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Информация о банке
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <Field label="Код банка" value={bankData.code} />
              <Field
                label="Тип банка"
                value={bankData.bank_type}
              />
              <Field label="Статус">
                <Badge
                  variant={
                    bankData.status === "APPROVED"
                      ? "default"
                      : bankData.status === "DISPOSE"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {bankData.status}
                </Badge>
              </Field>
              <Field label="Количество виал" value={bankData.cryo_vials_count} />
              <Field
                label="Протокол заморозки"
                value={bankData.freezing_method}
              />
              <Field label="Дата заморозки" value={fmtLong(bankData.freezing_date)} />
            </div>
          </div>
        )}

        {/* ---- Storage info ---- */}
        {bankData && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
              Условия хранения
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              <Field
                label="Температура хранения"
                value={
                  bankData.position?.equipment?.current_temperature != null
                    ? `${bankData.position.equipment.current_temperature}\u00B0C`
                    : bankData.storage_temperature != null
                      ? `${bankData.storage_temperature}\u00B0C`
                      : "-196\u00B0C (жидкий азот)"
                }
              />
              <Field
                label="Позиция"
                value={bankData.position?.path ?? bankData.storage_location}
              />
            </div>
          </div>
        )}

        {/* ---- QC section ---- */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
            Контроль качества (QC)
          </h3>
          {bankData?.qc_tests && bankData.qc_tests.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium">Тест</th>
                  <th className="p-2 text-left font-medium">Статус</th>
                  <th className="p-2 text-left font-medium">Результат</th>
                  <th className="p-2 text-left font-medium">Дата</th>
                </tr>
              </thead>
              <tbody>
                {bankData.qc_tests.map((test: any) => (
                  <tr key={test.id} className="border-t">
                    <td className="p-2">{test.test_type}</td>
                    <td className="p-2">
                      <Badge variant={test.status === "COMPLETED" ? "default" : "outline"}>
                        {test.status}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {test.result ? (
                        <Badge variant={test.result === "PASSED" ? "default" : "destructive"}>
                          {test.result === "PASSED" ? "Пройден" : "Не пройден"}
                        </Badge>
                      ) : (
                        "\u2014"
                      )}
                    </td>
                    <td className="p-2 text-xs">{fmt(test.completed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-6 text-center text-muted-foreground text-sm border rounded">
              QC тесты не проводились или данные отсутствуют.
              <br />
              <span className="text-xs">Заполняется вручную по результатам лабораторных исследований.</span>
            </div>
          )}

          {/* Blank QC entries for manual filling */}
          <div className="mt-4">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left font-medium">Тест</th>
                  <th className="p-2 text-left font-medium">Метод</th>
                  <th className="p-2 text-left font-medium">Результат</th>
                  <th className="p-2 text-left font-medium">Дата</th>
                  <th className="p-2 text-left font-medium w-24">Подпись</th>
                </tr>
              </thead>
              <tbody>
                {["Микоплазма", "Стерильность", "LAL-тест", "Жизнеспособность"].map((test) => (
                  <tr key={test} className="border-t h-10">
                    <td className="p-2 text-xs">{test}</td>
                    <td className="p-2">&nbsp;</td>
                    <td className="p-2">&nbsp;</td>
                    <td className="p-2">&nbsp;</td>
                    <td className="p-2">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---- Signatures ---- */}
        <div className="grid gap-8 sm:grid-cols-2 pt-8 border-t">
          <SignatureBlock label="Исполнитель" />
          <SignatureBlock label="Проверил" />
        </div>

        {/* ---- Footer ---- */}
        <DocFooter />
      </div>
    )
  }

  // ==========================================================================
  //  Loading / Empty states
  // ==========================================================================

  if (loading) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Загрузка данных для документа...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center text-destructive">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-60" />
            <p className="font-medium">{error}</p>
            <Button variant="link" className="mt-4" onClick={() => router.back()}>
              Назад
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!lotId && !bankId && !cultureId) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Выберите лот, банк или культуру для генерации документа</p>
            <p className="text-sm mt-1">
              Используйте параметры <code>?lot_id=</code>, <code>?bank_id=</code> или{" "}
              <code>?culture_id=</code>
            </p>
            <Button variant="link" className="mt-4" onClick={() => router.push("/cultures")}>
              Перейти к культурам
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ==========================================================================
  //  Main render
  // ==========================================================================

  return (
    <>
      <PrintStyles />
      <div className="container mx-auto py-6 max-w-4xl">
        {/* ---- Screen-only header & controls ---- */}
        <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Документы</h1>
            <p className="text-muted-foreground text-sm">
              Генерация рабочего журнала и паспорта культуры
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Download className="mr-2 h-4 w-4" />
              Скачать PDF
            </Button>
          </div>
        </div>

        {/* ---- Tabs ---- */}
        <Tabs
          value={docType}
          onValueChange={(v) => setDocType(v as "worksheet" | "passport")}
          className="no-print mb-6"
        >
          <TabsList>
            <TabsTrigger value="worksheet">
              <FlaskConical className="mr-2 h-4 w-4" />
              Рабочий журнал
            </TabsTrigger>
            <TabsTrigger value="passport">
              <Package className="mr-2 h-4 w-4" />
              Паспорт культуры
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ---- Document content (printable area) ---- */}
        <Card>
          <CardContent className="pt-6" id="document-print-area">
            {docType === "worksheet" ? renderWorksheet() : renderPassport()}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Reusable sub-components
// ---------------------------------------------------------------------------

/** Labelled field */
function Field({
  label,
  value,
  children,
}: {
  label: string
  value?: string | number | null
  children?: React.ReactNode
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      {children ?? <p className="font-semibold text-sm">{value ?? "\u2014"}</p>}
    </div>
  )
}

/** Signature block (Исполнитель / Проверил) */
function SignatureBlock({ label }: { label: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-10">{label}</p>
      <div className="flex items-end gap-4">
        <div className="flex-1 border-b border-foreground/30" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">/ подпись /</span>
      </div>
      <div className="flex items-end gap-4 mt-4">
        <div className="flex-1 border-b border-foreground/30" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">/ дата /</span>
      </div>
    </div>
  )
}

/** Document footer */
function DocFooter() {
  return (
    <div className="text-center text-xs text-muted-foreground pt-4 border-t mt-6">
      <p>
        Документ сгенерирован {format(new Date(), "dd MMMM yyyy HH:mm", { locale: ru })}
      </p>
      <p className="mt-0.5">LabPro — Система управления клеточными культурами</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page wrapper with Suspense (required for useSearchParams)
// ---------------------------------------------------------------------------

function DocumentsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-6 max-w-4xl">
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Загрузка...</p>
          </div>
        </div>
      }
    >
      <DocumentsContent />
    </Suspense>
  )
}

export default DocumentsPage
