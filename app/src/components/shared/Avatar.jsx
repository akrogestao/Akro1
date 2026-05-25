import { cn } from '@/lib/utils'

const sizes = { sm: 'w-7 h-7 text-[10px]', md: 'w-8 h-8 text-xs', lg: 'w-10 h-10 text-sm', xl: 'w-12 h-12 text-base' }

export default function Avatar({ init, color, size = 'md', className }) {
  return (
    <div
      className={cn('rounded-full flex items-center justify-center font-bold text-white shrink-0', sizes[size], className)}
      style={{ background: color }}
    >
      {init}
    </div>
  )
}
