<template>
  <div class="home-page">
    <header class="home-header">
      <div class="header-left">
        <h1>📊 自选股笔记</h1>
      </div>
      <div class="header-right">
        <span class="user-hint">本地模式</span>
        <button class="btn logout-btn" @click="doLogout">退出</button>
      </div>
    </header>

    <div class="home-content">
      <h2 class="section-title">选择市场</h2>
      <div class="market-cards">
        <div class="market-card china" @click="goAStock">
          <div class="mc-icon">🇨🇳</div>
          <div class="mc-info">
            <div class="mc-name">A 股自选股</div>
            <div class="mc-desc">沪深、创业板、科创板 · 腾讯行情实时数据</div>
            <div class="mc-stats">
              <span>{{ aStockCount }} 只持仓</span>
            </div>
          </div>
          <div class="mc-arrow">›</div>
        </div>

        <div class="market-card us" @click="goUSStock">
          <div class="mc-icon">🇺🇸</div>
          <div class="mc-info">
            <div class="mc-name">美股自选股</div>
            <div class="mc-desc">NASDAQ、NYSE · Finnhub 实时数据</div>
            <div class="mc-stats">
              <span>{{ usStockCount }} 只持仓</span>
              <span v-if="!hasFinnhubKey" class="api-warn">⚠ 需配置 API Key</span>
            </div>
          </div>
          <div class="mc-arrow">›</div>
        </div>
      </div>

      <div class="home-footer">
        <p>数据完全存储在本地浏览器 · 仅供个人记录参考</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore.js'
import { useStockStore } from '../stores/stockStore.js'
import { getFinnhubKey } from '../services/usStockApi.js'

const router = useRouter()
const authStore = useAuthStore()
const stockStore = useStockStore()

const aStockCount = computed(() => stockStore.stocks.length)

const hasFinnhubKey = computed(() => !!getFinnhubKey())

// 临时从 localStorage 获取美股数量
const usStocks = JSON.parse(localStorage.getItem('us_stock_list') || '[]')
const usStockCount = ref(usStocks.length)

function goAStock() {
  router.push('/astock')
}

function goUSStock() {
  router.push('/usstock')
}

function doLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: #0d1117;
  display: flex;
  flex-direction: column;
}

.home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #161b22;
  border-bottom: 1px solid #30363d;
}

.home-header h1 { font-size: 1.1rem; font-weight: 600; }

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-hint {
  font-size: 0.78rem;
  color: #8b949e;
}

.logout-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid #30363d;
  background: transparent;
  color: #8b949e;
  font-size: 0.8rem;
  cursor: pointer;
}

.logout-btn:hover { color: #e6edf3; border-color: #58a6ff; }

.home-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
}

.section-title {
  font-size: 0.8rem;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 20px;
}

.market-cards {
  display: flex;
  gap: 16px;
  width: 100%;
  max-width: 700px;
}

.market-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 20px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.market-card:hover {
  border-color: #58a6ff;
  transform: translateY(-2px);
}

.market-card.china:hover { border-color: #f85149; }
.market-card.us:hover { border-color: #58a6ff; }

.mc-icon { font-size: 2.4rem; flex-shrink: 0; }

.mc-info { flex: 1; min-width: 0; }

.mc-name {
  font-size: 1.1rem;
  font-weight: 600;
  color: #e6edf3;
  margin-bottom: 4px;
}

.mc-desc {
  font-size: 0.75rem;
  color: #8b949e;
  margin-bottom: 8px;
}

.mc-stats {
  display: flex;
  gap: 10px;
  font-size: 0.78rem;
  color: #e6edf3;
}

.api-warn {
  color: #d29922;
}

.mc-arrow {
  font-size: 1.5rem;
  color: #30363d;
  flex-shrink: 0;
}

.market-card:hover .mc-arrow { color: #58a6ff; }

.home-footer {
  margin-top: auto;
  padding-top: 40px;
  font-size: 0.75rem;
  color: #555;
}

@media (max-width: 600px) {
  .market-cards { flex-direction: column; }
}
</style>
