<template>
  <div class="category-bar">
    <div class="category-tabs">
      <div
        v-for="cat in categoryStore.categories"
        :key="cat.id || cat.name"
        class="cat-tab"
        :class="{ active: activeCategory === cat.name }"
        @click="selectCategory(cat.name)"
      >
        {{ cat.name }}
        <span v-if="cat.name !== '全部' && stockCountByCategory(cat.name) > 0" class="cat-count">
          {{ stockCountByCategory(cat.name) }}
        </span>
        <button
          v-if="cat.name !== '全部'"
          class="cat-del-btn"
          @click.stop="deleteCategory(cat.name)"
          title="删除分类"
        >×</button>
      </div>
      <button class="cat-add-btn" @click="showAdd = true">+</button>
    </div>

    <!-- 添加分类弹窗 -->
    <div v-if="showAdd" class="add-cat-modal" @click.self="showAdd = false">
      <div class="add-cat-box">
        <input
          v-model="newCatName"
          class="cat-input"
          placeholder="输入分类名称，如：CPO板块"
          @keydown.enter="addCategory"
          ref="addCatInput"
        >
        <div class="add-cat-actions">
          <button class="btn" @click="showAdd = false">取消</button>
          <button class="btn primary" :disabled="!newCatName.trim()" @click="addCategory">添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, computed } from 'vue'
import { useCategoryStore } from '../stores/categoryStore.js'
import { useStockStore } from '../stores/stockStore.js'
import { useUSStockStore } from '../stores/usStockStore.js'

const props = defineProps({
  type: { type: String, default: 'astock' } // 'astock' | 'usstock'
})

const emit = defineEmits(['categoryChange'])

const categoryStore = useCategoryStore()
const stockStore = useStockStore()
const usStockStore = useUSStockStore()

const activeCategory = ref('全部')
const showAdd = ref(false)
const newCatName = ref('')
const addCatInput = ref(null)

const stockList = computed(() => props.type === 'usstock' ? usStockStore.stocks : stockStore.stocks)

function selectCategory(name) {
  activeCategory.value = name
  emit('categoryChange', name)
}

function stockCountByCategory(name) {
  return stockList.value.filter(s => s.category === name).length
}

async function addCategory() {
  const name = newCatName.value.trim()
  if (!name) return
  if (categoryStore.addCategory(name)) {
    newCatName.value = ''
    showAdd.value = false
  }
}

function deleteCategory(name) {
  const count = stockCountByCategory(name)
  const msg = count > 0
    ? `「${name}」分类下有 ${count} 只股票，删除后这些股票的分类将变为空，确定删除？`
    : `确定删除分类「${name}」？`
  if (!confirm(msg)) return
  // 清除该分类下所有股票的 category
  stockList.value.forEach(s => {
    if (s.category === name) {
      if (props.type === 'usstock') {
        usStockStore.updateStockCategory(s.id, '')
      } else {
        stockStore.updateStockCategory(s.id, '')
      }
    }
  })
  categoryStore.removeCategory(name)
  if (activeCategory.value === name) {
    activeCategory.value = '全部'
    emit('categoryChange', '全部')
  }
}
</script>

<style scoped>
.category-bar {
  background: #161b22;
  border-bottom: 1px solid #30363d;
  padding: 0 20px;
  position: relative;
}

.category-tabs {
  display: flex;
  align-items: center;
  gap: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.category-tabs::-webkit-scrollbar { display: none; }

.cat-tab {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 10px 14px;
  font-size: 0.82rem;
  color: #8b949e;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
  transition: all 0.15s;
  flex-shrink: 0;
}

.cat-tab:hover { color: #e6edf3; }

.cat-tab.active {
  color: #f0883e;
  border-bottom-color: #f0883e;
}

.cat-count {
  font-size: 0.7rem;
  background: #f0883e33;
  color: #f0883e;
  padding: 1px 5px;
  border-radius: 8px;
}

.cat-del-btn {
  background: none;
  border: none;
  color: #8b949e;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0 2px;
  line-height: 1;
  margin-left: 2px;
  border-radius: 3px;
  display: none;
}
.cat-tab:hover .cat-del-btn { display: inline; }
.cat-del-btn:hover { color: #f85149; background: #f8514922; }

.cat-add-btn {
  background: none;
  border: none;
  color: #8b949e;
  font-size: 1rem;
  cursor: pointer;
  padding: 8px;
  flex-shrink: 0;
}

.cat-add-btn:hover { color: #f0883e; }

/* Add category modal */
.add-cat-modal {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 60px;
  z-index: 10;
}

.add-cat-box {
  background: #1c2128;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 16px;
  width: 300px;
}

.cat-input {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #30363d;
  background: #0d1117;
  color: #e6edf3;
  font-size: 0.88rem;
  outline: none;
  box-sizing: border-box;
}

.cat-input:focus { border-color: #58a6ff; }

.add-cat-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid #30363d;
  background: transparent;
  color: #e6edf3;
  font-size: 0.82rem;
  cursor: pointer;
}

.btn.primary {
  background: #f0883e;
  border-color: #f0883e;
  color: #fff;
}

.btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
