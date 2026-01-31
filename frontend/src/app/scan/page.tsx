"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Camera, 
  Search, 
  QrCode,
  Package,
  FlaskConical,
  Thermometer,
  ArrowRight,
  X,
  CheckCircle2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getPositionByQR } from "@/lib/api"
import { format } from "date-fns"
import { ru } from "date-fns/locale"

const OBJECT_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  container: { label: "Контейнер", icon: Package, color: "bg-blue-500" },
  position: { label: "Позиция", icon: Thermometer, color: "bg-green-500" },
  ready_medium: { label: "Готовая среда", icon: FlaskConical, color: "bg-purple-500" },
  equipment: { label: "Оборудование", icon: Thermometer, color: "bg-orange-500" },
}

export default function ScanPage() {
  const router = useRouter()
  const [scanMode, setScanMode] = useState<"camera" | "manual">("manual")
  const [qrInput, setQrInput] = useState("")
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [resultType, setResultType] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanHistory, setScanHistory] = useState<Array<{ code: string; type: string; time: Date }>>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setScanMode("camera")
      setScanning(true)
    } catch (err) {
      setError("Не удалось получить доступ к камере")
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setScanning(false)
  }

  const handleScan = async (code: string) => {
    if (!code) return
    
    setError(null)
    setResult(null)
    setResultType(null)
    
    try {
      // Пробуем разные типы объектов
      let found = false
      
      // 1. Позиция
      try {
        const position = await getPositionByQR(code)
        if (position) {
          setResult(position)
          setResultType("position")
          setScanHistory(prev => [...prev, { code, type: "position", time: new Date() }])
          found = true
        }
      } catch (e) {
        // Продолжаем поиск
      }
      
      if (!found) {
        setError("Объект не найден")
      }
      
      setQrInput("")
    } catch (err) {
      setError("Ошибка при поиске объекта")
    }
  }

  const navigateToResult = () => {
    if (!result || !resultType) return
    
    switch (resultType) {
      case "container":
        router.push(`/containers/${result.id}`)
        break
      case "position":
        // Нет страницы для позиции, показываем детали
        break
      case "ready_medium":
        router.push(`/ready-media/${result.id}`)
        break
      case "equipment":
        router.push(`/equipment/${result.id}`)
        break
    }
  }

  const clearResult = () => {
    setResult(null)
    setResultType(null)
    setError(null)
  }

  const getTypeInfo = (type: string) => {
    return OBJECT_TYPES[type] || { label: type, icon: QrCode, color: "bg-gray-500" }
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">QR Сканирование</h1>
        <p className="text-muted-foreground">Сканируйте QR-код для быстрого поиска объекта</p>
      </div>

      {/* Scan Mode Selection */}
      <div className="flex justify-center gap-4 mb-8">
        <Button
          variant={scanMode === "manual" ? "default" : "outline"}
          onClick={() => {
            stopCamera()
            setScanMode("manual")
          }}
        >
          <Search className="mr-2 h-4 w-4" />
          Ввод кода
        </Button>
        <Button
          variant={scanMode === "camera" ? "default" : "outline"}
          onClick={startCamera}
        >
          <Camera className="mr-2 h-4 w-4" />
          Камера
        </Button>
      </div>

      {/* Manual Input */}
      {scanMode === "manual" && (
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Input
                placeholder="Введите или вставьте QR-код..."
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan(qrInput)}
                className="flex-1"
              />
              <Button onClick={() => handleScan(qrInput)} disabled={!qrInput}>
                <Search className="mr-2 h-4 w-4" />
                Поиск
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Camera View */}
      {scanMode === "camera" && (
        <Card className="mb-8 overflow-hidden">
          <div className="relative aspect-video bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-white rounded-lg relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-blue-500 animate-pulse" />
                </div>
              </div>
            )}
          </div>
          <CardContent className="pt-4">
            <div className="flex justify-center gap-4">
              {!scanning ? (
                <Button onClick={startCamera}>
                  <Camera className="mr-2 h-4 w-4" />
                  Включить камеру
                </Button>
              ) : (
                <Button variant="outline" onClick={stopCamera}>
                  <X className="mr-2 h-4 w-4" />
                  Выключить
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="mb-8 border-red-200 bg-red-50">
          <CardContent className="py-4 text-center text-red-600">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && resultType && (
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getTypeInfo(resultType).color}`}>
                  {(() => {
                    const Icon = getTypeInfo(resultType).icon
                    return <Icon className="h-5 w-5 text-white" />
                  })()}
                </div>
                <div>
                  <CardTitle>{getTypeInfo(resultType).label}</CardTitle>
                  <CardDescription>
                    Найден: {format(new Date(), "HH:mm:ss")}
                  </CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearResult}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Container */}
              {resultType === "container" && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Код</p>
                      <p className="font-semibold text-lg">{result.code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Статус</p>
                      <Badge>{result.status}</Badge>
                    </div>
                  </div>
                  {result.lot?.culture && (
                    <div>
                      <p className="text-sm text-muted-foreground">Культура</p>
                      <p className="font-semibold">{result.lot.culture.name}</p>
                    </div>
                  )}
                  <Button className="w-full" onClick={navigateToResult}>
                    Открыть карточку
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Position */}
              {resultType === "position" && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Путь</p>
                      <p className="font-semibold text-lg">{result.path}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Оборудование</p>
                      <p className="font-semibold">{result.equipment?.name || "—"}</p>
                    </div>
                  </div>
                </>
              )}

              {/* Ready Medium */}
              {resultType === "ready_medium" && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Название</p>
                      <p className="font-semibold text-lg">{result.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Код</p>
                      <p className="font-semibold">{result.code}</p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Объём</p>
                      <p className="font-semibold">{result.volume_ml} мл</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Срок годности</p>
                      <p className="font-semibold">
                        {result.expiration_date 
                          ? format(new Date(result.expiration_date), "dd MMM yyyy", { locale: ru })
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <Button className="w-full" onClick={navigateToResult}>
                    Открыть карточку
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}

              {/* Equipment */}
              {resultType === "equipment" && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Название</p>
                      <p className="font-semibold text-lg">{result.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Тип</p>
                      <p className="font-semibold">{result.type}</p>
                    </div>
                  </div>
                  {result.current_temperature !== undefined && (
                    <div>
                      <p className="text-sm text-muted-foreground">Температура</p>
                      <p className="font-semibold text-2xl">{result.current_temperature}°C</p>
                    </div>
                  )}
                  <Button className="w-full" onClick={navigateToResult}>
                    Открыть карточку
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">История сканирований</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {scanHistory.slice(-5).reverse().map((item, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <div>
                      <p className="font-medium">{getTypeInfo(item.type).label}</p>
                      <p className="text-sm text-muted-foreground">{item.code}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(item.time, "HH:mm")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
