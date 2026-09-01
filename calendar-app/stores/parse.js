import { reactive } from 'vue'
import { createRequestId } from '../utils/id.js'
import { parseText } from '../services/parse.js'

export const parseStore = reactive({ requestId: '', sourceType: 'text', sourceText: '', stage: 'IDLE', result: null, error: null, cancelled: false })

export async function startParse(sourceText, { sourceType = 'text', parseMode = 'local', locale = 'zh-CN', timezone = 'Asia/Shanghai', allowServer = false } = {}) {
  parseStore.requestId = createRequestId(); parseStore.sourceType = sourceType; parseStore.sourceText = sourceText; parseStore.stage = 'PARSING'; parseStore.error = null; parseStore.cancelled = false
  try {
    parseStore.result = await parseText({ requestId: parseStore.requestId, text: sourceText, locale, now: new Date().toISOString(), timezone, schemaVersion: '1.0', parseMode }, { allowServer })
    parseStore.stage = 'PARSED'; return parseStore.result
  } catch (error) { parseStore.stage = 'ERROR'; parseStore.error = { code: error.code || 'MODEL_INVALID_JSON', message: error.message }; throw error }
}

export function cancelParse() { parseStore.cancelled = true; if (parseStore.stage === 'PARSING') parseStore.stage = 'IDLE' }
export function selectEvent(localId, selected) { const event = parseStore.result?.events?.find(item => item.localId === localId); if (event) event.selected = selected }
