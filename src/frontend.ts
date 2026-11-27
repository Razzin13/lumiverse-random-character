export function setup(ctx: any) {
  // Let the backend capture the active userId for operator-scoped installs
  ctx.sendToBackend({ type: 'hello' })

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
  }
}
