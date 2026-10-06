import type { SegmentFace } from '@/types/segment'

/** 缺陷类型 */
export type DefectType = '裂纹' | '雷击' | '前缘腐蚀' | '油污' | '砂眼'
/** 严重程度 */
export type Severity = '轻度' | '中度' | '重度'
/** 缺陷处置状态 */
export type DefectState = '待处理' | '已派工' | '已修复'

/**
 * 缺陷：挂在某个展向分段上的一处叶片损伤。
 * 同一分段可叠加多条缺陷，逐级汇总到叶片与机组。
 */
export interface Defect {
  id: string
  segmentId: string
  type: DefectType
  severity: Severity
  /** 缺陷长度（毫米） */
  lengthMm: number
  /** 缺陷宽度（毫米） */
  widthMm: number
  /** 面位，与所属分段检修面一致时可作为快速录入默认值 */
  face: SegmentFace
  /** 展向位置（米），应落在所属分段的 startM-endM 区间内 */
  positionM: number
  /** 发现日期 YYYY-MM-DD；复发后取最近一次复检日期 */
  foundAt: string
  state: DefectState
  /** 复检次数：已修复缺陷回访复检被判为复发时累加 */
  recheckCount: number
  /** 最近复检日期 YYYY-MM-DD，从未复检为 null */
  lastRecheckAt: string | null
  createdAt: number
  updatedAt: number
}

export const DEFECT_TYPES: DefectType[] = ['裂纹', '雷击', '前缘腐蚀', '油污', '砂眼']
export const SEVERITIES: Severity[] = ['轻度', '中度', '重度']
export const DEFECT_STATES: DefectState[] = ['待处理', '已派工', '已修复']

/** 状态标签配色（Element Plus tag type + 自定义底色） */
export const DEFECT_STATE_COLOR: Record<DefectState, string> = {
  待处理: '#c0392b',
  已派工: '#d68910',
  已修复: '#1e8449'
}

export const DEFECT_STATE_BG: Record<DefectState, string> = {
  待处理: '#fdecea',
  已派工: '#fdf3e3',
  已修复: '#eaf6ee'
}

/** 缺陷标注台的组合筛选条件（存于 defectStore，供多个页面共用） */
export interface DefectFilterState {
  keyword: string
  /** 机组 id 多选 */
  turbines: string[]
  /** 缺陷类型多选 */
  types: DefectType[]
  /** 严重程度多选 */
  severities: Severity[]
  /** 检修面多选 */
  faces: SegmentFace[]
  /** 处置状态多选 */
  states: DefectState[]
  /** 仅看未闭环（state !== 已修复） */
  onlyOpen: boolean
}

export function createEmptyDefectFilter(): DefectFilterState {
  return {
    keyword: '',
    turbines: [],
    types: [],
    severities: [],
    faces: [],
    states: [],
    onlyOpen: false
  }
}

/** 缺陷尺寸文案：1200 × 35 mm */
export function formatDefectSize(lengthMm: number, widthMm: number): string {
  return `${lengthMm} × ${widthMm} mm`
}

/** 复检填报内容：在一条已修复缺陷上发起回访复检 */
export interface RecheckInput {
  defectId: string
  /** 复检日期 YYYY-MM-DD */
  recheckAt: string
  /** 复检位置米数（展向） */
  positionM: number
  /** 本次观测到的缺陷类型 */
  type: DefectType
  /** 本次等级（复发后以本次填报为准，不沿用旧等级） */
  severity: Severity
}

/** 复检结果：复发（命中同分段历史缺陷）或另存新缺陷 */
export type RecheckOutcome =
  | { kind: 'recurred'; defectId: string; recheckCount: number }
  | { kind: 'created'; defectId: string }

/** 一组缺陷的复检汇总：累计复检次数 + 最近复检日期（YYYY-MM-DD 可直接按字符串比较） */
export function recheckSummaryOf(defects: Array<Pick<Defect, 'recheckCount' | 'lastRecheckAt'>>): {
  recheckCount: number
  lastRecheckAt: string | null
} {
  let recheckCount = 0
  let lastRecheckAt: string | null = null
  defects.forEach((defect) => {
    recheckCount += defect.recheckCount ?? 0
    if (defect.lastRecheckAt && (lastRecheckAt === null || defect.lastRecheckAt > lastRecheckAt)) {
      lastRecheckAt = defect.lastRecheckAt
    }
  })
  return { recheckCount, lastRecheckAt }
}
