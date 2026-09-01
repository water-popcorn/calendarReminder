export function readSharedContent(options = {}) {
  const text = options.text || options.content || ''
  const uri = options.uri || options.imageUri || ''
  return { sourceType: uri ? 'image' : 'share', text: text ? decodeURIComponent(text) : '', uri }
}
