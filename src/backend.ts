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
  const probe = await spindle.characters.list({ limit: 1, offset: 0 })
  const total: number = probe?.total ?? 0

  if (total === 0) return null

  let offset = Math.floor(Math.random() * total)
  let page = await spindle.characters.list({ limit: 1, offset })
  let chosen = page?.data?.[0] ?? null

  // If we landed on the currently open character and there are others, re-roll once
  if (chosen && excludeId && chosen.id === excludeId && total > 1) {
    offset = (offset + 1 + Math.floor(Math.random() * (total - 1))) % total
    page = await spindle.characters.list({ limit: 1, offset })
    chosen = page?.data?.[0] ?? chosen
  }

  return chosen
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
    spindle.log.error(`Random Character failed: ${err?.message ?? err}`)
    spindle.toast.error('Failed to pick a random character.')
  }
})

spindle.onFrontendMessage((payload: any) => {
  if (payload?.type === 'random_character_opened') {
    spindle.toast.success(`Picked ${payload.characterName}!`)
  } else if (payload?.type === 'random_character_error') {
    spindle.toast.error(payload.message || 'Could not open character chat.')
  }
})

spindle.log.info('Random Character extension loaded.')