"use client"

import QRCode from "react-qr-code"
import { useRef } from "react"

interface QRLabelProps {
  code: string
  title: string
  subtitle?: string
  metadata?: Record<string, string>
}

export function QRLabel({ code, title, subtitle, metadata }: QRLabelProps) {
  const ref = useRef<HTMLDivElement>(null)

  const handlePrint = () => {
    const content = ref.current
    if (!content) return
    const win = window.open("", "_blank", "width=400,height=300")
    if (!win) return
    win.document.write(`
      <html><head><title>Этикетка</title>
      <style>
        body { margin: 0; padding: 8px; font-family: Arial, sans-serif; }
        .label { display: flex; gap: 12px; align-items: flex-start; }
        .info { flex: 1; }
        .title { font-weight: bold; font-size: 14px; margin-bottom: 4px; }
        .subtitle { font-size: 11px; color: #666; margin-bottom: 4px; }
        .code { font-family: monospace; font-size: 12px; margin-bottom: 4px; }
        .meta { font-size: 10px; color: #888; }
        @media print { body { margin: 0; } }
      </style></head><body>
      ${content.innerHTML}
      <script>window.print(); window.close();<\/script>
      </body></html>
    `)
    win.document.close()
  }

  return (
    <div>
      <div ref={ref} className="flex items-start gap-3 p-3 border rounded-lg bg-white">
        <QRCode value={code} size={80} level="M" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          <p className="font-mono text-xs mt-1">{code}</p>
          {metadata && (
            <div className="mt-1 space-y-0.5">
              {Object.entries(metadata).map(([k, v]) => (
                <p key={k} className="text-[10px] text-muted-foreground">
                  {k}: {v}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
      <button
        onClick={handlePrint}
        className="mt-2 text-xs text-blue-600 hover:underline"
      >
        Печать этикетки
      </button>
    </div>
  )
}
