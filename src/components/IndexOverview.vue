<template>
  <div class="index-overview">
    <div v-if="indices.length" class="indices-row">
      <div v-for="idx in indices" :key="idx.code" class="index-item">
        <div class="idx-name">{{ idx.name.replace('指数','') }}</div>
        <div class="idx-price">{{ idx.price.toFixed(2) }}</div>
        <div class="idx-change" :class="idx.change >= 0 ? 'up' : 'down'">
          {{ idx.change >= 0 ? '+' : '' }}{{ idx.change.toFixed(2) }}%
        </div>
      </div>
    </div>
    <div v-else class="indices-loading">
      <span>加载中...</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { fetchIndex } from '../services/stockApi.js'

const indices = ref([])

let timer = null

async function load() {
  const data = await fetchIndex()
  indices.value = data
}

onMounted(() => {
  load()
  timer = setInterval(load, 30000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<style scoped>
.index-overview {
  background: #161b22;
  border-bottom: 1px solid #30363d;
  padding: 12px 20px;
}

.indices-row {
  display: flex;
  gap: 20px;
}

.index-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.idx-name {
  font-size: 0.78rem;
  color: #8b949e;
}

.idx-price {
  font-size: 0.88rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.idx-change {
  font-size: 0.78rem;
  font-variant-numeric: tabular-nums;
}

.idx-change.up { color: #f85149; }
.idx-change.down { color: #3fb950; }

.indices-loading {
  font-size: 0.8rem;
  color: #8b949e;
}
</style>
