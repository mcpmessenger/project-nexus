"use client"

import { useState } from "react"
import Image from "next/image"
import { Server } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MCPServer } from "@/lib/types"

interface ServerLogoProps {
  server: MCPServer | { logo_url?: string | null; name?: string } | null
  size?: number
  className?: string
}

export function ServerLogo({ server, size = 16, className = "" }: ServerLogoProps) {
  const [imageError, setImageError] = useState(false)
  const logoUrl = server?.logo_url

  if (!server || !logoUrl || imageError) {
    const iconSize = size === 14 ? "h-3.5 w-3.5" : size === 16 ? "h-4 w-4" : size === 20 ? "h-5 w-5" : `h-[${size}px] w-[${size}px]`
    return <Server className={cn(iconSize, "text-muted-foreground flex-shrink-0", className)} />
  }

  // Extract file extension to determine if it's an image
  const isImage = /\.(png|jpg|jpeg|svg|webp|gif)$/i.test(logoUrl)

  if (!isImage) {
    const iconSize = size === 14 ? "h-3.5 w-3.5" : size === 16 ? "h-4 w-4" : size === 20 ? "h-5 w-5" : `h-[${size}px] w-[${size}px]`
    return <Server className={cn(iconSize, "text-muted-foreground flex-shrink-0", className)} />
  }

  return (
    <div className={cn("relative flex-shrink-0", className)} style={{ width: size, height: size }}>
      <Image
        src={logoUrl}
        alt={`${server.name || "Server"} logo`}
        width={size}
        height={size}
        className="rounded object-contain"
        style={{ width: size, height: size }}
        onError={() => setImageError(true)}
        unoptimized={logoUrl.endsWith('.svg') || logoUrl.endsWith('.webp')}
      />
    </div>
  )
}
