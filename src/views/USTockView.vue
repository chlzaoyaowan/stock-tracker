<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <div class="nav-links">
          <button class="nav-link" @click="goHome">🏠 首页</button>
          <span class="nav-sep">|</span>
          <button class="nav-link cn-link" @click="goCN">🇨🇳 A股</button>
        </div>
        <div class="market-badge">🇺🇸 美股自选股</div>
        <div class="header-stats">
          <span class="stat">
            <strong>{{ usStockStore.stocks.length }}</strong> 只持仓
          </span>
          <span class="stat">
            <strong>{{ reviewCount }}</strong> 待回顾
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button v-if="!hasKey" class="btn warn" @click="showKeyModal = true">⚠ 配置API Key</button>
        <button class="btn primary" @click="showAdd = true">+ 添加</button>
      </div>
    </header>

    <!-- 搜索栏（简化版） -->
    <div class="us-index-bar">
      <template v-if="indexData.length">
        <div v-for="idx in indexData" :key="idx.symbol" class="idx-item">
          <span class="idx-name">{{ idx.name }}</span>
          <span class="idx-price">{{ idx.price?.toFixed(2) || '--' }}</span>
          <span class="idx-change" :class="idx.change >= 0 ? 'up' : 'down'">
            {{ idx.change >= 0 ? '+' : '' }}{{ idx.change?.toFixed(2) || 0 }}
            ({{ idx.changePct >= 0 ? '+' : '' }}{{ idx.changePct?.toFixed(2) || 0 }}%)
          </span>
        </div>
      </template>
      <span v-else-if="!hasKey" class="no-key-hint">请先配置 Finnhub API Key</span>
      <span v-else class="loading-hint">加载中...</span>
    </div>

    <!-- 分类栏 -->
    <CategoryBar type="usstock" @categoryChange="onCategoryChange" />

    <!-- 主内容 -->
    <div class="main-content">
      <div class="stock-list-panel">
        <div class="list-toolbar">
          <input
            v-model="searchText"
            class="search"
            placeholder="搜索股票..."
          >
          <button v-if="searchText || activeTags.length" class="btn clear-btn" @click="clearFilter">
            清除筛选
          </button>
        </div>

        <div v-if="activeTags.length" class="active-tag-filter">
          <span
            v-for="tag in activeTags"
            :key="tag"
            class="filter-tag"
            :style="{ color: tagColor(tag), background: tagColor(tag) + '22' }"
            @click="toggleTagFilter(tag)"
          >{{ tag }} ×</span>
        </div>

        <div class="stock-list">
          <USTockCard
            v-for="s in paginatedStocks"
            :key="s.id"
            :stock="s"
            @click="selectStock(s)"
          />
          <div v-if="!filteredStocks.length" class="empty-list">
            还没有自选股，添加一只开始吧
          </div>
        </div>

        <!-- 分页 -->
        <div v-if="totalPages >= 1" class="pagination">
          <button class="page-btn" :disabled="currentPage === 1" @click="goPage(currentPage - 1)">‹</button>
          <button
            v-for="p in pageNumbers"
            :key="p"
            class="page-btn"
            :class="{ active: p === currentPage, ellipsis: p === '...' }"
            :disabled="p === '...'"
            @click="p !== '...' && goPage(p)"
          >{{ p }}</button>
          <button class="page-btn" :disabled="currentPage === totalPages" @click="goPage(currentPage + 1)">›</button>
        </div>
      </div>

      <div class="detail-panel" :class="{ open: selectedStock }">
        <USTockDetail
          :stock="selectedStock"
          @close="selectedStock = null"
        />
      </div>
    </div>

    <!-- Modals -->
    <USAddStockModal v-model="showAdd" />
    <TagLibrary v-model="showTagLib" />

    <!-- API Key 设置 -->
    <div v-if="showKeyModal" class="modal-overlay" @click.self="showKeyModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>配置 Finnhub API Key</h3>
          <button class="close-btn" @click="showKeyModal = false">×</button>
        </div>
        <div class="modal-body">
          <p class="key-hint">
            美股数据使用 <a href="https://finnhub.io" target="_blank" class="key-link">Finnhub</a> 免费 API，需要注册获取 Key（30秒搞定）。
          </p>
          <input
            v-model="apiKeyInput"
            class="key-input"
            placeholder="输入你的 Finnhub API Key"
          >
          <p class="key-steps">
            <strong>注册步骤：</strong><br>
            1. 访问 <a href="https://finnhub.io/register" target="_blank" class="key-link">finnhub.io/register</a><br>
            2. 用邮箱注册，免费获取 API Key<br>
            3. 复制 Key 粘贴到上方输入框
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showKeyModal = false">取消</button>
          <button class="btn primary" :disabled="!apiKeyInput.trim()" @click="saveKey">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUSStockStore } from '../stores/usStockStore.js'
import { useTagStore, tagColor } from '../stores/tagStore.js'
import { getFinnhubKey } from '../services/usStockApi.js'
import { storeToRefs } from 'pinia'
import UStockCard from '../components/USTockCard.vue'
import UStockDetail from '../components/USTockDetail.vue'
import USAddStockModal from '../components/USAddStockModal.vue'
import TagLibrary from '../components/TagLibrary.vue'
import CategoryBar from '../components/CategoryBar.vue'

const router = useRouter()
const usStockStore = useUSStockStore()
const tagStore = useTagStore()

const showAdd = ref(false)
const showTagLib = ref(false)
const showKeyModal = ref(false)
const selectedStock = ref(null)
const searchText = ref('')
const activeTags = ref([])
const activeCategory = ref('全部')
const apiKeyInput = ref('')
const currentPage = ref(1)
const PAGE_SIZE = 8

const hasKey = computed(() => !!getFinnhubKey())

// 使用 storeToRefs 创建响应式 ref
const { stocks: stocksRef, liveData: liveDataRef, reviewStats: reviewStatsRef } = storeToRefs(usStockStore)

onMounted(() => {
  if (hasKey.value) {
    usStockStore.startAutoRefresh(20000)
  }
})

onUnmounted(() => {
  usStockStore.stopAutoRefresh()
})

const reviewCount = computed(() =>
  reviewStatsRef.value.filter(r => r.status !== 'ok').length
)

// 简化版大盘指数
const indexData = ref([])

// 加载指数（通过 Finnhub）
async function loadIndex() {
  if (!hasKey.value) return
  const { fetchUSQuote } = await import('../services/usStockApi.js')
  const symbols = ['OEX', 'NDX', 'DJI'] // S&P500, Nasdaq, Dow
  const results = []
  for (const sym of symbols) {
    const q = await fetchUSQuote(sym)
    if (!q.error) {
      results.push({
        symbol: sym,
        name: sym === 'OEX' ? 'S&P 500' : sym === 'NDX' ? '纳斯达克' : '道琼斯',
        price: q.price,
        change: q.change,
        changePct: q.changePct,
      })
    }
  }
  indexData.value = results
}

onMounted(loadIndex)

const filteredStocks = computed(() => {
  // 使用 store 的 stocksWithQuote 加上过滤器
  let list = usStockStore.stocksWithQuote

  if (activeCategory.value && activeCategory.value !== '全部') {
    list = list.filter(s => s.category === activeCategory.value)
  }

  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.symbol.toLowerCase().includes(q)
    )
  }

  if (activeTags.value.length) {
    list = list.filter(s =>
      activeTags.value.every(t => s.tags.includes(t))
    )
  }

  return [...list].sort((a, b) => {
    const ra = usStockStore.reviewStats.find(r => r.id === a.id)
    const rb = usStockStore.reviewStats.find(r => r.id === b.id)
    const sa = ra?.status === 'urgent' ? 0 : ra?.status === 'review' ? 1 : 2
    const sb = rb?.status === 'urgent' ? 0 : rb?.status === 'review' ? 1 : 2
    if (sa !== sb) return sa - sb
    return new Date(b.createdAt) - new Date(a.createdAt)
  })
})

const totalPages = computed(() => {
  const list = filteredStocks.value
  return Math.max(1, Math.ceil((list ? list.length : 0) / PAGE_SIZE))
})

const paginatedStocks = computed(() => {
  const list = filteredStocks.value
  if (!list) return []
  const start = (currentPage.value - 1) * PAGE_SIZE
  return list.slice(start, start + PAGE_SIZE)
})

const pageNumbers = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) {
    const arr = []
    for (let i = 1; i <= total; i++) arr.push(i)
    return arr
  }
  const pages = []
  pages.push(1)
  if (cur > 4) pages.push('...')
  const start = Math.max(2, cur - 1)
  const end = Math.min(total - 1, cur + 1)
  for (let p = start; p <= end; p++) pages.push(p)
  if (cur < total - 3) pages.push('...')
  pages.push(total)
  return pages
})

// 筛选条件变化时重置到第一页
watch([
  () => searchText.value,
  () => activeTags.value.length,
  () => activeCategory.value
], () => {
  currentPage.value = 1
})

function selectStock(s) { selectedStock.value = s }
function goHome() { router.push('/') }
function goCN() { router.push('/astock') }
function onCategoryChange(cat) { activeCategory.value = cat }
function toggleTagFilter(tag) { activeTags.value = activeTags.value.filter(t => t !== tag) }
function clearFilter() { searchText.value = ''; activeTags.value = [] }
function goPage(p) { currentPage.value = Math.max(1, Math.min(p, totalPages.value)) }

function saveKey() {
  if (!apiKeyInput.value.trim()) return
  localStorage.setItem('us_stock_apikey', apiKeyInput.value.trim())
  showKeyModal.value = false
  apiKeyInput.value = ''
  usStockStore.startAutoRefresh(20000)
  loadIndex()
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0d1117; color: #e6edf3; }
.app { min-height: 100vh; display: flex; flex-direction: column; }

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  flex-wrap: wrap;
  gap: 10px;
}

.header-left { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }

.market-badge {
  font-size: 0.82rem;
  font-weight: 600;
  color: #58a6ff;
  background: #58a6ff22;
  padding: 3px 10px;
  border-radius: 8px;
}

.nav-links { display: flex; align-items: center; gap: 6px; }
.nav-link { background: none; border: none; color: #8b949e; font-size: 0.78rem; cursor: pointer; padding: 2px 4px; }
.nav-link:hover { color: #58a6ff; }
.nav-sep { color: #30363d; }

.header-stats { display: flex; gap: 12px; font-size: 0.78rem; color: #8b949e; }
.header-stats strong { color: #e6edf3; }
.header-actions { display: flex; gap: 8px; }

.btn {
  padding: 7px 14px; border-radius: 8px; border: 1px solid #30363d;
  background: transparent; color: #e6edf3; font-size: 0.82rem;
  cursor: pointer; transition: all 0.15s;
}
.btn:hover { border-color: #58a6ff; }
.btn.primary { background: #f0883e; border-color: #f0883e; color: #fff; }
.btn.primary:hover { background: #e07a32; }
.btn.warn { border-color: #d29922; color: #d29922; }
.btn.warn:hover { background: #d2992222; }

/* Index bar */
.us-index-bar {
  background: #161b22;
  border-bottom: 1px solid #30363d;
  padding: 10px 20px;
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.idx-item { display: flex; align-items: center; gap: 8px; }
.idx-name { font-size: 0.75rem; color: #8b949e; }
.idx-price { font-size: 0.85rem; font-weight: 600; }
.idx-change { font-size: 0.78rem; font-variant-numeric: tabular-nums; }
.idx-change.up { color: #f85149; }
.idx-change.down { color: #3fb950; }
.no-key-hint { font-size: 0.78rem; color: #d29922; }
.loading-hint { font-size: 0.78rem; color: #8b949e; }

/* Main */
.main-content { flex: 1; display: grid; grid-template-columns: 1fr 380px; overflow: hidden; }
.stock-list-panel { display: flex; flex-direction: column; overflow: hidden; border-right: 1px solid #30363d; }
.list-toolbar { padding: 8px 12px; display: flex; gap: 8px; border-bottom: 1px solid #30363d; }
.search { flex: 1; padding: 7px 12px; border-radius: 8px; border: 1px solid #30363d; background: #161b22; color: #e6edf3; font-size: 0.85rem; outline: none; }
.search:focus { border-color: #58a6ff; }
.search::placeholder { color: #8b949e; }
.clear-btn { color: #8b949e; font-size: 0.75rem; }
.active-tag-filter { padding: 8px 12px; display: flex; flex-wrap: wrap; gap: 6px; border-bottom: 1px solid #30363d; }
.filter-tag { font-size: 0.75rem; padding: 3px 10px; border-radius: 10px; cursor: pointer; }
.filter-tag:hover { opacity: 0.7; }
.stock-list { flex: 1; overflow-y: auto; padding: 8px 10px 0 10px; display: flex; flex-direction: column; gap: 1.5px; }
.empty-list { text-align: center; color: #8b949e; font-size: 0.85rem; padding: 40px 0; }
.detail-panel { overflow: hidden; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 4px; padding: 12px 16px; border-top: 1px solid #30363d; flex-shrink: 0; }
.page-btn { min-width: 32px; height: 32px; padding: 0 6px; border-radius: 6px; border: 1px solid #30363d; background: transparent; color: #8b949e; font-size: 0.82rem; cursor: pointer; transition: all 0.15s; }
.page-btn:hover:not(:disabled):not(.ellipsis) { border-color: #58a6ff; color: #58a6ff; }
.page-btn.active { background: #f0883e; border-color: #f0883e; color: #fff; }
.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.page-btn.ellipsis { border: none; cursor: default; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #161b22; border: 1px solid #30363d; border-radius: 16px; width: 440px; max-width: 95vw; overflow: hidden; }
.modal-header { padding: 16px 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { font-size: 1rem; font-weight: 600; }
.close-btn { background: none; border: none; color: #8b949e; font-size: 1.4rem; cursor: pointer; line-height: 1; }
.close-btn:hover { color: #e6edf3; }
.modal-body { padding: 16px 20px; }
.modal-footer { padding: 12px 20px; border-top: 1px solid #30363d; display: flex; justify-content: flex-end; gap: 8px; }
.key-hint { font-size: 0.82rem; color: #8b949e; margin-bottom: 14px; line-height: 1.5; }
.key-link { color: #58a6ff; text-decoration: none; }
.key-link:hover { text-decoration: underline; }
.key-input { width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid #30363d; background: #0d1117; color: #e6edf3; font-size: 0.88rem; outline: none; box-sizing: border-box; }
.key-input:focus { border-color: #58a6ff; }
.key-steps { font-size: 0.78rem; color: #8b949e; margin-top: 14px; line-height: 1.8; }

@media (max-width: 768px) {
  .main-content { grid-template-columns: 1fr; }
  .detail-panel { display: none; position: fixed; inset: 0; z-index: 100; background: #161b22; }
  .detail-panel.open { display: block; }
}
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
</style>
