import React, { createContext, useContext, useMemo, useRef, useCallback, useState } from 'react'
import { supabaseClient } from '../lib/supabaseClient';

type Feasibility = { label?: 'good'|'tight'; suggestion?: string }
export type CreateDraft = {
  dreamId?: string
  title: string
  start_date?: string | null
  end_date?: string | null
  baseline?: string
  obstacles?: string
  enjoyment?: string
  image_url?: string | null
  feasibility?: Feasibility
}

type Ctx = CreateDraft & {
  setField: <K extends keyof CreateDraft>(k: K, v: CreateDraft[K]) => void
  ensureDraft: () => Promise<void>
}

const C = createContext<Ctx | null>(null)
export function useCreateDream() {
  const ctx = useContext(C)
  if (!ctx) throw new Error('CreateDreamProvider missing')
  return ctx
}

export const CreateDreamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CreateDraft>({ title: '' })
  const debounce = useRef<NodeJS.Timeout | undefined>(undefined)

  const setField = useCallback(<K extends keyof CreateDraft>(k: K, v: CreateDraft[K]) => {
    setState(s => ({ ...s, [k]: v }))
    clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      if (!state.dreamId) return
      await supabaseClient.from('dreams').update({
        title: k==='title'? String(v): state.title,
        start_date: k==='start_date'? v: state.start_date,
        end_date: k==='end_date'? v: state.end_date,
        image_url: k==='image_url'? String(v): state.image_url,
      }).eq('id', state.dreamId)
    }, 600)
  }, [state])

  const ensureDraft = useCallback(async () => {
    if (state.dreamId || !state.title?.trim()) return
    const user = (await supabaseClient.auth.getUser()).data.user
    if (!user) return
    const { data, error } = await supabaseClient.from('dreams').insert({
      user_id: user.id, title: state.title, start_date: state.start_date, end_date: state.end_date, activated_at: null
    }).select('id').single()
    if (!error && data?.id) setState(s => ({ ...s, dreamId: data.id }))
  }, [state])

  const value = useMemo(() => ({ ...state, setField, ensureDraft }), [state, setField, ensureDraft])
  return <C.Provider value={value}>{children}</C.Provider>
}


