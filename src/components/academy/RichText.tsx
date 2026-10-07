import { Tag } from '@/components/ui/tag'
import type { Rich } from '../../data/lessonTypes'
import { TermDefinition } from './TermDefinition'

// Dibuja un texto enriquecido de lección (ver data/lessonTypes.ts).
export function RichText({ content }: { content: Rich }) {
  return (
    <>
      {content.map((segment, index) => {
        if (typeof segment === 'string') return segment
        if ('strong' in segment) return <strong key={index} className="font-bold text-text-primary">{segment.strong}</strong>
        if ('term' in segment) return <TermDefinition key={index} termId={segment.term}>{segment.label}</TermDefinition>
        return <Tag key={index} tone="spark" className="align-middle">{segment.tag}</Tag>
      })}
    </>
  )
}
