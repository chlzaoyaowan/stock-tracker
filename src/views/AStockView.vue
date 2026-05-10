<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="header-left">
        <div class="nav-links">
          <button class="nav-link" @click="goHome">🏠 首页</button>
          <span class="nav-sep">|</span>
          <button class="nav-link us-link" @click="goUS">🇺🇸 美股</button>
        </div>
        <div class="market-badge">🇨🇳 A股自选股</div>
        <div class="header-stats">
          <span class="stat">
            <strong>{{ stockStore.stocks.length }}</strong> 只持仓
          </span>
          <span class="stat">
            <strong>{{ reviewCount }}</strong> 待回顾
          </span>
        </div>
      </div>
      <div class="header-actions">
        <button class="btn" @click="showTagLib = true">标签库</button>
        <button class="btn" @click="showImport = true">导入数据</button>
        <button class="btn primary" @click="showAdd = true">+ 添加</button>
      </div>
    </header>

    <!-- 大盘指数 -->
    <IndexOverview />

    <!-- 分类栏 -->
    <CategoryBar @categoryChange="onCategoryChange" />

    <!-- 主内容 -->
    <div class="main-content">
      <!-- 左侧列表 -->
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

        <!-- 标签过滤 -->
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
          <template v-if="chartsReady">
            <StockCard
              v-for="s in paginatedStocks"
              :key="s.id"
              :stock="s"
              :chart-data="chartCache[s.code]"
              @click="selectStock(s)"
            />
          </template>
          <div v-else class="charts-loading">
            <span>加载中...</span>
          </div>
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

      <!-- 右侧详情 -->
      <div class="detail-panel" :class="{ open: selectedStock }">
        <StockDetail
          :stock="selectedStock"
          @close="selectedStock = null"
        />
      </div>
    </div>

    <!-- Modals -->
    <AddStockModal v-model="showAdd" />
    <TagLibrary v-model="showTagLib" />
    <ImportModal v-model="showImport" :existing-codes="stockStore.stocks.map(s => s.code)" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useStockStore } from '../stores/stockStore.js'
import { useTagStore, tagColor } from '../stores/tagStore.js'
import { fetchSinaMinute } from '../services/stockApi.js'
import StockCard from '../components/StockCard.vue'
import StockDetail from '../components/StockDetail.vue'
import AddStockModal from '../components/AddStockModal.vue'
import TagLibrary from '../components/TagLibrary.vue'
import IndexOverview from '../components/IndexOverview.vue'
import CategoryBar from '../components/CategoryBar.vue'
import ImportModal from '../components/ImportModal.vue'

const router = useRouter()
const stockStore = useStockStore()
const tagStore = useTagStore()

const showAdd = ref(false)
const showTagLib = ref(false)
const showImport = ref(false)
const selectedStock = ref(null)
const searchText = ref('')
const activeTags = ref([])
const activeCategory = ref('全部')
const currentPage = ref(1)
const PAGE_SIZE = 8
const chartCache = ref({}) // code -> chart data
const chartsReady = ref(false) // 当前页图表是否加载完成

async function prefetchCharts(stocks) {
  chartsReady.value = false
  const codes = stocks.map(s => s.code)
  // 只抓还不在缓存里的
  const missing = codes.filter(c => !chartCache.value[c])
  if (missing.length === 0) {
    chartsReady.value = true
    return
  }
  await Promise.all(missing.map(async (code) => {
    const data = await fetchSinaMinute(code)
    if (data) chartCache.value[code] = data
  }))
  chartsReady.value = true
}

watch(currentPage, async () => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  const pageStocks = filteredStocks.value.slice(start, start + PAGE_SIZE)
  await prefetchCharts(pageStocks)
})

onMounted(async () => {
  stockStore.startAutoRefresh(15000)
  // 初始加载第一页图表
  await prefetchCharts(filteredStocks.value.slice(0, PAGE_SIZE))
})

onUnmounted(() => {
  stockStore.stopAutoRefresh()
})

const reviewCount = computed(() =>
  stockStore.reviewStats.filter(r => r.status !== 'ok').length
)

const filteredStocks = computed(() => {
  let list = stockStore.stocksWithQuote

  if (activeCategory.value && activeCategory.value !== '全部') {
    list = list.filter(s => s.category === activeCategory.value)
  }

  if (searchText.value) {
    const q = searchText.value.toLowerCase()
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.code.includes(q)
    )
  }

  if (activeTags.value.length) {
    list = list.filter(s =>
      activeTags.value.every(t => s.tags.includes(t))
    )
  }

  // 待回顾优先排序
  return [...list].sort((a, b) => {
    const ra = stockStore.reviewStats.find(r => r.id === a.id)
    const rb = stockStore.reviewStats.find(r => r.id === b.id)
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

// 生成页码
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

// 筛选条件变化时重置到第一页并预加载
watch([
  () => searchText.value,
  () => activeTags.value.length,
  () => activeCategory.value
], async () => {
  currentPage.value = 1
  await prefetchCharts(filteredStocks.value.slice(0, PAGE_SIZE))
})

function selectStock(s) {
  selectedStock.value = s
}

function goHome() { router.push('/') }
function goUS() { router.push('/usstock') }

function onCategoryChange(cat) {
  activeCategory.value = cat
}

function toggleTagFilter(tag) {
  activeTags.value = activeTags.value.filter(t => t !== tag)
}

function clearFilter() {
  searchText.value = ''
  activeTags.value = []
}

function goPage(p) {
  currentPage.value = Math.max(1, Math.min(p, totalPages.value))
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #0d1117;
  color: #e6edf3;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

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
  color: #f85149;
  background: #f8514922;
  padding: 3px 10px;
  border-radius: 8px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-link {
  background: none;
  border: none;
  color: #8b949e;
  font-size: 0.78rem;
  cursor: pointer;
  padding: 2px 4px;
}

.nav-link:hover { color: #58a6ff; }
.us-link:hover { color: #58a6ff; }

.nav-sep { color: #30363d; }

.header h1 {
  font-size: 1.1rem;
  font-weight: 600;
}

.header-stats {
  display: flex;
  gap: 12px;
  font-size: 0.78rem;
  color: #8b949e;
}

.header-stats strong { color: #e6edf3; }

.header-actions { display: flex; gap: 8px; }

.btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid #30363d;
  background: transparent;
  color: #e6edf3;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s;
}

.btn:hover { border-color: #58a6ff; }

.btn.primary {
  background: #f0883e;
  border-color: #f0883e;
  color: #fff;
}

.btn.primary:hover { background: #e07a32; }

.main-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 380px;
  overflow: hidden;
}

.stock-list-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid #30363d;
}

.list-toolbar {
  padding: 8px 12px;
  display: flex;
  gap: 8px;
  border-bottom: 1px solid #30363d;
}

.search {
  flex: 1;
  padding: 7px 12px;
  border-radius: 8px;
  border: 1px solid #30363d;
  background: #161b22;
  color: #e6edf3;
  font-size: 0.85rem;
  outline: none;
}

.search:focus { border-color: #58a6ff; }
.search::placeholder { color: #8b949e; }

.clear-btn { color: #8b949e; font-size: 0.75rem; }

.active-tag-filter {
  padding: 8px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  border-bottom: 1px solid #30363d;
}

.filter-tag {
  font-size: 0.75rem;
  padding: 3px 10px;
  border-radius: 10px;
  cursor: pointer;
}

.filter-tag:hover { opacity: 0.7; }

.stock-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px 0 10px;
  contain: layout style;
  display: flex;
  flex-direction: column;
  gap: 1.5px;
}

.empty-list {
  text-align: center;
  color: #8b949e;
  font-size: 0.85rem;
  padding: 40px 0;
}

.charts-loading {
  text-align: center;
  color: #8b949e;
  font-size: 0.85rem;
  padding: 20px 0;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  border-top: 1px solid #30363d;
  flex-shrink: 0;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  border-radius: 6px;
  border: 1px solid #30363d;
  background: transparent;
  color: #8b949e;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s;
}

.page-btn:hover:not(:disabled):not(.ellipsis) {
  border-color: #58a6ff;
  color: #58a6ff;
}

.page-btn.active {
  background: #f0883e;
  border-color: #f0883e;
  color: #fff;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-btn.ellipsis {
  border: none;
  cursor: default;
}

.detail-panel {
  overflow: hidden;
}

@media (max-width: 768px) {
  .main-content {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }

  .detail-panel {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 100;
    background: #161b22;
  }

  .detail-panel.open { display: block; }
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #30363d; border-radius: 3px; }
</style>
