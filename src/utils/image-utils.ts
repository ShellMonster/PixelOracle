import SparkMD5 from 'spark-md5'

/**
 * 压缩图片到指定最大尺寸
 * @param file - 图片文件或Blob
 * @param maxWidth - 最大宽度（默认1024px）
 * @returns 压缩后的Blob
 */
export async function compressImage(file: File | Blob, maxWidth = 1024): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      
      // 计算压缩后的尺寸（保持宽高比）
      let width = img.naturalWidth
      let height = img.naturalHeight
      
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        } else {
          width = Math.round((width * maxWidth) / height)
          height = maxWidth
        }
      }
      
      // 创建canvas并绘制
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      
      ctx.drawImage(img, 0, 0, width, height)
      
      // 转换为Blob（JPEG格式，质量0.8）
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        'image/jpeg',
        0.8
      )
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    
    img.src = url
  })
}

/**
 * 将Blob转换为Base64字符串
 * @param blob - 图片Blob
 * @returns Base64字符串（不含data:url前缀）
 */
export async function imageToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      // 移除 data:image/xxx;base64, 前缀
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(blob)
  })
}

/**
 * 将Blob转换为Data URL
 * @param blob - 图片Blob
 * @returns Data URL字符串
 */
export async function imageToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(blob)
  })
}

/**
 * 计算Base64数据的MD5哈希
 * @param base64Data - Base64字符串
 * @returns MD5哈希值（小写十六进制）
 */
export function calculateMD5(base64Data: string): string {
  const spark = new SparkMD5()
  spark.append(base64Data)
  return spark.end()
}

/**
 * 从URL获取图片Blob（处理跨域）
 * @param url - 图片URL
 * @returns 图片Blob
 */
export async function getImageFromUrl(url: string): Promise<Blob> {
  // 首先尝试直接fetch
  try {
    const response = await fetch(url, {
      mode: 'cors',
      credentials: 'omit',
    })
    if (response.ok) {
      return await response.blob()
    }
  } catch {
    // 直接fetch失败，尝试其他方式
  }
  
  // 尝试通过canvas获取（适用于同源或CORS允许的图片）
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }
      
      try {
        ctx.drawImage(img, 0, 0)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to convert image to blob'))
            }
          },
          'image/jpeg',
          0.9
        )
      } catch (error) {
        reject(new Error('CORS error: Unable to access image data'))
      }
    }
    
    img.onerror = () => {
      reject(new Error('Failed to load image from URL'))
    }
    
    img.src = url
    
    // 如果是data URL直接返回
    if (url.startsWith('data:')) {
      const blob = dataURLtoBlob(url)
      resolve(blob)
    }
  })
}

/**
 * Data URL转Blob
 * @param dataURL - Data URL字符串
 * @returns Blob对象
 */
export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  
  return new Blob([u8arr], { type: mime })
}

/**
 * 处理图片并计算MD5（完整流程）
 * @param source - 图片源（File、Blob或URL）
 * @returns 包含压缩后Blob、Base64和MD5的对象
 */
export async function processImage(source: File | Blob | string): Promise<{
  blob: Blob
  base64: string
  dataURL: string
  md5: string
}> {
  let blob: Blob
  
  // 获取Blob
  if (typeof source === 'string') {
    blob = await getImageFromUrl(source)
  } else {
    blob = source
  }
  
  // 压缩图片
  const compressedBlob = await compressImage(blob)
  
  // 转换为Base64和Data URL
  const base64 = await imageToBase64(compressedBlob)
  const dataURL = await imageToDataURL(compressedBlob)
  
  // 计算MD5
  const md5 = calculateMD5(base64)
  
  return {
    blob: compressedBlob,
    base64,
    dataURL,
    md5,
  }
}
