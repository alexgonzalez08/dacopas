'use client'
import { useEffect } from 'react'
import { useUnsavedChanges } from '@/lib/unsaved-changes-context'

export default function UnsavedChangesGuard({ isDirty, id }: { isDirty: boolean; id: string }) {
  const { setDirty, navigate, isDirty: anyDirty } = useUnsavedChanges()

  useEffect(() => {
    setDirty(id, isDirty)
    return () => setDirty(id, false)
  }, [isDirty, id, setDirty])

  useEffect(() => {
    if (!anyDirty) return
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:')) return
      e.preventDefault()
      e.stopPropagation()
      navigate(href)
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [anyDirty, navigate])

  return null
}
