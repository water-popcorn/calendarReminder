<script>
export default {
  onLaunch() {
    // Keep a lightweight marker for periodic cleanup of native OCR cache.
    try {
      const stamp = Date.now()
      const lastCleanup = uni.getStorageSync('calendar_cache_cleanup') || 0
      if (stamp - lastCleanup > 24 * 60 * 60 * 1000) uni.setStorageSync('calendar_cache_cleanup', stamp)
    } catch (e) {}
  },
  onShow() {},
  onHide() {}
}
</script>

<style>
page { background: #f6f3ec; }
</style>
