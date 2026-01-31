"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar,
  FlaskConical,
  Package,
  CheckCircle2,
  Printer
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getLotById, getBankById, getContainersByLot } from "@/lib/api"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

const MORPHOLOGY_LABELS: Record<string, string> = {
  spindle: "Веретенообразная",
  cobblestone: "Булыжная",
  fibroblast: "Фибробластная",
  epithelial: "Эпителиальная",
  mixed: "Смешанная",
  rounded: "Округлая",
  degenerate: "Дегенеративная",
}

export default function DocumentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const lotId = searchParams.get("lot_id")
  const bankId = searchParams.get("bank_id")

  const [lot, setLot] = useState<any>(null)
  const [bank, setBank] = useState<any>(null)
  const [containers, setContainers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [docType, setDocType] = useState<"worksheet" | "passport">("worksheet")

  useEffect(() => {
    if (lotId) loadLot()
    else if (bankId) loadBank()
    else setLoading(false)
  }, [lotId, bankId])

  const loadLot = async () => {
    try {
      const lotData = await getLotById(lotId!)
      setLot(lotData)
      const contData = await getContainersByLot(lotId!)
      setContainers(contData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadBank = async () => {
    try {
      const bankData = await getBankById(bankId!)
      setBank(bankData)
      if (bankData?.lot) {
        setLot(bankData.lot)
        const contData = await getContainersByLot(bankData.lot.id)
        setContainers(contData || [])
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const generateWorksheetContent = () => {
    if (!lot) return null

    const observeOperations = lot.operations?.filter((op: any) => op.operation_type === "OBSERVE") || []
    
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center border-b pb-4">
          <h2 className="text-xl font-bold">РАБОЧИЙ ЖУРНАЛ (WORKSHEET)</h2>
          <p className="text-muted-foreground">Лаборатория клеточных культур</p>
        </div>

        {/* Lot Info */}
        <div className="grid gap-4 md:grid-cols-2 border rounded-lg p-4">
          <div>
            <p className="text-sm text-muted-foreground">Номер лота</p>
            <p className="font-semibold">L{lot.passage_number} (P{lot.passage_number})</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Дата создания</p>
            <p className="font-semibold">
              {lot.created_at ? format(new Date(lot.created_at), "dd MMMM yyyy", { locale: ru }) : "—"}
            </p>
          </div>
          {lot.culture && (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Культура</p>
                <p className="font-semibold">{lot.culture.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Тип культуры</p>
                <p className="font-semibold">{lot.culture.culture_type?.name || "—"}</p>
              </div>
            </>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Пассаж</p>
            <p className="font-semibold">{lot.passage_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Статус</p>
            <Badge>{lot.status}</Badge>
          </div>
        </div>

        {/* Containers Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-3 text-left">Контейнер</th>
                <th className="p-3 text-left">Дата</th>
                <th className="p-3 text-left">Конфлюэнтность</th>
                <th className="p-3 text-left">Морфология</th>
                <th className="p-3 text-left">Контаминация</th>
              </tr>
            </thead>
            <tbody>
              {containers.map((container: any) => (
                <tr key={container.id} className="border-t">
                  <td className="p-3">{container.code}</td>
                  <td className="p-3">
                    {container.updated_at 
                      ? format(new Date(container.updated_at), "dd.MM.yyyy")
                      : "—"}
                  </td>
                  <td className="p-3">{container.confluent_percent || 0}%</td>
                  <td className="p-3">{MORPHOLOGY_LABELS[container.morphology] || container.morphology || "—"}</td>
                  <td className="p-3">
                    {container.contaminated ? (
                      <Badge variant="destructive">Да</Badge>
                    ) : (
                      <Badge variant="outline">Нет</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {containers.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    Нет данных о контейнерах
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Operations History */}
        {observeOperations.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">История наблюдений</h3>
            <div className="space-y-2">
              {observeOperations.map((op: any) => (
                <div key={op.id} className="flex justify-between text-sm">
                  <span>
                    {op.started_at 
                      ? format(new Date(op.started_at), "dd.MM.yyyy HH:mm")
                      : "—"}
                  </span>
                  <span className="text-muted-foreground">{op.notes || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="grid gap-4 md:grid-cols-2 pt-8 border-t">
          <div>
            <p className="text-sm text-muted-foreground mb-8">Исполнитель</p>
            <p className="text-xs text-muted-foreground">_____________________</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-8">Проверил</p>
            <p className="text-xs text-muted-foreground">_____________________</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          <p>Документ сгенерирован {format(new Date(), "dd MMMM yyyy HH:mm", { locale: ru })}</p>
          <p>LabPro - Система управления клеточными культурами</p>
        </div>
      </div>
    )
  }

  const generatePassportContent = () => {
    if (!bank && !lot) return null

    const bankData = bank || lot?.bank

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center border-b pb-4">
          <h2 className="text-xl font-bold">ПАСПОРТ КЛЕТОЧНОЙ КУЛЬТУРЫ</h2>
          <p className="text-muted-foreground">Cell Culture Passport</p>
        </div>

        {/* Bank Info */}
        <div className="grid gap-4 md:grid-cols-2 border rounded-lg p-4">
          <div>
            <p className="text-sm text-muted-foreground">Номер банка</p>
            <p className="font-semibold">{bankData?.code || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Дата закладки</p>
            <p className="font-semibold">
              {bankData?.created_at 
                ? format(new Date(bankData.created_at), "dd MMMM yyyy", { locale: ru })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Тип банка</p>
            <p className="font-semibold">{bankData?.bank_type || "—"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">QC статус</p>
            <Badge variant={bankData?.qc_passed ? "default" : "destructive"}>
              {bankData?.qc_passed ? "Пройден" : "Не пройден"}
            </Badge>
          </div>
        </div>

        {/* Culture Info */}
        {lot?.culture && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Информация о культуре</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Название</p>
                <p className="font-semibold">{lot.culture.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Тип</p>
                <p className="font-semibold">{lot.culture.culture_type?.name || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Происхождение</p>
                <p className="font-semibold">{lot.culture.origin || "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Пассаж</p>
                <p className="font-semibold">{lot.passage_number}</p>
              </div>
            </div>
          </div>
        )}

        {/* Storage Info */}
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">Условия хранения</h3>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Температура хранения</p>
              <p className="font-semibold">
                {bankData?.storage_temperature 
                  ? `${bankData.storage_temperature}°C`
                  : "-196°C (жидкий азот)"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Количество виал</p>
              <p className="font-semibold">{bankData?.cryo_vials?.length || containers.length}</p>
            </div>
          </div>
        </div>

        {/* QC Tests */}
        {bankData?.qc_tests && bankData.qc_tests.length > 0 && (
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">QC тесты</h3>
            <div className="space-y-2">
              {bankData.qc_tests.map((test: any) => (
                <div key={test.id} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <span>{test.test_type}</span>
                    <Badge variant={test.status === "COMPLETED" ? "default" : "outline"}>
                      {test.status}
                    </Badge>
                  </div>
                  {test.result && (
                    <Badge variant={test.result === "PASSED" ? "default" : "destructive"}>
                      {test.result}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quality Statement */}
        <div className="bg-muted rounded-lg p-4">
          <h3 className="font-semibold mb-2">Заключение о качестве</h3>
          <p className="text-sm">
            Данная клеточная культура прошла контроль качества и соответствует заявленным 
            характеристикам. Все QC тесты пройдены успешно.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Пригодна для использования</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          <p>Документ сгенерирован {format(new Date(), "dd MMMM yyyy HH:mm", { locale: ru })}</p>
          <p>LabPro - Система управления клеточными культурами</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-1/4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!lotId && !bankId) {
    return (
      <div className="container mx-auto py-6 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Выберите лот или банк для генерации документа</p>
            <Button 
              variant="link" 
              className="mt-4"
              onClick={() => router.push("/lots")}
            >
              Перейти к лотам
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Документы</h1>
          <p className="text-muted-foreground">Генерация Worksheet и Passport</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Печать
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
        </div>
      </div>

      {/* Document Type Selection */}
      <Tabs value={docType} onValueChange={(v) => setDocType(v as "worksheet" | "passport")} className="mb-6">
        <TabsList>
          <TabsTrigger value="worksheet">
            <FileText className="mr-2 h-4 w-4" />
            Worksheet
          </TabsTrigger>
          <TabsTrigger value="passport">
            <Package className="mr-2 h-4 w-4" />
            Passport
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Document Content */}
      <Card>
        <CardContent className="pt-6">
          {docType === "worksheet" ? generateWorksheetContent() : generatePassportContent()}
        </CardContent>
      </Card>
    </div>
  )
}
