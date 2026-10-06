<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useDefectStore, type DefectRow } from '@/stores/defectStore'
import { DEFECT_TYPES, SEVERITIES, type DefectType, type Severity } from '@/types/defect'
import { formatRange } from '@/types/segment'

const props = defineProps<{
  modelValue: boolean
  /** 待复检的已修复缺陷（含分段 / 叶片 / 机组归属） */
  row: DefectRow | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  completed: []
}>()

const defectStore = useDefectStore()

function todayString(): string {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`
}

const submitting = ref(false)
const form = reactive({
  recheckAt: todayString(),
  positionM: 0,
  type: '裂纹' as DefectType,
  severity: '中度' as Severity
})

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value)
})

/** 打开对话框时以原缺陷信息为默认值回填表单 */
watch(
  () => [props.modelValue, props.row?.defect.id] as const,
  ([open]) => {
    if (!open || !props.row) return
    form.recheckAt = todayString()
    form.positionM = props.row.defect.positionM
    form.type = props.row.defect.type
    form.severity = props.row.defect.severity
  },
  { immediate: true }
)

const segment = computed(() => props.row?.segment ?? null)

/** 位置是否仍落在原分段区间内 */
const inRange = computed(() => {
  const current = segment.value
  if (!current) return false
  return form.positionM >= current.startM && form.positionM <= current.endM
})

/** 实时预判复发命中：与提交时同一套匹配规则 */
const matchedTarget = computed(() => {
  const row = props.row
  if (!row) return null
  return defectStore.matchRecheckTarget(row.defect, form.positionM, form.type)
})

const preview = computed<{ recurrent: boolean; text: string; type: 'success' | 'warning' }>(() => {
  const target = matchedTarget.value
  if (target) {
    return {
      recurrent: true,
      type: 'success',
      text: `将判定为复发：命中 ${target.type}（原发现 ${target.foundAt}，位置 ${target.positionM} m），复检次数加一、状态回到待处理，原工单保持闭环。`
    }
  }
  const reason = !inRange.value ? '复检位置超出原分段区间' : '同分段无类型一致的已修复缺陷'
  return {
    recurrent: false,
    type: 'warning',
    text: `将另存为新缺陷：${reason}，按本次填报内容新建一条待处理缺陷。`
  }
})

async function submit(): Promise<void> {
  const row = props.row
  if (!row) return
  if (!form.recheckAt) {
    ElMessage.warning('请选择复检日期')
    return
  }
  submitting.value = true
  try {
    const outcome = await defectStore.applyRecheck({
      defectId: row.defect.id,
      recheckAt: form.recheckAt,
      positionM: form.positionM,
      type: form.type,
      severity: form.severity
    })
    if (!outcome) {
      ElMessage.error('复检失败：原缺陷或分段记录不存在')
      return
    }
    if (outcome.kind === 'recurred') {
      ElMessage.success(
        `判定为复发（第 ${outcome.recheckCount} 次复检）：发现日期已取复检日期，等级以本次填报为准，状态回到待处理；原工单继续闭环。`
      )
    } else {
      ElMessage.success('未命中复发，已按本次填报另存为新缺陷（待处理）')
    }
    visible.value = false
    emit('completed')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog v-model="visible" title="缺陷回访复检" width="560px" destroy-on-close>
    <template v-if="row">
      <el-descriptions :column="2" size="small" border class="recheck-meta">
        <el-descriptions-item label="机组 / 叶片">
          {{ row.turbine?.code ?? '—' }} · 叶片 {{ row.blade?.serial ?? '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="原分段">
          <template v-if="segment">
            第 {{ segment.index }} 段 · {{ formatRange(segment.startM, segment.endM) }}
          </template>
          <template v-else>—</template>
        </el-descriptions-item>
        <el-descriptions-item label="原缺陷">
          {{ row.defect.type }}（{{ row.defect.severity }}）· {{ row.defect.positionM }} m
        </el-descriptions-item>
        <el-descriptions-item label="已复检">
          {{ row.defect.recheckCount }} 次<template v-if="row.defect.lastRecheckAt">
            · 最近 {{ row.defect.lastRecheckAt }}
          </template>
        </el-descriptions-item>
      </el-descriptions>

      <el-form label-width="110px" class="recheck-form">
        <el-form-item label="复检日期" required>
          <el-date-picker v-model="form.recheckAt" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="位置米数" required>
          <el-input-number v-model="form.positionM" :min="0" :max="130" :step="0.1" :precision="2" />
          <span class="muted unit">米（落在原分段区间且类型一致即算复发）</span>
        </el-form-item>
        <el-form-item label="缺陷类型">
          <el-select v-model="form.type" class="full-width">
            <el-option v-for="type in DEFECT_TYPES" :key="type" :label="type" :value="type" />
          </el-select>
        </el-form-item>
        <el-form-item label="本次等级">
          <el-radio-group v-model="form.severity">
            <el-radio-button v-for="severity in SEVERITIES" :key="severity" :value="severity">
              {{ severity }}
            </el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <el-alert :type="preview.type" :closable="false" show-icon :title="preview.text" />
    </template>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">提交复检</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.recheck-meta {
  margin-bottom: 14px;
}

.recheck-form {
  margin-bottom: 4px;
}

.full-width {
  width: 100%;
}

.unit {
  margin-left: 8px;
  font-size: 12px;
}
</style>
