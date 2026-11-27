declare const spindle: any

interface CommandContext {
  route: string
  chatId?: string
  characterId?: string
  isGroupChat?: boolean
  userId?: string
}

let lastKnownUserId: string | undefined

function extractUserId(val: any): string | undefined {
  if (typeof val === 'string' && val.length > 0) return val
  if (val && typeof val === 'object' && typeof val.userId === 'string') return val.userId
  return undefined
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

async function pickRandomCharacter(userId?: string, excludeId?: string) {
  const baseOpts: any = { limit: 200, offset: 0 }
  if (userId) baseOpts.userId = userId

  const firstPage = await spindle.characters.list(baseOpts)
  const total: number = firstPage?.total ?? firstPage?.data?.length ?? 0

  if (total === 0) return null

  let pool: any[] = firstPage?.data ?? []

  if (total > pool.length) {
    const offset = Math.floor(Math.random() * total)
    const pageOpts: any = { limit: 1, offset }
    if (userId) pageOpts.userId = userId
    const page = await spindle.characters.list(pageOpts)
    return page?.data?.[0] ?? pool[0] ?? null
  }

  if (excludeId && pool.length > 1) {
    pool = pool.filter((c) => c.id !== excludeId)
  }

  return pool[Math.floor(Math.random() * pool.length)] ?? null
}

async function runRandomPick(mode: 'latest' | 'new', userId?: string, excludeId?: string) {
  if (!spindle.permissions.has('characters')) {
    spindle.toast.warning(
      'Grant the "characters" permission in Extensions settings first.',
      userId ? { userId } : undefined
    )
    return
  }

  try {
    const chosen = await pickRandomCharacter(userId, excludeId)
    if (!chosen) {
      spindle.toast.info('No characters found in your library.', userId ? { userId } : undefined)
      return
    }

    spindle.sendToFrontend(
      {
        type: 'open_random_character',
        characterId: chosen.id,
        characterName: chosen.name,
        mode,
      },
      userId
    )
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    spindle.log.error(`Random Character failed: ${msg}`)
    spindle.toast.error(`Pick failed: ${msg}`, { duration: 10000, ...(userId ? { userId } : {}) })
  }
}

spindle.commands.onInvoked(async (commandId: string, context: CommandContext, arg3?: any) => {
  if (commandId !== 'random-character-latest' && commandId !== 'random-character-new') {
    return
  }

  const userId =
    extractUserId(arg3) ||
    extractUserId(context?.userId) ||
    extractUserId(lastKnownUserId)

  const mode = commandId === 'random-character-new' ? 'new' : 'latest'
  await runRandomPick(mode, userId, context?.characterId)
})

spindle.onFrontendMessage(async (payload: any, userId?: any) => {
  const uid = extractUserId(userId)
  if (uid) lastKnownUserId = uid

  if (payload?.type === 'roll_random_character') {
    const mode = payload.mode === 'new' ? 'new' : 'latest'
    await runRandomPick(mode, uid || lastKnownUserId)
    return
  }

  if (payload?.type === 'random_character_opened') {
    spindle.toast.success(`Picked ${payload.characterName}!`, uid ? { userId: uid } : undefined)
  } else if (payload?.type === 'random_character_error') {
    spindle.toast.error(`Open failed: ${payload.message || 'Unknown error'}`, {
      duration: 10000,
      ...(uid ? { userId: uid } : {}),
    })
  }
})

spindle.log.info('Random Character extension loaded.')
