<template>
  <view class="app-shell">
    <view class="ambient ambient-one"></view>
    <view class="ambient ambient-two"></view>

    <view class="topbar safe-top">
      <view class="brand-lockup">
        <view class="brand-mark"><text>◆</text></view>
        <view>
          <text class="eyebrow">CALENDAR COMPANION</text>
          <text class="brand-name">日历提醒助手</text>
        </view>
      </view>
      <button class="icon-button" aria-label="打开设置" @click="activeTab = 'settings'"><text>⚙</text></button>
    </view>

    <scroll-view class="page-scroll" scroll-y :show-scrollbar="false">
      <view v-if="activeTab === 'home'" class="page-content">
        <view class="hero-row">
          <view>
            <text class="greeting">{{ greeting }}，{{ userName }}</text>
            <text class="hero-title">把重要的事，<text class="accent-word">准时放进日历</text></text>
            <text class="hero-subtitle">端侧优先解析 · 内容不离开你的手机</text>
          </view>
          <view class="date-orbit">
            <text class="date-month">{{ monthLabel }}</text>
            <text class="date-day">{{ dayLabel }}</text>
            <text class="date-week">{{ weekdayLabel }}</text>
          </view>
        </view>

        <view class="status-strip">
          <view class="status-item"><view class="status-dot online"></view><text>端侧解析可用</text></view>
          <view class="status-divider"></view>
          <view class="status-item"><view class="status-dot" :class="serverOnline ? 'online' : 'offline'"></view><text>{{ serverOnline ? '电脑服务已连接' : '离线模式' }}</text></view>
          <view class="queue-count" v-if="outbox.length">{{ outbox.length }} 条待同步</view>
        </view>

        <view class="quick-actions">
          <view class="section-heading"><text>新建提醒</text><text class="section-note">选择一种输入方式</text></view>
          <view class="action-grid">
            <button class="action-card primary-action" @click="openTextInput">
              <view class="action-icon ink"><text>✦</text></view>
              <text class="action-title">粘贴文字</text>
              <text class="action-desc">从聊天或网页快速提取</text>
              <text class="action-arrow">↗</text>
            </button>
            <button class="action-card" @click="choosePhoto">
              <view class="action-icon teal"><text>▧</text></view>
              <text class="action-title">相册图片</text>
              <text class="action-desc">识别截图中的时间与事项</text>
              <text class="action-arrow">↗</text>
            </button>
            <button class="action-card compact" @click="takePhoto">
              <view class="action-icon coral"><text>◉</text></view>
              <text class="action-title">拍摄</text>
              <text class="action-desc">拍下纸面或白板</text>
              <text class="action-arrow">↗</text>
            </button>
          </view>
        </view>

        <view class="today-section">
          <view class="section-heading"><text>今天</text><text class="section-note">{{ todayEvents.length }} 个安排</text><button class="text-button" @click="openTextInput">＋ 添加</button></view>
          <view v-if="todayEvents.length" class="timeline">
            <view v-for="(event, index) in todayEvents" :key="event.id" class="timeline-row" @click="openEventDetail(event)">
              <view class="timeline-time"><text>{{ event.allDay ? '全天' : formatTime(event.startTime) }}</text><view class="timeline-line" v-if="index < todayEvents.length - 1"></view></view>
              <view class="event-card" :class="event.status === 'CREATED' ? 'created' : 'draft'">
                <view class="event-card-top"><text class="event-title">{{ event.title }}</text><text class="event-status">{{ statusLabel(event.status) }}</text></view>
                <text class="event-meta" v-if="event.location">⌖ {{ event.location }}</text>
                <text class="event-meta" v-else>{{ event.allDay ? '全天事件' : formatRange(event) }}</text>
                <view class="confidence-line"><view class="confidence-bar"><view :style="{ width: `${event.confidence * 100}%` }" :class="confidenceClass(event.confidence)"></view></view><text>{{ Math.round(event.confidence * 100) }}% 识别度</text></view>
              </view>
            </view>
          </view>
          <view v-else class="empty-state"><text class="empty-icon">◌</text><text>今天还没有安排</text><text class="empty-hint">从一段文字或一张图片开始</text></view>
        </view>

        <view class="recent-section">
          <view class="section-heading"><text>最近记录</text><button class="text-button" @click="activeTab = 'history'">查看全部 ›</button></view>
          <view v-if="history.length" class="history-list">
            <view v-for="item in history.slice(0, 3)" :key="item.id" class="history-row" @click="openHistory(item)">
              <view class="history-source" :class="item.source === 'image' ? 'source-image' : 'source-text'"><text>{{ item.source === 'image' ? '▧' : '✦' }}</text></view>
              <view class="history-main"><text class="history-title">{{ item.title }}</text><text class="history-date">{{ item.createdLabel }} · {{ item.eventCount }} 个事项</text></view>
              <text class="history-status" :class="item.status.toLowerCase()">{{ statusLabel(item.status) }}</text><text class="chevron">›</text>
            </view>
          </view>
          <view v-else class="history-empty">解析过的内容会出现在这里</view>
        </view>
      </view>

      <view v-else-if="activeTab === 'history'" class="page-content sub-page">
        <view class="sub-page-title"><text class="eyebrow">ARCHIVE</text><text class="hero-title small">历史记录</text><text class="hero-subtitle">最近解析、草稿与日历写入状态</text></view>
        <view class="filter-row"><button v-for="filter in filters" :key="filter.value" class="filter-chip" :class="{ selected: historyFilter === filter.value }" @click="historyFilter = filter.value">{{ filter.label }}</button></view>
        <view class="history-list full-list">
          <view v-for="item in filteredHistory" :key="item.id" class="history-row large" @click="openHistory(item)">
            <view class="history-source" :class="item.source === 'image' ? 'source-image' : 'source-text'"><text>{{ item.source === 'image' ? '▧' : '✦' }}</text></view>
            <view class="history-main"><text class="history-title">{{ item.title }}</text><text class="history-date">{{ item.createdLabel }} · {{ item.eventCount }} 个事项</text></view>
            <text class="history-status" :class="item.status.toLowerCase()">{{ statusLabel(item.status) }}</text><text class="chevron">›</text>
          </view>
          <view v-if="!filteredHistory.length" class="empty-state"><text class="empty-icon">◌</text><text>没有符合条件的记录</text></view>
        </view>
      </view>

      <view v-else class="page-content sub-page settings-page">
        <view class="sub-page-title"><text class="eyebrow">PREFERENCES</text><text class="hero-title small">设置</text><text class="hero-subtitle">控制解析方式、日历与数据同步</text></view>
        <view class="settings-group"><text class="group-label">解析与隐私</text>
          <view class="setting-row clickable" @click="showLanguagePicker"><view><text class="setting-title">界面语言</text><text class="setting-desc">{{ settings.locale === 'en-US' ? 'English' : '简体中文' }}</text></view><text class="chevron">›</text></view>
          <view class="setting-row"><view><text class="setting-title">端侧优先解析</text><text class="setting-desc">图片与文字默认只在本机处理</text></view><switch :checked="settings.localFirst" color="#0d716f" @change="toggleSetting('localFirst', $event.detail.value)" /></view>
          <view class="setting-row"><view><text class="setting-title">允许电脑服务解析</text><text class="setting-desc">仅在你同意后发送结构化文本</text></view><switch :checked="settings.allowServer" color="#0d716f" @change="toggleSetting('allowServer', $event.detail.value)" /></view>
        </view>
        <view class="settings-group"><text class="group-label">日历偏好</text>
          <view class="setting-row clickable" @click="showCalendarPicker"><view><text class="setting-title">默认目标日历</text><text class="setting-desc">{{ settings.calendarName }}</text></view><text class="chevron">›</text></view>
          <view class="setting-row clickable" @click="showReminderPicker"><view><text class="setting-title">默认提醒</text><text class="setting-desc">{{ reminderLabel }}</text></view><text class="chevron">›</text></view>
        </view>
        <view class="settings-group"><text class="group-label">账户与数据</text>
          <view class="setting-row clickable" @click="editServerUrl"><view><text class="setting-title">电脑服务地址</text><text class="setting-desc">{{ settings.serverUrl || '未配置' }}</text></view><text class="chevron">›</text></view>
          <view class="setting-row clickable" @click="showToast('登录功能将在连接电脑服务后启用')"><view><text class="setting-title">账户登录</text><text class="setting-desc">未登录 · 仅保留本机记录</text></view><text class="chevron">›</text></view>
          <view class="setting-row clickable" @click="exportData"><view><text class="setting-title">导出本地数据</text><text class="setting-desc">JSON 格式，不包含原始图片</text></view><text class="chevron">›</text></view>
          <view class="setting-row clickable danger" @click="clearHistory"><view><text class="setting-title">清除本机记录</text><text class="setting-desc">删除历史与草稿，不影响系统日历</text></view><text class="chevron">›</text></view>
        </view>
        <text class="version-label">Calendar Companion · Android 8.0+ · v1.0.0</text>
      </view>
    </scroll-view>

    <view class="bottom-nav safe-bottom">
      <button v-for="tab in tabs" :key="tab.value" class="nav-item" :class="{ active: activeTab === tab.value }" @click="activeTab = tab.value"><text class="nav-icon">{{ tab.icon }}</text><text>{{ tab.label }}</text></button>
    </view>

    <view v-if="sheet === 'text'" class="modal-backdrop" @click.self="sheet = ''"><view class="bottom-sheet input-sheet"><view class="sheet-handle"></view><view class="sheet-heading"><view><text class="sheet-kicker">TEXT INPUT</text><text class="sheet-title">粘贴一段文字</text></view><button class="close-button" @click="sheet = ''">×</button></view><textarea v-model="inputText" maxlength="10000" auto-height placeholder="例如：明天下午 3 点和设计团队开会，地点在 3 号会议室" class="text-area"></textarea><view class="input-footer"><text>{{ inputText.length }}/10000</text><button class="primary-button" :disabled="!inputText.trim()" @click="startParse('text')">开始解析 <text>↗</text></button></view></view></view>

    <view v-if="sheet === 'parsing'" class="modal-backdrop"><view class="center-dialog parsing-dialog"><view class="loader-ring"></view><text class="sheet-title">正在整理你的提醒</text><text class="parsing-stage">{{ parseStage }}</text><view class="progress-track"><view class="progress-value" :style="{ width: `${parseProgress}%` }"></view></view><button class="ghost-button" @click="cancelParse">取消</button></view></view>

    <view v-if="sheet === 'result'" class="modal-backdrop" @click.self="sheet = ''"><view class="bottom-sheet result-sheet"><view class="sheet-handle"></view><view class="sheet-heading"><view><text class="sheet-kicker">PARSE RESULT</text><text class="sheet-title">确认解析结果</text><text class="sheet-caption">{{ draftEvents.length }} 个事项 · {{ parseSource === 'image' ? '图片识别' : '端侧文字解析' }}</text></view><button class="close-button" @click="sheet = ''">×</button></view><view class="warning-banner" v-if="resultWarnings.length"><text>! </text><text>{{ resultWarnings[0] }}</text></view><scroll-view class="result-list" scroll-y><view v-for="(event, index) in draftEvents" :key="event.id" class="draft-event" :class="{ selected: event.selected }"><view class="draft-check" @click="toggleEvent(index)">{{ event.selected ? '✓' : '' }}</view><view class="draft-content" @click="editDraft(index)"><view class="draft-title-row"><text class="draft-title">{{ event.title || '未命名事项' }}</text><text class="confidence-tag" :class="confidenceClass(event.confidence)">{{ Math.round(event.confidence * 100) }}%</text></view><text class="draft-time">{{ event.allDay ? `${event.date} · 全天` : `${event.date} · ${formatRange(event)}` }}</text><text class="draft-location" v-if="event.location">⌖ {{ event.location }}</text><text class="needs-confirm" v-if="event.missingFields.length">需要补充：{{ event.missingFields.join('、') }}</text></view><text class="edit-mark">✎</text></view></scroll-view><view class="result-actions"><button class="secondary-button" @click="saveDraft">保存草稿</button><button class="primary-button" :disabled="!selectedEvents.length" @click="openConfirm">确认并创建 <text>↗</text></button></view></view></view>

    <view v-if="sheet === 'edit'" class="modal-backdrop" @click.self="sheet = 'result'"><view class="bottom-sheet edit-sheet"><view class="sheet-handle"></view><view class="sheet-heading"><view><text class="sheet-kicker">EDIT EVENT</text><text class="sheet-title">编辑事项</text></view><button class="close-button" @click="sheet = 'result'">×</button></view><view class="edit-form"><text class="field-label">标题</text><input v-model="editingEvent.title" class="field-input" placeholder="事项标题" /><view class="field-grid"><view><text class="field-label">日期</text><input v-model="editingEvent.date" class="field-input" type="date" /></view><view><text class="field-label">开始时间</text><input v-model="editingEvent.startTime" class="field-input" type="time" /></view></view><view class="field-grid"><view><text class="field-label">地点</text><input v-model="editingEvent.location" class="field-input" placeholder="可选" /></view><view><text class="field-label">提醒</text><picker :range="reminderOptions" @change="editingEvent.reminder = reminderOptions[$event.detail.value]"><view class="picker-value">{{ editingEvent.reminder }}</view></picker></view></view><text class="field-label">备注</text><textarea v-model="editingEvent.notes" class="field-input notes-input" placeholder="补充备注（可选）"></textarea></view><view class="result-actions"><button class="secondary-button" @click="sheet = 'result'">取消</button><button class="primary-button" @click="applyEdit">保存修改</button></view></view></view>

    <view v-if="sheet === 'confirm'" class="modal-backdrop" @click.self="sheet = 'result'"><view class="bottom-sheet confirm-sheet"><view class="sheet-handle"></view><view class="sheet-heading"><view><text class="sheet-kicker">READY TO CREATE</text><text class="sheet-title">写入系统日历</text><text class="sheet-caption">将创建 {{ selectedEvents.length }} 个提醒事件</text></view><button class="close-button" @click="sheet = 'result'">×</button></view><view class="confirm-list"><view v-for="event in selectedEvents" :key="event.id" class="confirm-row"><view class="confirm-dot"></view><view><text class="confirm-title">{{ event.title }}</text><text class="confirm-meta">{{ event.date }} · {{ event.allDay ? '全天' : formatRange(event) }}</text></view></view></view><view class="permission-note">首次创建需要“日历”权限，提醒由 Android 系统日历负责。</view><view class="result-actions"><button class="secondary-button" @click="sheet = 'result'">返回修改</button><button class="primary-button" @click="createCalendarEvents">允许并创建 <text>↗</text></button></view></view></view>

    <view v-if="sheet === 'success'" class="modal-backdrop"><view class="center-dialog success-dialog"><view class="success-mark">✓</view><text class="sheet-title">提醒已创建</text><text class="success-copy">{{ createdCount }} 个事项已写入“{{ settings.calendarName }}”</text><button class="primary-button wide" @click="finishCreate">回到首页</button><button class="text-button" @click="openSystemCalendar">打开系统日历 ›</button></view></view>

    <view v-if="sheet === 'detail'" class="modal-backdrop" @click.self="sheet = ''"><view class="bottom-sheet detail-sheet"><view class="sheet-handle"></view><view class="sheet-heading"><view><text class="sheet-kicker">EVENT DETAIL</text><text class="sheet-title">{{ detailEvent?.title }}</text></view><button class="close-button" @click="sheet = ''">×</button></view><view v-if="detailEvent" class="detail-body"><view class="detail-highlight"><text class="detail-date">{{ detailEvent.date }}</text><text class="detail-time">{{ detailEvent.allDay ? '全天' : formatRange(detailEvent) }}</text></view><view class="detail-line" v-if="detailEvent.location"><text>⌖</text><text>{{ detailEvent.location }}</text></view><view class="detail-line" v-if="detailEvent.notes"><text>≡</text><text>{{ detailEvent.notes }}</text></view><view class="detail-line"><text>◷</text><text>{{ statusLabel(detailEvent.status) }} · {{ Math.round(detailEvent.confidence * 100) }}% 识别度</text></view></view><view class="result-actions"><button class="secondary-button" @click="sheet = ''">关闭</button><button class="primary-button" v-if="detailEvent?.status !== 'CREATED'" @click="editFromDetail">编辑事项</button></view></view></view>
  </view>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { parseText } from '../../services/parse.js'
import { storage, STORAGE_KEYS } from '../../services/storage.js'
import { enqueue } from '../../services/sync.js'
import { createEvent, requestCalendarPermission, openSystemCalendar as openNativeCalendar } from '../../native/calendar.js'
import { recognize, cleanup as cleanupOcrFile } from '../../native/ocr.js'
import { checkHealth } from '../../services/health.js'
import { saveLocalRequest } from '../../services/requests.js'
import { isPrivateNetworkUrl } from '../../services/http.js'

const now = new Date()
const activeTab = ref('home')
const sheet = ref('')
const inputText = ref('')
const parseSource = ref('text')
const parseProgress = ref(0)
const parseStage = ref('准备读取内容…')
const draftEvents = ref([])
const editingEvent = reactive({})
const detailEvent = ref(null)
const historyFilter = ref('all')
const history = ref([])
const outbox = ref([])
const serverOnline = ref(false)
const createdCount = ref(0)
const resultWarnings = ref([])
const settings = reactive({ locale: 'zh-CN', localFirst: true, allowServer: false, serverUrl: 'http://127.0.0.1:21512', calendarId: 'default', calendarName: '我的日历', reminder: '事件开始时' })

const tabs = [{ value: 'home', label: '首页', icon: '⌂' }, { value: 'history', label: '记录', icon: '◷' }, { value: 'settings', label: '设置', icon: '⚙' }]
const filters = [{ value: 'all', label: '全部' }, { value: 'CREATED', label: '已创建' }, { value: 'DRAFT', label: '草稿' }, { value: 'FAILED', label: '失败' }]
const reminderOptions = ['事件开始时', '提前 5 分钟', '提前 15 分钟', '提前 1 小时', '不提醒']
const userName = '朋友'
const monthLabel = `${now.getMonth() + 1} 月`
const dayLabel = String(now.getDate()).padStart(2, '0')
const weekdayLabel = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
const greeting = now.getHours() < 12 ? '早上好' : now.getHours() < 18 ? '下午好' : '晚上好'

const filteredHistory = computed(() => history.value.filter(item => historyFilter.value === 'all' || item.status === historyFilter.value))
const todayEvents = computed(() => history.value.flatMap(item => item.events || []).filter(event => event.date === isoDate(now) && event.status === 'CREATED').sort((a, b) => (a.startTime || '').localeCompare(b.startTime || '')).slice(0, 4))
const selectedEvents = computed(() => draftEvents.value.filter(event => event.selected))
const reminderLabel = computed(() => settings.reminder)

onMounted(() => {
  history.value = storage.read(STORAGE_KEYS.history, []) || []
  outbox.value = storage.read(STORAGE_KEYS.outbox, []) || []
  Object.assign(settings, storage.read(STORAGE_KEYS.settings, {}) || {})
  checkHealth().then(result => { serverOnline.value = result?.api === 'ok' })
})

// Android Sharesheet 将 text/plain 作为 query 参数传入时，直接复用首页解析流程。
onLoad((options) => {
  const sharedText = options?.text || options?.content
  if (sharedText) {
    inputText.value = decodeURIComponent(sharedText)
    setTimeout(() => startParse('share'), 180)
  }
})

function isoDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function showToast(message) { uni.showToast({ title: message, icon: 'none', duration: 2200 }) }
function persist() { storage.write(STORAGE_KEYS.history, history.value); storage.write(STORAGE_KEYS.outbox, outbox.value); storage.write(STORAGE_KEYS.settings, { ...settings }) }
function openTextInput() { inputText.value = ''; sheet.value = 'text' }

function choosePhoto() {
  uni.chooseImage({ count: 1, sourceType: ['album'], success: async result => { parseSource.value = 'image'; const uri = result.tempFilePaths?.[0]; try { const ocr = await recognize(uri, { locale: settings.locale }); inputText.value = ocr.text; if (!inputText.value.trim()) throw Object.assign(new Error('OCR_EMPTY'), { code: 'OCR_EMPTY' }); startParse('image') } catch (error) { inputText.value = ''; sheet.value = 'text'; showToast(error.code === 'IMAGE_TOO_LARGE' ? '图片超过 10MB 限制' : '当前设备未启用 OCR，请手动输入内容') } finally { cleanupOcrFile(uri) } }, fail: () => showToast('未选择图片') })
}
function takePhoto() {
  uni.chooseImage({ count: 1, sourceType: ['camera'], success: async result => { parseSource.value = 'image'; const uri = result.tempFilePaths?.[0]; try { const ocr = await recognize(uri, { locale: settings.locale }); inputText.value = ocr.text; if (!inputText.value.trim()) throw Object.assign(new Error('OCR_EMPTY'), { code: 'OCR_EMPTY' }); startParse('image') } catch (error) { inputText.value = ''; sheet.value = 'text'; showToast(error.code === 'IMAGE_TOO_LARGE' ? '图片超过 10MB 限制' : '当前设备未启用 OCR，请手动输入内容') } finally { cleanupOcrFile(uri) } }, fail: () => showToast('相机权限未开启或已取消') })
}

function startParse(source = 'text') {
  if (!inputText.value.trim()) return
  parseSource.value = source
  sheet.value = 'parsing'; parseProgress.value = 8; parseStage.value = source === 'image' ? '正在识别图片文字…' : '正在整理文字内容…'
  const stages = source === 'image' ? [['正在识别图片文字…', 34], ['校正段落与日期…', 62], ['提取提醒事项…', 86], ['完成解析', 100]] : [['识别日期与时间…', 35], ['提取事项与地点…', 68], ['校验事件字段…', 90], ['完成解析', 100]]
  stages.forEach(([label, progress], index) => setTimeout(() => { parseStage.value = label; parseProgress.value = progress; if (index === stages.length - 1) finishParse() }, 420 * (index + 1)))
}
function cancelParse() { sheet.value = ''; parseProgress.value = 0 }
async function finishParse() {
  try {
    const result = await parseText({ requestId: `req_${Date.now()}`, text: inputText.value, locale: 'zh-CN', now: now.toISOString(), timezone: 'Asia/Shanghai', schemaVersion: '1.0', parseMode: settings.allowServer ? 'auto' : 'local' }, { allowServer: settings.allowServer })
    draftEvents.value = result.events.map(event => ({ ...event, id: event.localId, status: 'DRAFT' }))
    resultWarnings.value = result.warnings
    saveLocalRequest({ requestId: result.requestId, sourceType: parseSource.value, sourceText: inputText.value, status: 'PARSED', result, updatedAt: new Date().toISOString() })
    sheet.value = 'result'
  } catch (error) {
    sheet.value = ''
    showToast(error.code === 'MODEL_INVALID_JSON' ? '解析结果无效，请重试' : '解析失败，请编辑文字后重试')
  }
}

function formatTime(time) { return time || '全天' }
function formatRange(event) { return event.startTime && event.endTime ? `${event.startTime} – ${event.endTime}` : '时间待确认' }
function statusLabel(status) { return ({ CREATED: '已创建', DRAFT: '草稿', FAILED: '失败' })[status] || status }
function confidenceClass(value) { return value >= 0.85 ? 'high' : value >= 0.6 ? 'medium' : 'low' }
function toggleEvent(index) { draftEvents.value[index].selected = !draftEvents.value[index].selected }
function editDraft(index) { Object.assign(editingEvent, JSON.parse(JSON.stringify(draftEvents.value[index]))); editingEvent.index = index; sheet.value = 'edit' }
function applyEdit() { const index = editingEvent.index; const updated = { ...editingEvent, missingFields: editingEvent.date ? [] : ['日期'] }; delete updated.index; draftEvents.value[index] = updated; sheet.value = 'result' }
function saveDraft() { const item = makeHistoryItem('DRAFT'); history.value.unshift(item); enqueue({ entityType: 'request', entityId: item.id, payload: item }); outbox.value = storage.read(STORAGE_KEYS.outbox, []) || []; persist(); sheet.value = ''; showToast('已保存为草稿') }
function openConfirm() { if (draftEvents.value.some(event => event.selected && event.missingFields.length)) { showToast('请先补充带“需要补充”标记的事项'); return } ; sheet.value = 'confirm' }
function makeHistoryItem(status) { return { id: `req_${Date.now()}`, title: selectedEvents.value[0]?.title || '未命名事项', source: parseSource.value, status, eventCount: selectedEvents.value.length, createdLabel: '刚刚', events: selectedEvents.value.map(event => ({ ...event, status })) } }
async function createCalendarEvents() {
  sheet.value = 'parsing'; parseStage.value = '正在请求日历权限…'; parseProgress.value = 25
  const allowed = await requestCalendarPermission()
  if (!allowed) { sheet.value = 'confirm'; showToast('需要日历权限才能创建提醒'); return }
  parseStage.value = '正在写入系统日历…'; parseProgress.value = 55
  let created = 0
  const failed = []
  for (const event of selectedEvents.value) {
    try {
      const mapping = await createEvent(event, { calendarId: settings.calendarId || 'default', requestId: `req_${Date.now()}` })
      event.calendarMapping = mapping; event.status = 'CREATED'; created += 1
    } catch (error) { event.status = 'FAILED'; failed.push(event.title) }
  }
  const item = makeHistoryItem(created ? 'CREATED' : 'FAILED')
  item.eventCount = selectedEvents.value.length; item.createdCount = created; item.failedCount = failed.length
  history.value.unshift(item); enqueue({ entityType: 'request', entityId: item.id, payload: item }); outbox.value = storage.read(STORAGE_KEYS.outbox, []) || []
  createdCount.value = created; persist(); parseProgress.value = 100
  if (failed.length) showToast(`${created} 个已创建，${failed.length} 个失败可重试`)
  sheet.value = created ? 'success' : 'confirm'
}
function finishCreate() { sheet.value = ''; activeTab.value = 'home' }
function openSystemCalendar() { if (!openNativeCalendar()) showToast('请从手机日历应用查看') }
function openEventDetail(event) { detailEvent.value = event; sheet.value = 'detail' }
function openHistory(item) { if (item.events?.length) { detailEvent.value = item.events[0]; sheet.value = 'detail' } }
function editFromDetail() { const event = detailEvent.value; const index = draftEvents.value.findIndex(item => item.id === event.id); if (index >= 0) editDraft(index); else { Object.assign(editingEvent, JSON.parse(JSON.stringify(event))); editingEvent.index = 0; draftEvents.value = [event]; sheet.value = 'edit' } }
function toggleSetting(key, value) { settings[key] = value; persist() }
function showCalendarPicker() { uni.showActionSheet({ itemList: ['我的日历', '工作', '家庭'], success: result => { settings.calendarName = ['我的日历', '工作', '家庭'][result.tapIndex]; persist() } }) }
function showReminderPicker() { uni.showActionSheet({ itemList: reminderOptions, success: result => { settings.reminder = reminderOptions[result.tapIndex]; persist() } }) }
function showLanguagePicker() { uni.showActionSheet({ itemList: ['简体中文', 'English'], success: result => { settings.locale = result.tapIndex === 1 ? 'en-US' : 'zh-CN'; persist(); showToast('语言偏好已保存，重启后完整生效') } }) }
function editServerUrl() { uni.showModal({ title: '电脑服务地址', editable: true, placeholderText: settings.serverUrl, content: settings.serverUrl, success: result => { if (result.confirm && result.content) { const value = result.content.trim(); if (!/^https?:\/\//i.test(value)) return showToast('地址必须以 http:// 或 https:// 开头'); if (!isPrivateNetworkUrl(value)) return showToast('仅允许局域网或本机地址'); settings.serverUrl = value.replace(/\/$/, ''); persist(); checkHealth().then(state => { serverOnline.value = state?.api === 'ok' }) } } }) }
function exportData() { const payload = JSON.stringify({ history: history.value, settings }, null, 2); uni.setClipboardData({ data: payload, success: () => showToast('数据已复制，可粘贴保存为 JSON') }) }
function clearHistory() { uni.showModal({ title: '清除本机记录', content: '历史和草稿将被删除，系统日历事件不会受影响。', confirmText: '清除', success: result => { if (result.confirm) { history.value = []; outbox.value = []; persist(); showToast('已清除本机记录') } } }) }
</script>

<style>
page { background: #f6f3ec; color: #132c34; }
.app-shell { min-height: 100vh; background: #f6f3ec; position: relative; overflow: hidden; font-family: "Avenir Next", "PingFang SC", sans-serif; }
.ambient { position: fixed; border-radius: 50%; pointer-events: none; opacity: .45; filter: blur(1px); }
.ambient-one { width: 260px; height: 260px; right: -150px; top: 100px; background: #c9e4dc; }
.ambient-two { width: 190px; height: 190px; left: -120px; bottom: 180px; background: #f2d6c5; }
.safe-top { padding-top: calc(18px + env(safe-area-inset-top)); }
.safe-bottom { padding-bottom: calc(8px + env(safe-area-inset-bottom)); }
.topbar { display: flex; align-items: center; justify-content: space-between; padding-left: 22px; padding-right: 22px; position: relative; z-index: 1; }
.brand-lockup { display: flex; align-items: center; gap: 10px; }
.brand-mark { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #173e46; color: #f4c9a9; font-size: 17px; transform: rotate(8deg); }
.eyebrow { display: block; letter-spacing: 1.5px; font-size: 9px; color: #7d8f8c; font-weight: 700; }
.brand-name { display: block; margin-top: 2px; font-weight: 700; font-size: 15px; color: #173e46; }
.icon-button, .close-button { border: 0; background: transparent; color: #173e46; padding: 7px; font-size: 21px; line-height: 1; }
.page-scroll { height: calc(100vh - 76px); position: relative; z-index: 1; }
.page-content { padding: 34px 22px 110px; }
.hero-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; }
.greeting { display: block; font-size: 14px; color: #6c817e; margin-bottom: 10px; }
.hero-title { display: block; font-family: Georgia, serif; color: #173e46; font-size: 30px; line-height: 1.15; letter-spacing: 0; }
.hero-title.small { font-size: 28px; margin-top: 7px; }
.accent-word { color: #de7654; }
.hero-subtitle { display: block; color: #7c8d89; font-size: 12px; margin-top: 10px; }
.date-orbit { width: 70px; height: 78px; border: 1px solid #d4ded8; border-radius: 36px 36px 12px 12px; text-align: center; padding-top: 13px; background: rgba(255,255,255,.38); }
.date-month, .date-week { display: block; font-size: 11px; color: #78908b; }
.date-day { display: block; font-family: Georgia, serif; font-size: 28px; line-height: 1.05; color: #de7654; }
.status-strip { display: flex; align-items: center; gap: 9px; padding: 11px 13px; background: rgba(255,255,255,.62); border: 1px solid #e2e8e2; border-radius: 10px; color: #627773; font-size: 11px; margin-bottom: 31px; }
.status-item { display: flex; align-items: center; gap: 5px; white-space: nowrap; }.status-dot { width: 6px; height: 6px; border-radius: 50%; background: #b5bebc; }.status-dot.online { background: #2c9a83; box-shadow: 0 0 0 3px #d9eee7; }.status-dot.offline { background: #e1a173; }.status-divider { height: 14px; width: 1px; background: #d7dfda; }.queue-count { margin-left: auto; color: #c36b4c; }
.section-heading { display: flex; align-items: baseline; gap: 9px; margin-bottom: 13px; }.section-heading > text:first-child { font-size: 18px; font-weight: 700; color: #173e46; }.section-note { color: #9aa8a4; font-size: 11px; }.text-button { border: 0; background: transparent; color: #15736e; font-size: 12px; padding: 0; margin-left: auto; }.section-heading .text-button { margin-left: auto; }
.action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }.action-card { position: relative; text-align: left; border: 1px solid #dfe7e0; border-radius: 12px; background: rgba(255,255,255,.72); padding: 16px 14px 15px; min-height: 136px; box-shadow: 0 7px 22px rgba(29, 67, 62, .05); }.action-card:active { transform: scale(.98); }.primary-action { background: #173e46; border-color: #173e46; color: #fff; }.action-card.compact { grid-column: span 2; min-height: 70px; padding-left: 61px; }.action-icon { width: 30px; height: 30px; border-radius: 9px; display: flex; justify-content: center; align-items: center; font-size: 17px; margin-bottom: 12px; }.action-card.compact .action-icon { position: absolute; left: 16px; top: 20px; }.action-icon.ink { background: #f1c7ad; color: #173e46; }.action-icon.teal { background: #cbe5dc; color: #146e6d; }.action-icon.coral { background: #f2d0bf; color: #b75b43; }.action-title { display: block; font-size: 15px; font-weight: 700; }.action-desc { display: block; font-size: 10px; color: #91a29e; margin-top: 5px; line-height: 1.45; }.primary-action .action-desc { color: #b7cfca; }.action-arrow { position: absolute; right: 14px; bottom: 13px; font-size: 17px; color: #eeb59d; }
.quick-actions { margin-bottom: 32px; }.today-section { margin-bottom: 32px; }.timeline-row { display: flex; gap: 13px; }.timeline-time { width: 39px; flex: 0 0 39px; color: #849591; font-size: 11px; text-align: right; padding-top: 17px; position: relative; }.timeline-line { position: absolute; width: 1px; background: #d8e2dc; top: 37px; bottom: -11px; right: -8px; }.event-card { flex: 1; min-width: 0; border-left: 3px solid #4ba28d; border-radius: 0 9px 9px 0; background: rgba(255,255,255,.75); padding: 13px 13px 11px; margin-bottom: 11px; box-shadow: 0 4px 14px rgba(29, 67, 62, .04); }.event-card.draft { border-left-color: #e2a275; }.event-card-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }.event-title { font-size: 14px; font-weight: 700; color: #173e46; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.event-status { font-size: 10px; color: #50907e; flex: 0 0 auto; }.draft .event-status { color: #bd8057; }.event-meta { display: block; font-size: 11px; color: #80928e; margin-top: 6px; }.confidence-line { display: flex; gap: 6px; align-items: center; margin-top: 10px; font-size: 9px; color: #a0adaa; }.confidence-bar { width: 45px; height: 3px; border-radius: 4px; background: #e2e9e4; overflow: hidden; }.confidence-bar view { display: block; height: 100%; border-radius: 4px; }.high { color: #278d76; background: #278d76; }.medium { color: #d89555; background: #d89555; }.low { color: #ce6f59; background: #ce6f59; }
.empty-state { text-align: center; padding: 28px 0; color: #82928e; font-size: 13px; }.empty-icon { display: block; font-size: 30px; color: #bad0c8; margin-bottom: 8px; }.empty-hint { display: block; color: #a6b1ae; font-size: 11px; margin-top: 5px; }
.recent-section { padding-bottom: 10px; }.history-list { background: rgba(255,255,255,.54); border: 1px solid #e2e8e2; border-radius: 11px; overflow: hidden; }.history-row { display: flex; align-items: center; gap: 10px; padding: 13px 12px; border-bottom: 1px solid #edf0ec; }.history-row:last-child { border-bottom: 0; }.history-row.large { padding: 16px 13px; }.history-source { flex: 0 0 30px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-size: 15px; }.source-image { background: #f3d4c3; color: #bd694c; }.source-text { background: #d4e9df; color: #17746e; }.history-main { min-width: 0; flex: 1; }.history-title { display: block; color: #294850; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.history-date { display: block; color: #9aa7a3; font-size: 10px; margin-top: 4px; }.history-status { font-size: 10px; }.history-status.created { color: #358d79; }.history-status.draft { color: #be855b; }.history-status.failed { color: #cb6c58; }.chevron { color: #a9b6b1; font-size: 20px; line-height: 1; }.history-empty { text-align: center; padding: 26px; color: #9aa7a3; font-size: 12px; }
.sub-page { padding-top: 38px; }.sub-page-title { margin-bottom: 25px; }.filter-row { display: flex; gap: 8px; margin-bottom: 15px; }.filter-chip { border: 1px solid #d8e2dc; background: transparent; color: #81928e; border-radius: 20px; padding: 7px 14px; font-size: 11px; line-height: 1; }.filter-chip.selected { background: #173e46; border-color: #173e46; color: #fff; }.full-list { margin-bottom: 30px; }
.settings-group { margin-bottom: 25px; }.group-label { display: block; color: #a0ada8; font-size: 11px; letter-spacing: 1px; margin: 0 0 10px 3px; }.setting-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 3px; border-bottom: 1px solid #e1e8e2; }.setting-row.clickable:active { opacity: .65; }.setting-title { display: block; color: #294850; font-size: 14px; }.setting-desc { display: block; color: #9aa7a3; font-size: 10px; margin-top: 4px; }.danger .setting-title { color: #ba644f; }.version-label { display: block; text-align: center; color: #a4aeaa; font-size: 10px; margin-top: 36px; }
.bottom-nav { position: fixed; z-index: 5; bottom: 0; left: 0; right: 0; display: flex; justify-content: space-around; background: rgba(250,249,245,.95); border-top: 1px solid #e2e8e1; backdrop-filter: blur(12px); }.nav-item { border: 0; background: transparent; color: #9aa7a3; font-size: 10px; padding: 9px 23px 5px; }.nav-item.active { color: #173e46; font-weight: 700; }.nav-icon { display: block; font-size: 19px; margin-bottom: 3px; line-height: 1; }
.modal-backdrop { position: fixed; z-index: 20; inset: 0; background: rgba(19, 44, 52, .38); display: flex; align-items: flex-end; }.bottom-sheet { width: 100%; max-height: 88vh; overflow: hidden; background: #fbfaf6; border-radius: 20px 20px 0 0; padding: 10px 20px calc(20px + env(safe-area-inset-bottom)); box-sizing: border-box; box-shadow: 0 -12px 40px rgba(19,44,52,.18); }.sheet-handle { width: 36px; height: 4px; border-radius: 4px; background: #d4ded8; margin: 0 auto 18px; }.sheet-heading { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; }.sheet-kicker { display: block; color: #8d9d99; letter-spacing: 1.4px; font-size: 9px; font-weight: 700; }.sheet-title { display: block; color: #173e46; font-family: Georgia, serif; font-size: 25px; margin-top: 5px; }.sheet-caption { display: block; color: #8b9b97; font-size: 11px; margin-top: 4px; }.text-area { min-height: 155px; width: 100%; padding: 14px; box-sizing: border-box; border: 1px solid #d9e3dc; background: #f5f6f1; border-radius: 10px; font-size: 14px; color: #294850; line-height: 1.6; }.input-footer { display: flex; justify-content: space-between; align-items: center; color: #9eaaa6; font-size: 10px; margin-top: 13px; }.primary-button, .secondary-button, .ghost-button { border: 0; border-radius: 9px; font-size: 13px; padding: 11px 16px; line-height: 1.2; }.primary-button { background: #173e46; color: #fff; }.primary-button[disabled] { opacity: .4; }.secondary-button { background: #e4eee8; color: #27655f; }.ghost-button { background: transparent; color: #6f8580; margin-top: 14px; }.center-dialog { width: calc(100% - 54px); background: #fbfaf6; border-radius: 16px; padding: 30px 23px 25px; margin: auto; text-align: center; box-sizing: border-box; }.parsing-dialog .sheet-title { font-size: 21px; }.loader-ring { width: 42px; height: 42px; margin: 0 auto 20px; border-radius: 50%; border: 3px solid #d9ebe3; border-top-color: #2b9583; animation: spin 1s linear infinite; }.parsing-stage { display: block; font-size: 11px; color: #8c9e99; margin: 9px 0 16px; }.progress-track { width: 100%; height: 5px; border-radius: 6px; background: #e5ede8; overflow: hidden; }.progress-value { height: 100%; background: #2b9583; border-radius: 6px; transition: width .3s; }.result-sheet { max-height: 91vh; }.warning-banner { display: flex; gap: 5px; padding: 10px; background: #fff1e7; color: #b36a4d; border-radius: 8px; font-size: 11px; margin-bottom: 10px; }.result-list { max-height: 47vh; }.draft-event { display: flex; align-items: flex-start; gap: 9px; padding: 13px 0; border-bottom: 1px solid #e5ebe5; }.draft-check { flex: 0 0 18px; width: 18px; height: 18px; border: 1px solid #bdccc5; border-radius: 5px; text-align: center; line-height: 17px; color: #fff; font-size: 12px; margin-top: 2px; }.draft-event.selected .draft-check { background: #2b9583; border-color: #2b9583; }.draft-content { flex: 1; min-width: 0; }.draft-title-row { display: flex; align-items: center; gap: 7px; }.draft-title { font-size: 14px; color: #294850; font-weight: 700; }.confidence-tag { font-size: 9px; padding: 3px 5px; border-radius: 4px; background: #e3f0ea; }.confidence-tag.medium { background: #fff0df; }.confidence-tag.low { background: #ffe6df; }.draft-time, .draft-location, .needs-confirm { display: block; font-size: 11px; color: #849590; margin-top: 5px; }.needs-confirm { color: #c87558; }.edit-mark { color: #9baaa5; font-size: 14px; padding: 3px; }.result-actions { display: flex; gap: 10px; margin-top: 17px; }.result-actions button { flex: 1; }.edit-form { max-height: 54vh; overflow-y: auto; }.field-label { display: block; color: #82928e; font-size: 11px; margin: 0 0 6px; }.field-input, .picker-value { width: 100%; box-sizing: border-box; border: 1px solid #d9e3dc; background: #f5f6f1; border-radius: 8px; padding: 10px; font-size: 13px; color: #294850; margin-bottom: 14px; }.field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }.notes-input { min-height: 75px; }.picker-value { color: #294850; }.confirm-list { max-height: 35vh; overflow-y: auto; }.confirm-row { display: flex; align-items: center; gap: 10px; padding: 11px 0; border-bottom: 1px solid #e5ebe5; }.confirm-dot { width: 7px; height: 7px; border-radius: 50%; background: #dd7655; }.confirm-title { display: block; font-size: 13px; color: #294850; }.confirm-meta { display: block; color: #8a9995; font-size: 10px; margin-top: 4px; }.permission-note { margin-top: 15px; padding: 10px; background: #e7f1ec; border-radius: 8px; color: #568177; font-size: 10px; line-height: 1.5; }.success-mark { width: 58px; height: 58px; margin: 0 auto 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #d9eee6; color: #258b77; font-size: 30px; }.success-copy { display: block; color: #7f928c; font-size: 12px; margin: 9px 0 23px; }.wide { width: 100%; }.detail-body { padding: 3px 0 6px; }.detail-highlight { border-left: 3px solid #dd7655; padding-left: 12px; margin-bottom: 20px; }.detail-date { display: block; color: #dd7655; font-size: 13px; font-weight: 700; }.detail-time { display: block; color: #294850; font-family: Georgia, serif; font-size: 22px; margin-top: 4px; }.detail-line { display: flex; gap: 10px; color: #718580; font-size: 12px; padding: 10px 0; border-bottom: 1px solid #e7ece7; }.detail-line text:first-child { width: 16px; color: #2b9583; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
