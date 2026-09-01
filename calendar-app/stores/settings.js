import { reactive } from 'vue'
import { storage, STORAGE_KEYS } from '../services/storage.js'

export const settingsStore = reactive({ locale: 'zh-CN', localFirst: true, allowServer: false, serverUrl: 'http://127.0.0.1:21512', calendarName: '我的日历', calendarId: 'default', reminder: '事件开始时' })
export function hydrateSettings() { Object.assign(settingsStore, storage.read(STORAGE_KEYS.settings, {}) || {}); return settingsStore }
export function updateSettings(patch) { Object.assign(settingsStore, patch); storage.write(STORAGE_KEYS.settings, { ...settingsStore }); return settingsStore }
