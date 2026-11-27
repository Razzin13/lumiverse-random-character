declare const spindle: any

interface CommandContext {
  route: string
  chatId?: string
  characterId?: string
  isGroupChat?: boolean
}

spindle.commands.register([
  {
    id: 'random-character-latest',
    label: 'Random Character (Continue or Start)',
    description: 'Open the latest chat with a random character, or start a new one.',
    keywords: ['random', 'character', 'pick', 'shuffle', 'roulette'],
    scope: 'global',
  },
  {
    id: 'random-character-new',
    label: 'Random Character (New Chat)',
    description: 'Start a brand new chat with a random character.',
    keywords: ['random', 'character', 'new', 'fresh', 'shuffle'],
    scope: 'global',
  },
])

async function pickRandomCharacter(excludeId?: string) {
  const firstPage = await spindle.characters.list({ limit: 200, offset: 0 })
  const total: number = firstPage?.total ?? firstPage?.data?.length ?? 0

  if (total === 0) return null

  let pool: any[] = firstPage?.data ?? []

  // If you have more than 200 characters, pick a random offset across the full total
  if (total > pool.length) {
    const offset = Math.floor(Math.random() * total)
    const page = await spindle.characters.list({ limit: 1, offset })
    return page?.data?.[0] ?? pool[0] ?? null
  }

  if (excludeId && pool.length > 1) {
    pool = pool.filter((c) => c.id !== excludeId)
  }

  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

spindle.commands.onInvoked(async (commandId: string, context: CommandContext) => {
  if (commandId !== 'random-character-latest' && commandId !== 'random-character-new') {
    return
  }

  if (!spindle.permissions.has('characters')) {
    spindle.toast.warning('Grant the "characters" permission in Extensions settings first.')
    return
  }

  try {
    const chosen = await pickRandomCharacter(context?.characterId)
    if (!chosen) {
      spindle.toast.info('No characters found in your library.')
      return
    }

    const mode = commandId === 'random-character-new' ? 'new' : 'latest'

    spindle.sendToFrontend({
      type: 'open_random_character',
      characterId: chosen.id,
      characterName: chosen.name,
      mode,
    })
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    spindle.log.error(`Random Character failed: ${msg}`)
    spindle.toast.error(`Pick failed: ${msg}`, { duration: 10000 })
  }
})

spindle.onFrontendMessage((payload: any) => {
  if (payload?.type === 'random_character_opened') {
    spindle.toast.success(`Picked ${payload.characterName}!`)
  } else if (payload?.type === 'random_character_error') {
    spindle.toast.error(`Open failed: ${payload.message || 'Unknown error'}`, { duration: 10000 })
  }
})

spindle.log.info('Random Character extension loaded.')
