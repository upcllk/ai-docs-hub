/** 锚点：描述选中的文字在文档中的位置 */
export interface Anchor {
  /** 文档标识，对应 docs/ 下的 HTML 文件名（不含扩展名），如 "sample-prd" */
  docId: string
  /** 文档版本，对应 Git Tag，如 "v1.0" */
  version: string
  /** 用户选中的原始文本，用于高亮渲染时的文本匹配 */
  selectedText: string
  /** 选中文字前 50 个字符，辅助定位，防止重复文本冲突 */
  contextBefore: string
  /** 选中文字后 50 个字符 */
  contextAfter: string
}

/** 一条回复 */
export interface Reply {
  id: string
  comment: string
  author: string
  createdAt: string
}

/** 一条标注（含锚点 + 评论内容 + 元数据） */
export interface Annotation {
  /** Provider 返回的唯一 ID */
  id: string
  anchor: Anchor
  comment: string
  author: string
  createdAt: string
  replies: Reply[]
}

/** 创建标注时传入的附加元数据 */
export interface AnnotationMeta {
  author: string
}
