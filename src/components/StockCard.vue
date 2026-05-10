<template>
  <div class="stock-card" :class="reviewStatus" @click="$emit('click')">
    <div class="card-left">
      <div class="card-name">{{ stock.name }}</div>
      <div class="card-code">{{ stock.code }}</div>
      <div class="card-tags">
        <span
          v-for="tag in stock.tags.slice(0, 10)"
          :key="tag"
          class="tag"
          :style="{ color: tagColor(tag), background: tagColor(tag) + '22' }"
        >{{ tag }}</span>
      </div>
    </div>
    <div class="card-center">
      <IntradayChart :code="stock.code" :pre-data="chartData" />
    </div>
    <div class="card-right">
      <template v-if="quote">
        <div class="card-price">{{ quote.price.toFixed(2) }}</div>
        <div class="card-change" :class="quote.change >= 0 ? 'up' : 'down'">
          {{ quote.change >= 0 ? '+' : '' }}{{ quote.change.toFixed(2) }}
          ({{ quote.changePct >= 0 ? '+' : '' }}{{ quote.changePct.toFixed(2) }}%)
        </div>
      </template>
      <template v-else>
        <div class="card-price loading">--</div>
        <div class="card-change">--</div>
      </template>
      <div v-if="stock.buyPrice" class="card-price-info">
        <span class="price-label">买</span>
        <span class="price-val">{{ stock.buyPrice }}</span>
      </div>
    </div>
    <div v-if="reviewStatus !== 'ok'" class="review-badge" :class="reviewStatus">
      {{ reviewStatus === 'urgent' ? '需关注' : '待回顾' }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useStockStore } from '../stores/stockStore.js'
import { tagColor } from '../stores/tagStore.js'
import IntradayChart from './IntradayChart.vue'

const props = defineProps({
  stock: { type: Object, required: true },
  chartData: { type: Object, default: null }
})

defineEmits(['click'])

const stockStore = useStockStore()

const quote = computed(() => stockStore.getQuote(props.stock.code))

const reviewStatus = computed(() => {
  const stat = stockStore.reviewStats.find(r => r.id === props.stock.id)
  return stat?.status || 'ok'
})
</script>

<style scoped>
.stock-card {
  display: flex;
  align-items: center;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 10px 12px;
  cursor: pointer;
  position: relative;
  border-left: 3px solid #f0883e;
}

.stock-card:hover { border-color: #58a6ff; transform: translateX(2px); }
.stock-card.review { border-left-color: #d29922; }
.stock-card.urgent { border-left-color: #f85149; }

.card-left { flex: 1; min-width: 0; }

.card-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #e6edf3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-code {
  font-size: 0.68rem;
  color: #8b949e;
  margin-top: 1px;
}

.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 3px;
}

.tag {
  font-size: 0.62rem;
  padding: 1px 5px;
  border-radius: 6px;
}

.card-right {
  text-align: right;
  flex-shrink: 0;
  margin-left: 8px;
}

.card-center {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.card-price {
  font-size: 0.95rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e6edf3;
}

.card-price.loading { color: #8b949e; }
.card-price-info { margin-top: 2px; font-size: 0.65rem; color: #8b949e; display: flex; justify-content: flex-end; gap: 4px; }
.price-label { color: #58a6ff; }
.price-val { color: #e6edf3; font-variant-numeric: tabular-nums; }

.card-change {
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
  margin-top: 1px;
}

.card-change.up { color: #f85149; }
.card-change.down { color: #3fb950; }

.review-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 600;
}

.review-badge.review { background: #d29922; color: #000; }
.review-badge.urgent { background: #f85149; color: #fff; }
</style>
