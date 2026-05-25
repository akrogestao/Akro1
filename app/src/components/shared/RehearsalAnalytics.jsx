import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function ProgBar({ pct }) {
  const color = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

function MemberFrequencyBlock({ stats }) {
  if (stats.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">Nenhum dado ainda</p>
  }
  return (
    <div className="space-y-3">
      {stats.map(({ member, expected, attended, pct }) => (
        <div key={member.id} className="flex items-center gap-3">
          <div
            style={{ backgroundColor: member.color }}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
          >
            {member.init}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-1 gap-1">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{member.name}</span>
              <span className="text-[11px] text-slate-400 shrink-0">{attended}/{expected}</span>
            </div>
            <ProgBar pct={pct} />
          </div>
          <span className={cn(
            'text-xs font-bold shrink-0 w-10 text-right',
            pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-500' : 'text-red-500'
          )}>
            {pct}%
          </span>
        </div>
      ))}
    </div>
  )
}

function SongListBlock({ songs: list, warning }) {
  if (list.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-6">Nenhuma música ensaiada ainda</p>
  }
  return (
    <div className="space-y-1">
      {list.map((s, i) => (
        <div key={s.id} className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
          <span className="text-[11px] text-slate-400 w-4 text-right shrink-0">{i + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{s.title}</p>
            <p className="text-xs text-slate-400 truncate">{s.artist || '—'}</p>
          </div>
          <Badge
            variant={warning ? 'warning' : 'secondary'}
            className="shrink-0 text-[11px]"
          >
            {s.rehearsalCount ?? 0}×
          </Badge>
        </div>
      ))}
    </div>
  )
}

export default function RehearsalAnalytics({ memberAttendanceStats, topSongs, underPracticed }) {
  const hasData = memberAttendanceStats.length > 0 || topSongs.length > 0
  if (!hasData) return null

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Análises</p>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
            Frequência por membro
          </p>
          <MemberFrequencyBlock stats={memberAttendanceStats} />
        </Card>
        <Card className="rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
            Músicas mais ensaiadas
          </p>
          <SongListBlock songs={topSongs} />
        </Card>
        <Card className="rounded-2xl p-4 sm:p-5">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
            Músicas menos praticadas
          </p>
          <SongListBlock songs={underPracticed} warning />
        </Card>
      </div>
    </div>
  )
}
