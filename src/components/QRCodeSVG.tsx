'use client'

import { useEffect, useRef } from 'react'

interface Props {
  value: string
  size?: number
}

export default function QRCodeSVG({ value, size = 256 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Gera QR Code usando a lib qrcode-generator via window (CDN)
    // Aqui implemento uma versão simples usando API externa gratuita
    const img = new Image()
    const encoded = encodeURIComponent(value)
    img.crossOrigin = 'anonymous'
    img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}&bgcolor=ffffff&color=000000`
    img.onload = () => {
      const ctx = canvasRef.current?.getContext('2d')
      if (ctx && canvasRef.current) {
        canvasRef.current.width = size
        canvasRef.current.height = size
        ctx.drawImage(img, 0, 0, size, size)
      }
    }
  }, [value, size])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, maxWidth: '100%' }}
      className="rounded-xl"
    />
  )
}
