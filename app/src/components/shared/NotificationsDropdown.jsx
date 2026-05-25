import { motion } from 'framer-motion'
import { Check, BellOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const PRIORITY_CFG = {
  high:   { label: 'Urgente',     iconBg: 'bg-red-100',    iconColor: 'text-red-500',    labelColor: 'text-red-600'    },
  medium: { label: 'Atenção',     iconBg: 'bg-orange-100', iconColor: 'text-orange-500', labelColor: 'text-orange-600' },
  low:    { label: 'Informativo', iconBg: 'bg-blue-100',   iconColor: 'text-blue-500',   labelColor: 'text-blue-600'   },
}

export default function NotificationsDropdown({ notifications, unreadCount, markAsRead, markAllAsRead, onNav, onClose }) {
  const groups = ['high', 'medium', 'low'].map(priority => ({
    priority,
    cfg: PRIORITY_CFG[priority],
    items: notifications.filter(n => n.priority === priority),
  })).filter(g => g.items.length > 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-bold text-slate-900">Notificações</p>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="text-xs text-orange-500 hover:text-orange-600 font-semibold transition-colors"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Body */}
      <div className="max-h-[480px] overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <BellOff className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium text-slate-500">Tudo em dia</p>
            <p className="text-xs mt-1">Nenhuma notificação pendente</p>
          </div>
        ) : (
          groups.map(({ priority, cfg, items }) => (
            <div key={priority}>
              {/* Group label */}
              <div className="px-4 py-1.5 bg-slate-50/80 border-b border-slate-100">
                <span className={cn('text-[10px] font-bold uppercase tracking-widest', cfg.labelColor)}>
                  {cfg.label}
                </span>
              </div>

              {/* Notifications */}
              {items.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 border-b border-slate-100 last:border-0 transition-colors',
                    n.read ? 'bg-slate-50/60 opacity-60' : 'hover:bg-slate-50/40'
                  )}
                >
                  {/* Icon */}
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', cfg.iconBg)}>
                    <n.Icon className={cn('w-4 h-4', cfg.iconColor)} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.description}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0 mt-0.5">
                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        title="Marcar como lida"
                        className="w-6 h-6 rounded-full flex items-center justify-center text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => { onNav?.(n.navTo); onClose() }}
                      className="text-[10px] font-semibold text-orange-500 hover:text-orange-600 px-2 py-1 rounded-lg hover:bg-orange-50 transition-colors whitespace-nowrap"
                    >
                      Ver →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/40">
        <p className="text-[10px] text-slate-400">Atualizado agora</p>
      </div>
    </motion.div>
  )
}
