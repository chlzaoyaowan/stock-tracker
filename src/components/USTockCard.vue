<template>
  <div class="stock-card" :class="reviewStatus" @click="$emit('click')">
    <div class="card-left">
      <div class="card-name">{{ stock.name }}</div>
      <div class="card-code">{{ stock.symbol }}</div>
      <div class="card-tags">
        <span
          v-for="tag in stock.tags.slice(0, 10)"
          :key="tag"
          class="tag"
          :style="{ color: tagColorFn(tag), background: tagColorFn(tag) + '22' }"
        >{{ tag }}</span>
      </div>
    </div>
    <div class="card-right">
      <template v-if="quote && !quote.error">
        <div class="card-price">${{ quote.price.toFixed(2) }}</div>
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
import { useUSStockStore } from '../stores/usStockStore.js'

const props = defineProps({ stock: { type: Object, required: true } })
defineEmits(['click'])

const usStockStore = useUSStockStore()
const quote = computed(() => usStockStore.getQuote(props.stock.symbol))
const reviewStatus = computed(() => {
  const stat = usStockStore.reviewStats.find(r => r.id === props.stock.id)
  return stat?.status || 'ok'
})

const TAG_COLORS = ['#58a6ff','#f0883e','#3fb950','#d29922','#f85149','#a371f7','#39c5cf','#db61a2','#e3b341','#73c7d1']
function tagColorFn(tag) {
  let h = 0
  for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return TAG_COLORS[Math.abs(h) % TAG_COLORS.length]
}
</script>

<style scoped>
.stock-card {
  display: flex;
  align-items: center;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 12px 12px;
  cursor: pointer;
  position: relative;
  border-left: 3px solid #58a6ff;
}

.stock-card:hover { border-color: #58a6ff; transform: translateX(2px); }
.stock-card.review { border-left-color: #d29922; }
.stock-card.urgent { border-left-color: #f85149; }

.card-left { flex: 1; min-width: 0; min-height: 70px; display: flex; flex-direction: column; justify-content: center; }

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
  font-family: monospace;
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

.card-price {
  font-size: 0.95rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #e6edf3;
}

.card-price.loading { color: #8b949e; }
.card-change { font-size: 0.7rem; font-variant-numeric: tabular-nums; margin-top: 1px; }
.card-change.up { color: #f85149; }
.card-change.down { color: #3fb950; }
.card-price-info { margin-top: 2px; font-size: 0.65rem; color: #8b949e; display: flex; justify-content: flex-end; gap: 4px; }
.price-label { color: #58a6ff; }
.price-val { color: #e6edf3; font-variant-numeric: tabular-nums; }
.review-badge { position: absolute; top: 6px; right: 6px; font-size: 0.62rem; padding: 2px 5px; border-radius: 5px; font-weight: 600; }
.review-badge.review { background: #d29922; color: #000; }
.review-badge.urgent { background: #f85149; color: #fff; }
</style>