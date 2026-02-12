"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Plus, 
  Search, 
  Filter, 
  FlaskConical, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getQCTests, submitQCResult, getBanks, createAutoQCTests, getQCTestConfigs } from "@/lib/api"
import type { Bank, QCTestConfig } from "@/types"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-500",
  IN_PROGRESS: "bg-blue-500",
  COMPLETED: "bg-green-500",
  CANCELLED: "bg-gray-500",
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Ожидает",
  IN_PROGRESS: "В процессе",
  COMPLETED: "Завершён",
  CANCELLED: "Отменён",
}

const RESULT_LABELS: Record<string, string> = {
  PASSED: "Пройден",
  FAILED: "Не пройден",
}

const TEST_TYPE_LABELS_FALLBACK: Record<string, string> = {
  MYCOPLASMA: "Микоплазма",
  STERILITY: "Стерильность",
  LAL: "LAL-тест",
  VIA: "VIA",
}

export default function QCPage() {
  const router = useRouter()
  const [tests, setTests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedTest, setSelectedTest] = useState<any>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [result, setResult] = useState<"PASSED" | "FAILED">("PASSED")
  const [resultNotes, setResultNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [quarantineBanks, setQuarantineBanks] = useState<Bank[]>([])
  const [creatingTests, setCreatingTests] = useState(false)
  const [qcConfigs, setQcConfigs] = useState<QCTestConfig[]>([])
  const [numericValue, setNumericValue] = useState("")

  useEffect(() => {
    loadTests()
  }, [])

  const loadTests = async () => {
    try {
      const [data, banksData, configs] = await Promise.all([
        getQCTests(),
        getBanks({ status: 'QUARANTINE' }),
        getQCTestConfigs(false).catch(() => []),
      ])
      setTests(data || [])
      setQcConfigs(configs || [])
      // Banks on quarantine without any QC tests
      const testTargetIds = new Set((data || []).map((t: any) => t.target_id))
      setQuarantineBanks(
        ((banksData || []) as Bank[]).filter(b => !testTargetIds.has(b.id))
      )
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTestsForBank = async (bankId: string) => {
    setCreatingTests(true)
    try {
      await createAutoQCTests(bankId)
      await loadTests()
    } catch (err) {
      console.error(err)
    } finally {
      setCreatingTests(false)
    }
  }

  const handleSubmitResult = async () => {
    if (!selectedTest) return

    setIsSubmitting(true)
    try {
      const config = getTestConfig(selectedTest.test_type)
      let finalResult = result
      let resultsData: Record<string, unknown> | undefined

      // For NUMERIC tests: auto-determine PASSED/FAILED and save value
      if (config?.result_type === 'NUMERIC' && numericValue !== '') {
        const val = Number(numericValue)
        resultsData = { value: val, unit: config.unit }
        const inRange =
          (config.ref_min == null || val >= config.ref_min) &&
          (config.ref_max == null || val <= config.ref_max)
        finalResult = inRange ? 'PASSED' : 'FAILED'
      }

      await submitQCResult(selectedTest.id, finalResult, resultNotes, resultsData)
      setShowResultModal(false)
      setSelectedTest(null)
      setResultNotes("")
      setNumericValue("")
      loadTests()
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper: get test type label from configs or fallback
  const getTestTypeLabel = (testType: string) => {
    const config = qcConfigs.find(c => c.code === testType)
    return config?.name || TEST_TYPE_LABELS_FALLBACK[testType] || testType
  }

  // Helper: get config for test type
  const getTestConfig = (testType: string) => qcConfigs.find(c => c.code === testType)

  const filteredTests = tests.filter(test => {
    const matchesFilter = filter === "all" || test.status === filter
    const testLabel = getTestTypeLabel(test.test_type)
    const matchesSearch = !search ||
      test.id.toLowerCase().includes(search.toLowerCase()) ||
      testLabel.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const pendingTests = filteredTests.filter(t => t.status === "PENDING")
  const inProgressTests = filteredTests.filter(t => t.status === "IN_PROGRESS")
  const completedTests = filteredTests.filter(t => t.status === "COMPLETED")

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">QC-тесты</h1>
          <p className="text-muted-foreground">Контроль качества культур и материалов</p>
        </div>
        <Link href="/qc/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Новый тест
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ожидают</p>
                <p className="text-2xl font-bold">{pendingTests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FlaskConical className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">В процессе</p>
                <p className="text-2xl font-bold">{inProgressTests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Пройдено</p>
                <p className="text-2xl font-bold">
                  {completedTests.filter(t => t.result === "PASSED").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Не пройдено</p>
                <p className="text-2xl font-bold">
                  {completedTests.filter(t => t.result === "FAILED").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quarantine banks without tests */}
      {quarantineBanks.length > 0 && (
        <div className="mb-6 space-y-2">
          {quarantineBanks.map(bank => (
            <div key={bank.id} className="flex items-center justify-between p-4 rounded-lg border border-yellow-300 bg-yellow-50">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-sm">
                    Банк {bank.code || bank.id.slice(0, 8)} ({bank.bank_type}) — на карантине без QC-тестов
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Создан {format(new Date(bank.created_at), "dd MMM yyyy", { locale: ru })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/banks/${bank.id}`}>
                  <Button variant="outline" size="sm">Банк</Button>
                </Link>
                <Button
                  size="sm"
                  disabled={creatingTests}
                  onClick={() => handleCreateTestsForBank(bank.id)}
                >
                  {creatingTests ? "Создание..." : "Создать 4 теста"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">Все</TabsTrigger>
            <TabsTrigger value="PENDING">Ожидают</TabsTrigger>
            <TabsTrigger value="IN_PROGRESS">В процессе</TabsTrigger>
            <TabsTrigger value="COMPLETED">Завершены</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Tests List */}
      <div className="space-y-4">
        {filteredTests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Тесты не найдены
            </CardContent>
          </Card>
        ) : (
          filteredTests.map(test => (
            <Card key={test.id} className="hover:bg-muted/50 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <FlaskConical className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {getTestTypeLabel(test.test_type)}
                        </p>
                        <Badge className={STATUS_COLORS[test.status]}>
                          {STATUS_LABELS[test.status]}
                        </Badge>
                        {test.result && (
                          <Badge variant={test.result === "PASSED" ? "default" : "destructive"}>
                            {RESULT_LABELS[test.result]}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {test.target_type === 'BANK' ? (
                          <Link href={`/banks/${test.target_id}`} className="text-blue-600 hover:underline">
                            Банк → {test.target_id.slice(0, 8)}
                          </Link>
                        ) : (
                          <>Объект: {test.target_type} → {test.target_id.slice(0, 8)}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Создан: {format(new Date(test.created_at), "dd MMM yyyy", { locale: ru })}
                    </p>
                    {test.completed_at && (
                      <p className="text-sm text-muted-foreground">
                        Завершён: {format(new Date(test.completed_at), "dd MMM yyyy", { locale: ru })}
                      </p>
                    )}
                    {test.status === "PENDING" && (
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          setSelectedTest(test)
                          setShowResultModal(true)
                        }}
                      >
                        Внести результат
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Result Modal */}
      {showResultModal && selectedTest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle>Результат теста</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                const config = getTestConfig(selectedTest.test_type)
                const isNumeric = config?.result_type === 'NUMERIC'
                return (
                  <>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="font-medium">{getTestTypeLabel(selectedTest.test_type)}</p>
                      <p className="text-sm text-muted-foreground">
                        Объект: {selectedTest.target_type}
                      </p>
                      {config?.methodology && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Методика: {config.methodology}
                        </p>
                      )}
                    </div>

                    {isNumeric ? (
                      <div>
                        <p className="text-sm font-medium mb-2">
                          Значение {config?.unit ? `(${config.unit})` : ''} *
                        </p>
                        <Input
                          type="number"
                          step="any"
                          value={numericValue}
                          onChange={(e) => setNumericValue(e.target.value)}
                          placeholder="Введите числовое значение..."
                        />
                        {config?.ref_min != null || config?.ref_max != null ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            Референс: {config?.ref_min != null ? config.ref_min : '—'} — {config?.ref_max != null ? config.ref_max : '—'} {config?.unit || ''}
                          </p>
                        ) : null}
                        {numericValue !== '' && (config?.ref_min != null || config?.ref_max != null) && (
                          <div className="mt-2">
                            {(() => {
                              const val = Number(numericValue)
                              const inRange =
                                (config?.ref_min == null || val >= config.ref_min) &&
                                (config?.ref_max == null || val <= config.ref_max)
                              return (
                                <Badge variant={inRange ? "default" : "destructive"}>
                                  {inRange ? '✓ В пределах нормы' : '✗ Вне нормы'}
                                </Badge>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-medium mb-2">Результат *</p>
                        <div className="flex gap-2">
                          <Button
                            variant={result === "PASSED" ? "default" : "outline"}
                            className="flex-1"
                            onClick={() => setResult("PASSED")}
                          >
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Пройден
                          </Button>
                          <Button
                            variant={result === "FAILED" ? "destructive" : "outline"}
                            className="flex-1"
                            onClick={() => setResult("FAILED")}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Не пройден
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              <div>
                <label className="text-sm font-medium">Примечания</label>
                <textarea
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                  className="w-full mt-1 p-3 border rounded-lg"
                  rows={3}
                  placeholder="Дополнительные заметки..."
                />
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowResultModal(false)
                    setSelectedTest(null)
                  }}
                >
                  Отмена
                </Button>
                <Button onClick={handleSubmitResult} disabled={isSubmitting}>
                  {isSubmitting ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
