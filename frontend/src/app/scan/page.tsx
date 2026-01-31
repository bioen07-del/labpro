import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QrCode, Package, FlaskConical, FileBox, Building2 } from 'lucide-react'
import Link from 'next/link'

export default function ScanPage() {
  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Сканирование QR-кода</h1>
        <p className="text-muted-foreground">
          Отсканируйте QR-код для быстрого перехода к объекту
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <QrCode className="h-5 w-5" />
            Сканировать код
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 mb-4">
            <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              Нажмите кнопку ниже для активации камеры
            </p>
            <Button size="lg">
              <QrCode className="mr-2 h-4 w-4" />
              Сканировать QR
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Или введите код вручную
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ручной ввод кода</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Введите код объекта
              </label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Например: CT-0001-L1-P4-FL-003" 
                  className="font-mono"
                />
                <Button>Найти</Button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Форматы кодов:</p>
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <code className="bg-muted px-2 py-0.5 rounded text-xs">
                    CT-0001-L1-P4-FL-003
                  </code>
                  <span className="text-xs">— Контейнер</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileBox className="h-4 w-4" />
                  <code className="bg-muted px-2 py-0.5 rounded text-xs">
                    BK-0001
                  </code>
                  <span className="text-xs">— Банк</span>
                </div>
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-4 w-4" />
                  <code className="bg-muted px-2 py-0.5 rounded text-xs">
                    RM-0001
                  </code>
                  <span className="text-xs">— Готовая среда</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <code className="bg-muted px-2 py-0.5 rounded text-xs">
                    POS-1234
                  </code>
                  <span className="text-xs">— Позиция</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Последние сканирования</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <QrCode className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Нет недавних сканирований</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
