<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <h3>添加美股持仓</h3>
          <button class="close-btn" @click="close">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>股票代码 / 名称 *</label>
            <div class="search-wrap">
              <input
                ref="searchInputRef"
                v-model="searchText"
                class="search-input"
                :class="{ 'has-result': showDropdown && (searchResults.length > 0 || showDirectAdd) }"
                placeholder="输入代码或名称，如 AAPL 或 Apple"
                @input="onSearchInput"
                @focus="showDropdown = true"
                @keydown.escape="showDropdown = false"
                @keydown.enter="tryDirectAdd"
              >
              <div v-if="showDropdown && (searchResults.length > 0 || showDirectAdd)" class="search-dropdown">
                <div
                  v-for="item in searchResults"
                  :key="item.symbol"
                  class="search-item"
                  :class="{ selected: selectedSymbol === item.symbol }"
                  @click="selectItem(item)"
                >
                  <span class="si-name">{{ item.name }}</span>
                  <span class="si-code">{{ item.symbol }}</span>
                </div>
                <div
                  v-if="showDirectAdd && !searchResults.some(i => i.symbol === directSymbol)"
                  class="search-item direct-add"
                  @click="directAddSymbol"
                >
                  <span class="si-name">直接添加</span>
                  <span class="si-code">{{ directSymbol }}</span>
                </div>
                <div v-if="searchResults.length === 0 && !showDirectAdd && !searching" class="search-empty">
                  按 Enter 尝试添加
                </div>
              </div>
            </div>
            <div v-if="verifiedSymbol" class="verified-name">
              <span class="vname">{{ verifiedName }}</span>
              <span class="vsym">{{ verifiedSymbol }}</span>
            </div>
          </div>

          <div class="form-group">
            <label>分类</label>
            <div class="category-picker">
              <div
                v-for="cat in categoryStore.categories.filter(c => c.name !== '全部')"
                :key="cat.id || cat.name"
                class="cat-item"
                :class="{ active: selectedCategory === cat.name }"
                @click="selectedCategory = selectedCategory === cat.name ? '' : cat.name"
              >{{ cat.name }}</div>
            </div>
          </div>

          <div class="form-group">
            <label>买入理由 / 笔记 <span class="hint">选填</span></label>
            <textarea v-model="note" placeholder="描述买入逻辑，如：AI算力龙头..." rows="3"></textarea>
          </div>

          <div class="form-group">
            <label>概念标签（点击选择）</label>
            <div class="selected-tags">
              <span
                v-for="tag in selectedTags" :key="tag"
                class="tag sel-tag"
                :style="{ color: tagColorFn(tag), background: tagColorFn(tag) + '22' }"
                @click="removeTag(tag)"
              >{{ tag }} ×</span>
            </div>
            <div class="tag-cloud">
              <span
                v-for="tag in tagStore.sortedTags" :key="tag.name"
                class="tag-pick"
                :class="{ active: selectedTags.includes(tag.name) }"
                :style="{ color: tag.color, background: selectedTags.includes(tag.name) ? tag.color + '33' : 'transparent' }"
                @click="toggleTag(tag.name)"
              >{{ tag.name }}</span>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn" @click="close">取消</button>
          <button class="btn primary" :disabled="!canAdd" @click="confirmAdd">
            {{ canAdd ? '确认添加' : '请选择一只股票' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useTagStore } from '../stores/tagStore.js'
import { useUSStockStore } from '../stores/usStockStore.js'
import { useCategoryStore } from '../stores/categoryStore.js'
import { searchUSStocks, fetchUSQuote } from '../services/usStockApi.js'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])

const tagStore = useTagStore()
const usStockStore = useUSStockStore()
const categoryStore = useCategoryStore()

const searchText = ref('')
const searchResults = ref([])
const showDropdown = ref(false)
const selectedSymbol = ref('')
const verifiedName = ref('')
const verifiedSymbol = ref('')
const selectedCategory = ref('')
const note = ref('')
const selectedTags = ref([])
const searchInputRef = ref(null)
const searching = ref(false)
const showDirectAdd = ref(false)
const directSymbol = ref('')

watch(() => props.modelValue, async (val) => {
  if (val) {
    searchText.value = ''
    searchResults.value = []
    showDropdown.value = false
    selectedSymbol.value = ''
    verifiedName.value = ''
    verifiedSymbol.value = ''
    selectedCategory.value = ''
    note.value = ''
    selectedTags.value = []
    searching.value = false
    showDirectAdd.value = false
    directSymbol.value = ''
    await nextTick()
    searchInputRef.value?.focus()
  }
})

let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  showDropdown.value = true
  const q = searchText.value.trim().toUpperCase()

  if (!q) {
    searchResults.value = []
    showDirectAdd.value = false
    return
  }

  // 检查是否符合 symbol 格式
  if (/^[A-Z]{1,5}(\.[A-Z]{1,3})?$/.test(q)) {
    directSymbol.value = q
    showDirectAdd.value = true
  } else {
    directSymbol.value = ''
    showDirectAdd.value = false
  }

  searchTimer = setTimeout(async () => {
    searching.value = true
    const results = await searchUSStocks(q)
    searching.value = false
    searchResults.value = results
  }, 300)
}

async function selectItem(item) {
  selectedSymbol.value = item.symbol
  searchText.value = `${item.name} (${item.symbol})`
  showDropdown.value = false
  searchResults.value = []
  showDirectAdd.value = false

  const q = await fetchUSQuote(item.symbol)
  if (!q.error) {
    verifiedName.value = item.name
    verifiedSymbol.value = item.symbol
  } else {
    verifiedName.value = item.name
    verifiedSymbol.value = item.symbol
  }
}

function tryDirectAdd() {
  const q = searchText.value.trim().toUpperCase()
  if (!q) return
  showDropdown.value = false
  directAddSymbol()
}

async function directAddSymbol() {
  const q = (searchText.value.trim() || directSymbol.value).toUpperCase()
  if (!q || !/^[A-Z]{1,5}(\.[A-Z]{1,3})?$/.test(q)) return

  selectedSymbol.value = q
  searchText.value = `${q}`
  showDropdown.value = false
  showDirectAdd.value = false

  // 尝试验证（可能失败，但 symbol 格式正确就允许添加）
  const quote = await fetchUSQuote(q)
  verifiedSymbol.value = q
  verifiedName.value = quote && !quote.error ? q : q
}

function toggleTag(name) {
  const idx = selectedTags.value.indexOf(name)
  if (idx >= 0) selectedTags.value.splice(idx, 1)
  else selectedTags.value.push(name)
}

function removeTag(name) {
  selectedTags.value = selectedTags.value.filter(t => t !== name)
}

const canAdd = computed(() => !!(verifiedName.value && verifiedSymbol.value))

function confirmAdd() {
  if (!canAdd.value) return
  const noteTags = [...new Set(
    note.value.split(/[+，,]/).map(p => p.trim().replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')).filter(p => p.length >= 2 && p.length <= 8 && /[\u4e00-\u9fa5]/.test(p))
  )]
  const allTags = [...new Set([...selectedTags.value, ...noteTags])].filter(t => tagStore.tags.some(x => x.name === t))

  const result = usStockStore.addStock({
    symbol: verifiedSymbol.value,
    name: verifiedName.value,
    tags: allTags,
    note: note.value.trim(),
    category: selectedCategory.value
  })

  if (result === false) {
    alert('该股票已在持仓中')
    return
  }
  close()
}

function close() { emit('update:modelValue', false) }

const TAG_COLORS = ['#58a6ff','#f0883e','#3fb950','#d29922','#f85149','#a371f7','#39c5cf','#db61a2','#e3b341','#73c7d1']
function tagColorFn(tag) { let h = 0; for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff; return TAG_COLORS[Math.abs(h) % TAG_COLORS.length] }
</script>

<style scoped>
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.modal { background: #161b22; border: 1px solid #30363d; border-radius: 16px; width: 500px; max-width: 95vw; max-height: 90vh; overflow-y: auto; }
.modal-header { padding: 16px 20px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { font-size: 1rem; font-weight: 600; }
.close-btn { background: none; border: none; color: #8b949e; font-size: 1.4rem; cursor: pointer; line-height: 1; }
.close-btn:hover { color: #e6edf3; }
.modal-body { padding: 16px 20px; }
.form-group { margin-bottom: 16px; }
.form-group label { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: #8b949e; margin-bottom: 6px; }
.hint { font-size: 0.72rem; color: #555; }
.search-wrap { position: relative; }
.search-input { width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid #30363d; background: #0d1117; color: #e6edf3; font-size: 0.88rem; outline: none; box-sizing: border-box; }
.search-input:focus { border-color: #58a6ff; }
.search-input.has-result { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
.search-dropdown { position: absolute; top: 100%; left: 0; right: 0; background: #1c2128; border: 1px solid #30363d; border-top: none; border-radius: 0 0 8px 8px; z-index: 10; max-height: 220px; overflow-y: auto; }
.search-item { display: flex; justify-content: space-between; align-items: center; padding: 9px 12px; cursor: pointer; font-size: 0.85rem; transition: background 0.1s; }
.search-item:hover { background: #2d333b; }
.search-item.selected { background: #58a6ff22; }
.search-item.direct-add { border-top: 1px solid #30363d; margin-top: 2px; padding-top: 8px; }
.search-item.direct-add .si-name { color: #f0883e; }
.search-empty { padding: 8px 12px; font-size: 0.78rem; color: #8b949e; text-align: center; }
.si-name { color: #e6edf3; font-weight: 500; }
.si-code { color: #8b949e; font-size: 0.75rem; font-family: monospace; }
.verified-name { display: flex; align-items: center; gap: 10px; margin-top: 8px; padding: 8px 12px; background: #0d1117; border: 1px solid #3fb950; border-radius: 8px; }
.vname { font-size: 1rem; font-weight: 600; color: #3fb950; }
.vsym { font-size: 0.78rem; color: #8b949e; font-family: monospace; }
.category-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.cat-item { font-size: 0.78rem; padding: 4px 12px; border-radius: 8px; border: 1px solid #30363d; background: #0d1117; color: #8b949e; cursor: pointer; transition: all 0.15s; }
.cat-item:hover { border-color: #58a6ff; color: #e6edf3; }
.cat-item.active { border-color: #f0883e; color: #f0883e; background: #f0883e22; }
textarea { width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid #30363d; background: #0d1117; color: #e6edf3; font-size: 0.85rem; font-family: inherit; resize: vertical; outline: none; box-sizing: border-box; }
textarea:focus { border-color: #58a6ff; }
.selected-tags { display: flex; flex-wrap: wrap; gap: 6px; min-height: 26px; margin-bottom: 8px; }
.sel-tag { font-size: 0.75rem; padding: 3px 9px; border-radius: 10px; cursor: pointer; }
.sel-tag:hover { opacity: 0.7; }
.tag-cloud { display: flex; flex-wrap: wrap; gap: 6px; border: 1px solid #30363d; border-radius: 8px; padding: 10px; background: #0d1117; max-height: 200px; overflow-y: auto; }
.tag-pick { font-size: 0.78rem; padding: 3px 10px; border-radius: 10px; cursor: pointer; border: 1px solid transparent; transition: all 0.15s; user-select: none; }
.tag-pick:hover { opacity: 0.8; }
.tag-pick.active { border-color: currentColor; }
.modal-footer { padding: 12px 20px; border-top: 1px solid #30363d; display: flex; justify-content: flex-end; gap: 8px; }
.btn { padding: 8px 20px; border-radius: 8px; border: 1px solid #30363d; background: transparent; color: #e6edf3; font-size: 0.85rem; cursor: pointer; transition: all 0.15s; }
.btn:hover { border-color: #58a6ff; }
.btn.primary { background: #f0883e; border-color: #f0883e; color: #fff; }
.btn.primary:hover { background: #e07a32; }
.btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
