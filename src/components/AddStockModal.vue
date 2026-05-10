<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="close">
      <div class="modal">
        <div class="modal-header">
          <h3>添加持仓</h3>
          <button class="close-btn" @click="close">×</button>
        </div>

        <div class="modal-body">
          <!-- 股票搜索 -->
          <div class="form-group">
            <label>股票代码 / 名称 *</label>
            <div class="search-wrap">
              <input
                ref="searchInputRef"
                v-model="searchText"
                class="search-input"
                :class="{ 'has-result': searchResults.length > 0 && showDropdown }"
                placeholder="输入代码或名称搜索，如 300005 或 探路者"
                @input="onSearchInput"
                @focus="showDropdown = true"
                @keydown.escape="showDropdown = false"
              >
              <div v-if="searchResults.length > 0 && showDropdown" class="search-dropdown">
                <div
                  v-for="item in searchResults"
                  :key="item.code"
                  class="search-item"
                  :class="{ selected: selectedCode === item.code }"
                  @click="selectItem(item)"
                >
                  <span class="si-name">{{ item.name }}</span>
                  <span class="si-code">{{ item.code }}</span>
                </div>
              </div>
            </div>

            <!-- 已验证股票 -->
            <div v-if="verifiedName" class="verified-name">
              <span class="vname">{{ verifiedName }}</span>
              <span class="vcode">{{ verifiedCode }}</span>
            </div>
            <div v-if="verifyError" class="verify-error">{{ verifyError }}</div>
          </div>

          <!-- 分类选择 -->
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

          <!-- 笔记 -->
          <div class="form-group">
            <label>买入理由 / 笔记 <span class="hint">选填</span></label>
            <textarea
              v-model="note"
              placeholder="描述买入逻辑，如：商业航天+卫星导航双主业..."
              rows="3"
            ></textarea>
          </div>

          <!-- 标签选择 -->
          <div class="form-group">
            <label>概念标签（点击选择，可多选）</label>
            <div class="selected-tags">
              <span
                v-for="tag in selectedTags"
                :key="tag"
                class="tag sel-tag"
                :style="{ color: tagColor(tag), background: tagColor(tag) + '22' }"
                @click="removeTag(tag)"
              >{{ tag }} ×</span>
            </div>
            <div class="tag-cloud">
              <span
                v-for="tag in tagStore.sortedTags"
                :key="tag.name"
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
import { useStockStore } from '../stores/stockStore.js'
import { useCategoryStore } from '../stores/categoryStore.js'
import { tagColor } from '../stores/tagStore.js'
import { searchStocks, fetchStockQuote } from '../services/stockApi.js'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])

const tagStore = useTagStore()
const stockStore = useStockStore()
const categoryStore = useCategoryStore()

const searchText = ref('')
const searchResults = ref([])
const showDropdown = ref(false)
const selectedCode = ref('')
const verifiedName = ref('')
const verifiedCode = ref('')
const selectedCategory = ref('')
const note = ref('')
const selectedTags = ref([])
const verifying = ref(false)
const verifyError = ref('')
const searchInputRef = ref(null)

watch(() => props.modelValue, async (val) => {
  if (val) {
    searchText.value = ''
    searchResults.value = []
    showDropdown.value = false
    selectedCode.value = ''
    verifiedName.value = ''
    verifiedCode.value = ''
    selectedCategory.value = ''
    note.value = ''
    selectedTags.value = []
    verifyError.value = ''
    await nextTick()
    searchInputRef.value?.focus()
  }
})

let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  showDropdown.value = true
  verifyError.value = ''

  if (!searchText.value.trim()) {
    searchResults.value = []
    return
  }

  searchTimer = setTimeout(async () => {
    const results = await searchStocks(searchText.value.trim())
    searchResults.value = results
    if (results.length === 1 && /^\d{6}$/.test(searchText.value.trim())) {
      // 直接输入6位码时自动选中
      selectItem(results[0])
    }
  }, 300)
}

async function selectItem(item) {
  selectedCode.value = item.code
  searchText.value = `${item.name} (${item.code})`
  showDropdown.value = false
  searchResults.value = []

  verifying.value = true
  verifyError.value = ''
  try {
    const quote = await fetchStockQuote(item.code)
    if (quote && quote.name) {
      verifiedName.value = quote.name
      verifiedCode.value = item.code
    } else {
      verifiedName.value = item.name
      verifiedCode.value = item.code
    }
  } catch {
    verifiedName.value = item.name
    verifiedCode.value = item.code
  } finally {
    verifying.value = false
  }

  // 自动从笔记提取标签
  extractTagsFromNote()
}

function extractTagsFromNote() {
  const tags = new Set()
  note.value.split(/[+，,]/).forEach(part => {
    const clean = part.trim().replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')
    if (clean.length >= 2 && clean.length <= 8 && /[\u4e00-\u9fa5]/.test(clean)) {
      tags.add(clean)
    }
  })
  tags.forEach(t => {
    if (!selectedTags.value.includes(t) && tagStore.tags.some(x => x.name === t)) {
      selectedTags.value.push(t)
    }
  })
}

watch(note, () => extractTagsFromNote())

function toggleTag(name) {
  const idx = selectedTags.value.indexOf(name)
  if (idx >= 0) selectedTags.value.splice(idx, 1)
  else selectedTags.value.push(name)
}

function removeTag(name) {
  selectedTags.value = selectedTags.value.filter(t => t !== name)
}

const canAdd = computed(() =>
  !!(verifiedName.value && verifiedCode.value)
)

function confirmAdd() {
  if (!canAdd.value) return

  const noteTags = [...new Set(
    note.value.split(/[+，,]/).map(p => p.trim().replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '')).filter(p => p.length >= 2 && p.length <= 8 && /[\u4e00-\u9fa5]/.test(p))
  )]
  const allTags = [...new Set([...selectedTags.value, ...noteTags])]
    .filter(t => tagStore.tags.some(x => x.name === t))

  const result = stockStore.addStock({
    code: verifiedCode.value,
    name: verifiedName.value,
    tags: allTags,
    note: note.value.trim(),
    category: selectedCategory.value
  })

  if (result === false) {
    verifyError.value = '该股票已在持仓中'
    return
  }

  close()
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 16px;
  width: 500px;
  max-width: 95vw;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #30363d;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 { font-size: 1rem; font-weight: 600; }

.close-btn {
  background: none;
  border: none;
  color: #8b949e;
  font-size: 1.4rem;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover { color: #e6edf3; }

.modal-body { padding: 16px 20px; }

.form-group { margin-bottom: 16px; }

.form-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: #8b949e;
  margin-bottom: 6px;
}

.hint { font-size: 0.72rem; color: #555; }

.search-wrap { position: relative; }

.search-input {
  width: 100%;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid #30363d;
  background: #0d1117;
  color: #e6edf3;
  font-size: 0.88rem;
  outline: none;
  box-sizing: border-box;
}

.search-input:focus { border-color: #58a6ff; }
.search-input.has-result { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }

.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1c2128;
  border: 1px solid #30363d;
  border-top: none;
  border-radius: 0 0 8px 8px;
  z-index: 10;
  max-height: 220px;
  overflow-y: auto;
}

.search-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 12px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.1s;
}

.search-item:hover { background: #2d333b; }
.search-item.selected { background: #58a6ff22; }

.si-name { color: #e6edf3; font-weight: 500; }
.si-code { color: #8b949e; font-size: 0.75rem; font-family: monospace; }

.verified-name {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #0d1117;
  border: 1px solid #3fb950;
  border-radius: 8px;
}

.vname { font-size: 1rem; font-weight: 600; color: #3fb950; }
.vcode { font-size: 0.78rem; color: #8b949e; font-family: monospace; }

.verify-error {
  margin-top: 6px;
  font-size: 0.75rem;
  color: #f85149;
}

/* Category picker */
.category-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cat-item {
  font-size: 0.78rem;
  padding: 4px 12px;
  border-radius: 8px;
  border: 1px solid #30363d;
  background: #0d1117;
  color: #8b949e;
  cursor: pointer;
  transition: all 0.15s;
}

.cat-item:hover { border-color: #58a6ff; color: #e6edf3; }
.cat-item.active { border-color: #f0883e; color: #f0883e; background: #f0883e22; }

textarea {
  width: 100%;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid #30363d;
  background: #0d1117;
  color: #e6edf3;
  font-size: 0.85rem;
  font-family: inherit;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

textarea:focus { border-color: #58a6ff; }

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 26px;
  margin-bottom: 8px;
}

.sel-tag {
  font-size: 0.75rem;
  padding: 3px 9px;
  border-radius: 10px;
  cursor: pointer;
}

.sel-tag:hover { opacity: 0.7; }

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  border: 1px solid #30363d;
  border-radius: 8px;
  padding: 10px;
  background: #0d1117;
  max-height: 200px;
  overflow-y: auto;
}

.tag-pick {
  font-size: 0.78rem;
  padding: 3px 10px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s;
  user-select: none;
}

.tag-pick:hover { opacity: 0.8; }
.tag-pick.active { border-color: currentColor; }

.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid #30363d;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.btn {
  padding: 8px 20px;
  border-radius: 8px;
  border: 1px solid #30363d;
  background: transparent;
  color: #e6edf3;
  font-size: 0.85rem;
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
.btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
