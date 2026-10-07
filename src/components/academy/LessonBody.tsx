import { FlaskConical } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Tag } from '@/components/ui/tag'
import { cn } from '@/lib/utils'
import type { DefinitionItem, LessonBlock, LessonFigureId, LineStyle, PracticeAction } from '../../data/lessonTypes'
import { DrawdownFloorsChart } from './DrawdownFloorsChart'
import { LessonSteps, type LessonPracticeApi } from './LessonSteps'
import { RichText } from './RichText'

const BODY_TEXT = 'font-body text-[16px] leading-[1.7] text-text-muted lg:text-[17px] lg:leading-[1.75]'

function LessonFigure({ figure, caption }: { figure: LessonFigureId; caption: string }) {
  return (
    <figure className="mt-6">
      {figure === 'drawdown-floors' && <DrawdownFloorsChart />}
      <figcaption className="mt-2.5 font-body text-[12px] leading-relaxed text-text-faint sm:text-[13px]">{caption}</figcaption>
    </figure>
  )
}

const SWATCH: Record<LineStyle, string> = {
  solid: 'h-1 rounded-sm bg-steel',
  dashed: 'h-0 border-t-4 border-dashed border-spark',
  dotted: 'h-0 border-t-4 border-dotted border-text-muted',
}

function DefinitionList({ items }: { items: readonly DefinitionItem[] }) {
  return (
    <dl className="mt-5 border-b border-hairline">
      {items.map((item) => (
        <div key={item.title} className="flex items-start gap-3.5 border-t border-hairline py-4">
          {item.swatch && <i aria-hidden="true" className={cn('mt-[9px] inline-block w-[34px] shrink-0', SWATCH[item.swatch])} />}
          <div>
            <dt className="font-body text-[16px] font-bold text-text-primary sm:text-[17px]">{item.title}</dt>
            <dd className="mt-1.5 font-body text-[15px] leading-[1.65] text-text-muted sm:text-[16px]"><RichText content={item.content} /></dd>
          </div>
        </div>
      ))}
    </dl>
  )
}

function ActionButton({ action }: { action: PracticeAction }) {
  const variant = action.variant === 'secondary' ? 'outline' : 'default'
  if (action.soon) {
    return (
      <span className="inline-flex items-center gap-2">
        <Button type="button" variant={variant} disabled>{action.label}</Button>
        <Tag>Próximamente</Tag>
      </span>
    )
  }
  return (
    <Button asChild variant={variant}>
      {action.to.startsWith('#') ? <a href={action.to}>{action.label}</a> : <Link to={action.to}>{action.label}</Link>}
    </Button>
  )
}

export function PracticeBlock({ title, description, actions }: { title: string; description: string; actions?: readonly PracticeAction[] }) {
  return (
    <section aria-label="Práctica" className="mt-7 rounded-r-xl border border-l-4 border-hairline border-l-spark bg-panel px-[18px] py-4 sm:px-6 sm:py-5">
      <p className="flex items-center gap-2">
        <FlaskConical className="h-[15px] w-[15px] text-spark" aria-hidden="true" />
        <Tag tone="spark">Práctica</Tag>
      </p>
      <p className="mt-2.5 font-body text-[17px] font-bold text-text-primary sm:text-[18px]">{title}</p>
      <p className="mt-1.5 font-body text-[13px] leading-relaxed text-text-faint sm:text-[14px]">{description}</p>
      {actions && actions.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-3">
          {actions.map((action) => <ActionButton key={action.label} action={action} />)}
        </div>
      )}
    </section>
  )
}

function BlockView({ block, practice }: { block: LessonBlock; practice: LessonPracticeApi }) {
  switch (block.type) {
    case 'heading':
      return <h2 className="font-display mt-8 text-[20px] text-text-primary lg:text-[22px]">{block.text}</h2>
    case 'paragraph':
      return <p className={cn('mt-5', BODY_TEXT)}><RichText content={block.content} /></p>
    case 'callout':
      return (
        <div role="note" className="mt-5 rounded-[10px] border border-spark/40 bg-spark/10 px-4 py-3 font-body text-[13px] leading-[1.6] text-text-muted sm:px-[18px] sm:py-3.5 sm:text-[14px]">
          <RichText content={block.content} />
        </div>
      )
    case 'figure':
      return <LessonFigure figure={block.figure} caption={block.caption} />
    case 'definitions':
      return <DefinitionList items={block.items} />
    case 'steps':
      return <LessonSteps steps={block.steps} practice={practice} />
    case 'practice':
      return <PracticeBlock title={block.title} description={block.description} actions={block.actions} />
  }
}

export function LessonBody({ blocks, practice }: { blocks: readonly LessonBlock[]; practice: LessonPracticeApi }) {
  return (
    <>
      {blocks.map((block, index) => (
        <BlockView key={index} block={block} practice={practice} />
      ))}
    </>
  )
}
