import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth.jsx'

const BandContext = createContext(null)

export function BandProvider({ children }) {
  const { user } = useAuth()
  const [bands, setBands] = useState([])
  const [activeBand, setActiveBand] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const initRan = useRef(false)

  useEffect(() => {
    if (!user || initRan.current) return
    initRan.current = true
    async function init() {
      setIsLoading(true)

      // Collaborator direct login: load their band by id from localStorage
      let collabSession = null
      try { collabSession = JSON.parse(localStorage.getItem('bm_collab_session') || 'null') } catch {}
      if (collabSession?.band_id) {
        const { data: bandRow } = await supabase.from('bands').select('*').eq('id', collabSession.band_id).single()
        if (bandRow) {
          setBands([bandRow])
          localStorage.setItem('bm_active_band_id', bandRow.id)
          setActiveBand(bandRow)
          setIsLoading(false)
          return
        }
      }

      const { data: rows } = await supabase
        .from('bands')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at')

      let bandList = rows || []

      if (bandList.length === 0) {
        const creationKey = `bm_band_created_${user.id}`
        const alreadyCreated = localStorage.getItem(creationKey)
        const { data: check } = await supabase
          .from('bands')
          .select('id')
          .eq('user_id', user.id)

        if (!alreadyCreated && (!check || check.length === 0)) {
          const name = user.user_metadata?.nomeDaBanda || 'Minha Banda'
          const plan = user.user_metadata?.plano || 'profissional'
          const trial_ends_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
          const { data: newBand } = await supabase
            .from('bands')
            .insert({ user_id: user.id, name, plan, trial_ends_at })
            .select()
            .single()
          if (newBand) {
            bandList = [newBand]
            localStorage.setItem(creationKey, 'true')
          }
        } else if (check && check.length > 0) {
          const { data: refetch } = await supabase
            .from('bands')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at')
          bandList = refetch || []
        }
      }

      // For solo/profissional, always use only the first band regardless of how many exist
      const firstBand = bandList[0] || null
      const isMultiBand = firstBand?.plan === 'multi_bandas'
      const effectiveList = isMultiBand ? bandList : (firstBand ? [firstBand] : [])
      setBands(effectiveList)

      const savedId = localStorage.getItem('bm_active_band_id')
      const found = isMultiBand && savedId ? effectiveList.find(b => b.id === savedId) : null
      setActiveBand(found || firstBand)
      setIsLoading(false)
    }
    init()
  }, [user])

  const switchBand = useCallback((bandId) => {
    const b = bands.find(b => b.id === bandId)
    if (!b) return
    localStorage.setItem('bm_active_band_id', b.id)
    setActiveBand(b)
  }, [bands])

  const addBand = useCallback(async (name) => {
    if (!user) return null
    const maxBands = activeBand?.plan === 'multi_bandas' ? 5 : 1
    if (bands.length >= maxBands) return null
    const trial_ends_at = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: newBand, error } = await supabase
      .from('bands')
      .insert({ user_id: user.id, name, plan: activeBand?.plan || 'profissional', trial_ends_at })
      .select()
      .single()
    if (error || !newBand) return null
    setBands(prev => [...prev, newBand])
    localStorage.setItem('bm_active_band_id', newBand.id)
    setActiveBand(newBand)
    return newBand
  }, [user, bands, activeBand])

  const updateBand = useCallback(async (id, updates) => {
    const { data: updated } = await supabase
      .from('bands')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (updated) {
      setBands(prev => prev.map(b => b.id === id ? updated : b))
      setActiveBand(prev => prev?.id === id ? updated : prev)
    }
  }, [])

  const deleteBand = useCallback(async (bandId) => {
    if (bands.length <= 1) return false
    const { error } = await supabase.from('bands').delete().eq('id', bandId)
    if (error) return false
    const remaining = bands.filter(b => b.id !== bandId)
    setBands(remaining)
    if (activeBand?.id === bandId) {
      const next = remaining[0]
      localStorage.setItem('bm_active_band_id', next.id)
      setActiveBand(next)
    }
    return true
  }, [bands, activeBand])

  const canAddBand = bands.some(b => b.plan === 'multi_bandas')

  return (
    <BandContext.Provider value={{ bands, activeBand, isLoading, switchBand, addBand, updateBand, deleteBand, canAddBand }}>
      {children}
    </BandContext.Provider>
  )
}

export const useBand = () => useContext(BandContext)
