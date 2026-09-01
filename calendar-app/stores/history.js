import { ref, computed } from 'vue'
import { storage, STORAGE_KEYS } from '../services/storage.js'
import { enqueue } from '../services/sync.js'

export const historyItems = ref([])
export const historyFilter = ref('all')
export const filteredHistory = computed(() => historyItems.value.filter(item => historyFilter.value === 'all' || item.status === historyFilter.value))
export function hydrateHistory() { historyItems.value = storage.read(STORAGE_KEYS.history, []) || []; return historyItems.value }
export function saveHistory(item) { historyItems.value.unshift(item); storage.write(STORAGE_KEYS.history, historyItems.value); enqueue({ entityType: 'request', entityId: item.id, payload: item }); return item }
export function removeHistory(id) { historyItems.value = historyItems.value.filter(item => item.id !== id); storage.write(STORAGE_KEYS.history, historyItems.value); enqueue({ entityType: 'request', entityId: id, operation: 'delete', payload: { id } }) }
