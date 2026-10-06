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
  /** 发现日期 YYYY-MM-DD */
  foundAt: string
  state: DefectState
  /** 累计复检次数：复检判为复发时加一；v3 前的历史记录为空 */
  reinspectCount?: number
  /** 最近一次复检日期 YYYY-MM-DD；未复检过为空 */
  lastReinspectAt?: string
  createdAt: number
  updatedAt: number
}

/** 复检入参：选择一条已修复缺陷作为复检对象，填写本次复检情况 */
export interface ReinspectionInput {
  /** 复检入口：被复检的已修复缺陷 id */
  defectId: string
  /** 复检日期 YYYY-MM-DD（复发时回写为缺陷发现日期） */
  reinspectAt: string
  /** 复检位置（米） */
  positionM: number
  /** 本次复检缺陷类型，默认与被复检缺陷一致；改型则按新缺陷另存 */
  type: DefectType
  /** 本次复检等级（复发后以本次填报为准，不沿用旧等级） */
  severity: Severity
}

/** 复检提交结果 */
export interface ReinspectionResult {
  /** true=匹配到同段同型的已修复缺陷，按复发回写；false=另存为一条新缺陷 */
  recurred: boolean
  /** 复发时为被回写的缺陷 id；另存时为新缺陷 id */
  defectId: string
  /** 实际命中的分段（位置可能改落在同叶片的其他分段上） */
  segmentId: string
  /** 命中的候选缺陷（复发时才有） */
  matchedDefect?: Defect
  /** 提交后该缺陷的累计复检次数（复发时为加一后的值） */
  reinspectCount: number
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

/** 累计复检次数（兼容 v3 前未补全该字段的历史记录） */
export function reinspectCountOf(defect: Defect): number {
  return typeof defect.reinspectCount === 'number' ? defect.reinspectCount : 0
}

/** 最近复检日期（未复检过返回空串） */
export function lastReinspectAtOf(defect: Defect): string {
  return defect.lastReinspectAt ?? ''
}

/** 缺陷尺寸文案：1200 × 35 mm */
export function formatDefectSize(lengthMm: number, widthMm: number): string {
  return `${lengthMm} × ${widthMm} mm`
}
