import type { Anchor, Annotation, AnnotationMeta } from './types'

/** 标注后端的统一接口，所有 Provider 实现必须满足此契约 */
export interface AnnotationProvider {
  /** 创建一条新标注，返回标注 ID */
  createAnnotation(anchor: Anchor, comment: string, meta: AnnotationMeta): Promise<string>

  /** 读取某文档某版本的所有标注 */
  listAnnotations(docId: string, version: string): Promise<Annotation[]>

  /** 对某条标注追加一条回复 */
  replyToAnnotation(annotationId: string, reply: string, meta: AnnotationMeta): Promise<void>

  /** 删除某条标注 */
  deleteAnnotation(annotationId: string, docId: string, version: string): Promise<void>
}
