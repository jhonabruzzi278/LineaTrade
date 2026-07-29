export interface PixelCrop {
  x: number
  y: number
  width: number
  height: number
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('No se pudo cargar la imagen.')))
    image.src = src
  })
}

// Recorta `imageSrc` al rectángulo `crop` (en píxeles de la imagen original,
// tal como lo entrega react-easy-crop vía onCropComplete) usando un canvas
// offscreen, y devuelve el resultado como File listo para subir con
// uploadAvatar (que espera size/type de un File real, no un Blob suelto).
export async function getCroppedImageFile(
  imageSrc: string,
  crop: PixelCrop,
  fileName: string,
  mimeType: string,
): Promise<File> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = crop.width
  canvas.height = crop.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo procesar la imagen.')

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType))
  if (!blob) throw new Error('No se pudo procesar la imagen.')

  return new File([blob], fileName, { type: mimeType })
}
