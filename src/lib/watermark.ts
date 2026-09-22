// Aplica marca d'água diagonal repetida em toda a imagem
export async function aplicarMarcaDagua(file: File, texto: string = 'CLICKEFOTOS'): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Não foi possível criar canvas'))
        return
      }

      // Desenha a imagem original
      ctx.drawImage(img, 0, 0)

      // Configura a marca d'água
      const fontSize = Math.max(40, Math.floor(img.width / 15))
      ctx.font = `bold ${fontSize}px sans-serif`
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)'
      ctx.lineWidth = 2
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // Rotação -30 graus
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate(-Math.PI / 6)
      ctx.translate(-canvas.width / 2, -canvas.height / 2)

      // Padrão repetido diagonal
      const stepX = fontSize * 8
      const stepY = fontSize * 4

      for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
        for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
          // Deslocamento alternado pra criar padrão diagonal
          const offsetX = (Math.floor(y / stepY) % 2) * (stepX / 2)
          ctx.strokeText(texto, x + offsetX, y)
          ctx.fillText(texto, x + offsetX, y)
        }
      }

      // Central marca d'água maior
      ctx.font = `bold ${Math.floor(img.width / 8)}px sans-serif`
      ctx.strokeText('CLICKEFOTOS', canvas.width / 2, canvas.height / 2)
      ctx.fillText('CLICKEFOTOS', canvas.width / 2, canvas.height / 2)

      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url)
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Falha ao gerar imagem'))
        }
      }, file.type || 'image/jpeg', 0.85)
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Falha ao carregar imagem'))
    }

    img.src = url
  })
}
