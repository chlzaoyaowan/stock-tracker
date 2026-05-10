<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="$emit('update:modelValue', false)">
      <div class="modal">
        <div class="modal-header">
          <h3>标签库管理</h3>
          <button class="close-btn" @click="$emit('update:modelValue', false)">×</button>
        </div>
        <div class="modal-body">
          <div class="add-row">
            <input
              v-model="newTagName"
              class="tag-input"
              placeholder="输入新标签名称..."
              @keydown.enter="addTag"
            >
            <button class="btn primary" :disabled="!newTagName.trim()" @click="addTag">添加</button>
          </div>
          <div class="tag-grid">
            <div
              v-for="tag in tagStore.sortedTags"
              :key="tag.name"
              class="tag-item"
              :style="{ borderColor: selectedForEdit === tag.name ? tag.color : 'transparent' }"
            >
              <div class="tag-info">
                <span
                  class="tag-dot"
                  :style="{ background: tag.color }"
                ></span>
                <span class="tag-name">{{ tag.name }}</span>
                <span class="tag-count">×{{ tag.count }}</span>
              </div>
              <div class="tag-actions">
                <button class="act-btn" @click="startRename(tag.name)">重命名</button>
                <button class="act-btn danger" @click="removeTag(tag.name)">删除</button>
              </div>
            </div>
          </div>
          <p v-if="!tagStore.tags.length" class="empty">还没有标签</p>
        </div>

        <!-- Rename Modal -->
        <div v-if="renameTagName !== null" class="rename-overlay" @click.self="renameTagName = null">
          <div class="rename-modal">
            <h4>重命名标签</h4>
            <input v-model="renameValue" class="tag-input" @keydown.enter="confirmRename">
            <div class="rename-actions">
              <button class="btn" @click="renameTagName = null">取消</button>
              <button class="btn primary" :disabled="!renameValue.trim()" @click="confirmRename">确认</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'
import { useTagStore } from '../stores/tagStore.js'
import { useStockStore } from '../stores/stockStore.js'

const props = defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])

const tagStore = useTagStore()
const stockStore = useStockStore()

const newTagName = ref('')
const renameTagName = ref(null)
const renameValue = ref('')
const selectedForEdit = ref(null)

function addTag() {
  const name = newTagName.value.trim()
  if (!name) return
  if (tagStore.addTag(name)) {
    newTagName.value = ''
  }
}

function removeTag(name) {
  if (!confirm(`确定删除标签「${name}」？`)) return
  tagStore.removeTag(name)
  // 从所有股票中移除该标签
  stockStore.stocks.forEach(s => {
    s.tags = s.tags.filter(t => t !== name)
  })
  stockStore.save()
}

function startRename(name) {
  renameTagName.value = name
  renameValue.value = name
}

function confirmRename() {
  const newName = renameValue.value.trim()
  if (!newName || newName === renameTagName.value) {
    renameTagName.value = null
    return
  }
  // 更新标签库
  tagStore.renameTag(renameTagName.value, newName)
  // 更新所有股票中的该标签
  stockStore.stocks.forEach(s => {
    const idx = s.tags.indexOf(renameTagName.value)
    if (idx >= 0) s.tags[idx] = newName
  })
  stockStore.save()
  renameTagName.value = null
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
  width: 520px;
  max-width: 95vw;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
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
}

.close-btn:hover { color: #e6edf3; }

.modal-body { padding: 16px 20px; }

.add-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tag-input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #30363d;
  background: #0d1117;
  color: #e6edf3;
  font-size: 0.85rem;
  outline: none;
}

.tag-input:focus { border-color: #58a6ff; }

.tag-grid {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 400px;
  overflow-y: auto;
}

.tag-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 8px;
  border-width: 2px;
  transition: all 0.15s;
}

.tag-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tag-name { font-size: 0.85rem; color: #e6edf3; }

.tag-count {
  font-size: 0.72rem;
  color: #8b949e;
}

.tag-actions {
  display: flex;
  gap: 4px;
}

.act-btn {
  background: none;
  border: none;
  color: #8b949e;
  font-size: 0.75rem;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}

.act-btn:hover { color: #58a6ff; background: #58a6ff22; }
.act-btn.danger:hover { color: #f85149; background: #f8514922; }

.empty {
  text-align: center;
  color: #8b949e;
  font-size: 0.85rem;
  padding: 20px;
}

.btn {
  padding: 8px 16px;
  border-radius: 8px;
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

.rename-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
}

.rename-modal {
  background: #1c2128;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 20px;
  width: 300px;
}

.rename-modal h4 {
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.rename-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}
</style>
