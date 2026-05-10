<template>
  <div v-if="stock" class="detail-panel">
    <div class="detail-header">
      <div class="detail-title">
        <h2>{{ stock.name }}</h2>
        <span class="detail-code">{{ stock.code }}</span>
      </div>
      <button class="close-btn" @click="$emit('close')">×</button>
    </div>

    <div class="detail-body">
      <!-- 行情 -->
      <div class="quote-section">
        <template v-if="quote">
          <div class="quote-price">{{ quote.price.toFixed(2) }}</div>
          <div class="quote-change" :class="quote.change >= 0 ? 'up' : 'down'">
            {{ quote.change >= 0 ? '+' : '' }}{{ quote.change.toFixed(2) }}
            ({{ quote.changePct >= 0 ? '+' : '' }}{{ quote.changePct.toFixed(2) }}%)
          </div>
          <div class="quote-meta">
            <span>今开 {{ quote.open.toFixed(2) }}</span>
            <span>最高 {{ quote.high.toFixed(2) }}</span>
            <span>最低 {{ quote.low.toFixed(2) }}</span>
          </div>
          <div class="quote-time">{{ quote.time || '盘中' }}</div>
        </template>
        <template v-else>
          <div class="quote-price loading">--</div>
          <div class="quote-change">暂无行情</div>
        </template>
      </div>

      <!-- 买入/目标/止损价格设置 -->
      <div class="detail-section">
        <div class="section-header"><h4>价格设置</h4></div>
        <div class="price-form">
          <div class="price-row">
            <label class="plabel buy">买入价</label>
            <input v-model="formBuy" type="number" step="0.01" class="price-input" placeholder="买入价格">
          </div>
          <div class="price-row">
            <label class="plabel target">目标价</label>
            <input v-model="formTarget" type="number" step="0.01" class="price-input" placeholder="目标价格">
          </div>
          <div class="price-row">
            <label class="plabel stop">止损价</label>
            <input v-model="formStop" type="number" step="0.01" class="price-input" placeholder="止损价格">
          </div>
          <button class="save-price-btn" @click="savePrices">保存价格</button>
        </div>
      </div>

      <!-- 分类 -->
      <div class="detail-section">
        <div class="section-header">
          <h4>分类</h4>
        </div>
        <div class="category-picker">
          <div
            v-for="cat in categoryStore.categories.filter(c => c.name !== '全部')"
            :key="cat.id || cat.name"
            class="cat-chip"
            :class="{ active: localStock?.category === cat.name }"
            @click="setCategory(cat.name)"
          >{{ cat.name }}</div>
          <div
            class="cat-chip"
            :class="{ active: !localStock?.category }"
            @click="setCategory('')"
          >无</div>
        </div>
      </div>

      <!-- 标签 -->
      <div class="detail-section">
        <div class="section-header">
          <h4>概念标签</h4>
          <button class="edit-tag-btn" @click="editingTags = !editingTags">
            {{ editingTags ? '完成' : '编辑' }}
          </button>
        </div>
        <div class="tags-wrap">
          <span
            v-for="tag in (localStock?.tags || [])"
            :key="tag"
            class="tag"
            :style="{ color: tagColor(tag), background: tagColor(tag) + '22' }"
          >
            {{ tag }}
            <span v-if="editingTags" class="tag-remove" @click="removeTag(tag)">×</span>
          </span>
        </div>
        <div v-if="editingTags" class="tag-add-row">
          <div class="mini-picker">
            <span
              v-for="tag in availableTags"
              :key="tag.name"
              class="mini-tag"
              :class="{ active: (localStock?.tags || []).includes(tag.name) }"
              :style="{ color: tag.color, background: (localStock?.tags || []).includes(tag.name) ? tag.color + '33' : 'transparent' }"
              @click="toggleTag(tag.name)"
            >{{ tag.name }}</span>
          </div>
        </div>
      </div>

      <!-- 笔记 -->
      <div class="detail-section">
        <div class="section-header">
          <h4>买入理由</h4>
        </div>
        <div class="note-text" :class="{ editing: editingNote }">
          <textarea
            v-if="editingNote"
            v-model="noteText"
            class="note-input"
            rows="4"
          ></textarea>
          <p v-else>{{ stock.note || '暂无笔记' }}</p>
          <button class="edit-btn" @click="toggleNoteEdit">
            {{ editingNote ? '保存' : '编辑' }}
          </button>
        </div>
      </div>

      <!-- 回顾 -->
      <div class="detail-section">
        <div class="section-header">
          <h4>回顾记录</h4>
          <span class="review-status" :class="reviewStat?.status">
            {{ reviewDays }}天未回顾
          </span>
        </div>
        <div class="timeline">
          <div
            v-for="review in (stock.reviews || []).slice(0, 5)"
            :key="review.date"
            class="timeline-item"
          >
            <div class="tl-dot"></div>
            <div>
              <div class="tl-date">{{ review.date }}</div>
              <div v-if="review.note" class="tl-note">{{ review.note }}</div>
            </div>
          </div>
          <p v-if="!stock.reviews?.length" class="tl-empty">暂无回顾记录</p>
        </div>
        <button class="btn review-btn" @click="markReview">
          ✓ 标记已回顾
        </button>
      </div>
    </div>

    <div class="detail-footer">
      <button class="btn danger" @click="deleteStock">删除该持仓</button>
    </div>
  </div>

  <div v-else class="detail-empty">
    <p>点击股票卡片查看详情</p>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useStockStore } from '../stores/stockStore.js'
import { useTagStore, tagColor } from '../stores/tagStore.js'
import { useCategoryStore } from '../stores/categoryStore.js'

const props = defineProps({
  stock: { type: Object, default: null }
})

defineEmits(['close'])

const stockStore = useStockStore()
const tagStore = useTagStore()
const categoryStore = useCategoryStore()

const editingTags = ref(false)
const editingNote = ref(false)
const noteText = ref('')
const formBuy = ref('')
const formTarget = ref('')
const formStop = ref('')

// 始终从 store 读取最新数据，避免 prop 引用滞后
const localStock = ref(null)
watch(() => props.stock, (s) => {
  if (s) {
    localStock.value = stockStore.stocks.find(x => x.id === s.id) || s
    noteText.value = localStock.value.note || ''
    editingTags.value = false
    editingNote.value = false
    formBuy.value = localStock.value.buyPrice != null ? String(localStock.value.buyPrice) : ''
    formTarget.value = localStock.value.targetPrice != null ? String(localStock.value.targetPrice) : ''
    formStop.value = localStock.value.stopLossPrice != null ? String(localStock.value.stopLossPrice) : ''
  }
}, { immediate: true })

function savePrices() {
  if (!localStock.value) return
  const buy = formBuy.value ? parseFloat(formBuy.value) : null
  const target = formTarget.value ? parseFloat(formTarget.value) : null
  const stop = formStop.value ? parseFloat(formStop.value) : null
  stockStore.updateStockPrice(localStock.value.id, {
    buyPrice: buy,
    targetPrice: target,
    stopLossPrice: stop,
  })
  localStock.value = stockStore.stocks.find(x => x.id === localStock.value.id)
}

const quote = computed(() => props.stock ? stockStore.getQuote(props.stock.code) : null)

const reviewStat = computed(() =>
  stockStore.reviewStats.find(r => r.id === props.stock?.id)
)

const reviewDays = computed(() => reviewStat.value?.daysSince ?? 0)

const availableTags = computed(() =>
  tagStore.sortedTags.filter(t => !(localStock?.tags || []).includes(t.name))
)

function setCategory(name) {
  if (!localStock.value) return
  stockStore.updateStockCategory(localStock.value.id, name)
  // 同步更新 localStock
  localStock.value = stockStore.stocks.find(x => x.id === localStock.value.id)
}

function toggleTag(name) {
  if (!localStock.value) return
  const tags = [...(localStock.value.tags || [])]
  const idx = tags.indexOf(name)
  if (idx >= 0) {
    tags.splice(idx, 1)
  } else {
    tags.push(name)
  }
  stockStore.updateStockTags(localStock.value.id, tags)
  localStock.value = stockStore.stocks.find(x => x.id === localStock.value.id)
}

function removeTag(name) {
  if (!localStock.value) return
  stockStore.updateStockTags(localStock.value.id, (localStock.value.tags || []).filter(t => t !== name))
  localStock.value = stockStore.stocks.find(x => x.id === localStock.value.id)
}

function toggleNoteEdit() {
  if (editingNote.value) {
    if (localStock.value) {
      stockStore.updateStockNote(localStock.value.id, noteText.value)
      localStock.value = stockStore.stocks.find(x => x.id === localStock.value.id)
    }
    editingNote.value = false
  } else {
    editingNote.value = true
  }
}

function markReview() {
  if (!props.stock) return
  stockStore.addReview(props.stock.id)
}

function deleteStock() {
  if (!props.stock || !confirm(`确定删除「${props.stock.name}」？`)) return
  stockStore.removeStock(props.stock.id)
}
</script>

<style scoped>
.detail-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #161b22;
  border-left: 1px solid #30363d;
}

.detail-header {
  padding: 14px 16px;
  border-bottom: 1px solid #30363d;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.detail-title h2 {
  font-size: 1rem;
  font-weight: 600;
}

.detail-code {
  font-size: 0.72rem;
  color: #8b949e;
  margin-left: 6px;
}

.close-btn {
  background: none;
  border: none;
  color: #8b949e;
  font-size: 1.3rem;
  cursor: pointer;
}

.close-btn:hover { color: #e6edf3; }

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.quote-section {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.quote-price {
  font-size: 2rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.quote-price.loading { color: #8b949e; }

.quote-change {
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  margin-top: 4px;
}

.quote-change.up { color: #f85149; }
.quote-change.down { color: #3fb950; }

.quote-meta {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 0.75rem;
  color: #8b949e;
}

.quote-time {
  font-size: 0.72rem;
  color: #8b949e;
  margin-top: 4px;
}

.detail-section { margin-bottom: 20px; }

.price-form { background: #0d1117; border: 1px solid #30363d; border-radius: 10px; padding: 12px; }
.price-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.price-row:last-of-type { margin-bottom: 10px; }
.plabel { font-size: 0.75rem; width: 42px; flex-shrink: 0; font-weight: 600; border-radius: 6px; padding: 2px 6px; text-align: center; }
.plabel.buy { background: #58a6ff22; color: #58a6ff; }
.plabel.target { background: #3fb95022; color: #3fb950; }
.plabel.stop { background: #f8514922; color: #f85149; }
.price-input { flex: 1; background: #161b22; border: 1px solid #30363d; border-radius: 6px; color: #e6edf3; font-size: 0.85rem; padding: 6px 10px; outline: none; font-variant-numeric: tabular-nums; }
.price-input:focus { border-color: #58a6ff; }
.price-input::placeholder { color: #555; }
.save-price-btn { width: 100%; padding: 8px; border-radius: 8px; border: 1px solid #30363d; background: transparent; color: #e6edf3; font-size: 0.82rem; cursor: pointer; }
.save-price-btn:hover { border-color: #58a6ff; color: #58a6ff; }

.category-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cat-chip {
  font-size: 0.78rem;
  padding: 4px 12px;
  border-radius: 8px;
  border: 1px solid #30363d;
  background: #0d1117;
  color: #8b949e;
  cursor: pointer;
  transition: all 0.15s;
}

.cat-chip:hover { border-color: #58a6ff; color: #e6edf3; }
.cat-chip.active { border-color: #f0883e; color: #f0883e; background: #f0883e22; }

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-header h4 {
  font-size: 0.75rem;
  color: #8b949e;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.edit-tag-btn {
  background: none;
  border: none;
  color: #58a6ff;
  font-size: 0.75rem;
  cursor: pointer;
}

.tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  font-size: 0.78rem;
  padding: 4px 10px;
  border-radius: 12px;
}

.tag-remove {
  margin-left: 4px;
  cursor: pointer;
  opacity: 0.6;
}

.tag-remove:hover { opacity: 1; }

.tag-add-row {
  margin-top: 8px;
}

.mini-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 8px;
}

.mini-tag {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid transparent;
}

.mini-tag:hover { opacity: 0.8; }

.note-text {
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 10px 14px;
  position: relative;
}

.note-text p {
  font-size: 0.85rem;
  color: #e6edf3;
  line-height: 1.6;
  white-space: pre-wrap;
}

.note-text.editing { border-color: #58a6ff; }

.note-input {
  width: 100%;
  background: transparent;
  border: none;
  color: #e6edf3;
  font-size: 0.85rem;
  font-family: inherit;
  resize: vertical;
  outline: none;
  line-height: 1.6;
}

.edit-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: none;
  border: none;
  color: #58a6ff;
  font-size: 0.72rem;
  cursor: pointer;
}

.review-status {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 6px;
}

.review-status.review { background: #d2992244; color: #d29922; }
.review-status.urgent { background: #f8514944; color: #f85149; }
.review-status.ok { background: #3fb95044; color: #3fb950; }

.timeline {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.timeline-item {
  display: flex;
  gap: 10px;
  font-size: 0.8rem;
}

.tl-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #58a6ff;
  margin-top: 5px;
  flex-shrink: 0;
}

.tl-date { color: #8b949e; font-size: 0.75rem; }
.tl-note { color: #e6edf3; margin-top: 2px; }
.tl-empty { font-size: 0.78rem; color: #8b949e; }

.review-btn {
  width: 100%;
  padding: 9px;
  border-radius: 8px;
  border: 1px solid #30363d;
  background: transparent;
  color: #e6edf3;
  font-size: 0.85rem;
  cursor: pointer;
  text-align: center;
}

.review-btn:hover { border-color: #3fb950; color: #3fb950; }

.detail-footer {
  padding: 12px 16px;
  border-top: 1px solid #30363d;
}

.btn.danger {
  width: 100%;
  padding: 9px;
  border-radius: 8px;
  border: 1px solid #f85149;
  background: transparent;
  color: #f85149;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn.danger:hover { background: #f85149; color: #fff; }

.detail-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8b949e;
  font-size: 0.85rem;
  background: #161b22;
  border-left: 1px solid #30363d;
}
</style>
