<template>
  <div class="intra-wrap">
    <svg v-if="prices.length > 1" :width="width" :height="chartHeight" class="intra-svg">
      <polyline
        :points="linePoints"
        fill="none"
        :stroke="isUp ? '#f85149' : '#3fb950'"
        stroke-width="1.5"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
    </svg>
    <div v-if="prices.length > 1" class="intra-info">
      <span :class="isUp ? 'up' : 'down'">
        {{ isUp ? '▲' : '▼' }}
        {{ lastPrice.toFixed(2) }}
      </span>
      <span class="ohlc">
        开{{ openPrice }} 收{{ lastPrice }} 高{{ highPrice }} 低{{ lowPrice }}
      </span>
    </div>
    <span v-else class="hint">暂无</span>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  code: { type: String, required: true },
  preData: { type: Object, default: null },
  width: { type: Number, default: 300 },
  chartHeight: { type: Number, default: 50 }
})

const prices = ref([])
const isUp = ref(true)
const openPrice = ref(0)
const lastPrice = ref(0)
const highPrice = ref(0)
const lowPrice = ref(0)

// 监听预加载数据变化
watch(() => props.preData, (d) => {
  if (d) {
    prices.value = d.prices || []
    isUp.value = d.isUp ?? true
    openPrice.value = d.openPrice ?? 0
    lastPrice.value = d.lastPrice ?? 0
    highPrice.value = d.highPrice ?? 0
    lowPrice.value = d.lowPrice ?? 0
  }
}, { immediate: true })

const linePoints = computed(() => {
  if (prices.value.length < 2) return ''
  const h = props.chartHeight
  const w = props.width
  const min = Math.min(...prices.value)
  const max = Math.max(...prices.value)
  const range = max - min || 0.001
  return prices.value.map((p, i) => {
    const x = (i / (prices.value.length - 1)) * w
    const y = h - ((p - min) / range) * (h - 6) - 3
    return `${x},${y}`
  }).join(' ')
})
</script>

<style scoped>
.intra-wrap {
  background: transparent;
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 300px;
}
.intra-svg { display: block; }
.intra-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 1px 3px 2px;
  width: 100%;
}
.intra-info .up { color: #f85149; font-size: 0.62rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.intra-info .down { color: #3fb950; font-size: 0.62rem; font-weight: 700; font-variant-numeric: tabular-nums; }
.ohlc { font-size: 0.55rem; color: #8b949e; font-variant-numeric: tabular-nums; white-space: nowrap; }
.hint { font-size: 0.6rem; color: #555; }
</style>
