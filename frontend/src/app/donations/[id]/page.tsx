"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { getDonationById } from "@/lib/api"

/**
 * Redirect page: /donations/[id] → /donors/[donorId]/donations/[id]
 */
export default function DonationRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getDonationById(id)
      .then((donation) => {
        if (donation?.donor_id) {
          router.replace(`/donors/${donation.donor_id}/donations/${id}`)
        } else {
          setError("Донор не найден для этой донации")
        }
      })
      .catch(() => {
        setError("Донация не найдена")
      })
  }, [id, router])

  if (error) {
    return (
      <div className="container py-10 text-center text-muted-foreground">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="container py-10 flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}
