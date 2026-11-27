const DICE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/></svg>`

export function setup(ctx: any) {
  ctx.sendToBackend({ type: 'hello' })

  const tab = ctx.ui?.registerDrawerTab?.({
    id: 'random-character',
    title: 'Random Character',
    shortName: 'Random',
    description: 'Pick a random character from your library',
    keywords: ['random', 'character', 'shuffle', 'roulette'],
    iconSvg: DICE_SVG,
  })

  if (tab?.root) {
    const wrap = document.createElement('div')
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;padding:16px;'

    const heading = document.createElement('div')
    heading.textContent = 'Feeling indecisive?'
    heading.style.cssText = 'font-weight:600;font-size:14px;opacity:0.9;'

    const makeBtn = (label: string, mode: 'latest' | 'new', primary: boolean) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.textContent = label
      btn.style.cssText = primary
        ? 'padding:10px 14px;border-radius:8px;border:none;cursor:pointer;font-weight:600;background:var(--lumiverse-accent, #6366f1);color:#fff;'
        : 'padding:10px 14px;border-radius:8px;border:1px solid var(--lumiverse-border, rgba(255,255,255,0.15));cursor:pointer;font-weight:500;background:transparent;color:inherit;'
      btn.addEventListener('click', () => {
        ctx.sendToBackend({ type: 'roll_random_character', mode })
      })
      return btn
    }

    wrap.appendChild(heading)
    wrap.appendChild(makeBtn('Roll Random (Continue / Start)', 'latest', true))
    wrap.appendChild(makeBtn('Roll Random (New Chat)', 'new', false))
    tab.root.appendChild(wrap)
  }

  const unsub = ctx.onBackendMessage(async (payload: any) => {
    if (payload?.type !== 'open_random_character') return

    const { characterId, characterName, mode } = payload
    const surfaces = ctx.host?.surfaces

    if (!surfaces) {
      ctx.sendToBackend({
        type: 'random_character_error',
        message: 'Host navigation API is not available on this Lumiverse version.',
      })
      return
    }

    try {
      const entityActions = surfaces.list(['entity_action']) ?? []
      const hasCharacterChat = entityActions.some((s: any) => s.id === 'character_chat')

      if (hasCharacterChat) {
        await surfaces.invoke(
          { kind: 'entity_action', id: 'character_chat' },
          { characterId, mode }
        )
      } else {
        await surfaces.invoke(
          { kind: 'route', id: '/characters/:id' },
          { id: characterId }
        )
      }

      ctx.sendToBackend({
        type: 'random_character_opened',
        characterName,
      })
    } catch (err: any) {
      ctx.sendToBackend({
        type: 'random_character_error',
        message: err?.message ?? 'Failed to open character chat. Check the "chats" permission.',
      })
    }
  })

  return () => {
    unsub()
    tab?.destroy?.()
  }
}
