import type { OrderWorkbenchItem } from '../api/orderApi'

type Input = NonNullable<OrderWorkbenchItem['customization']>['inputs'][number]

export function getEtsyPurchasedDetails(variations: string | null | undefined, inputs: Input[]) {
  const options: Array<{ label: string; value: string }> = []
  const personalizations: string[] = []
  const originals = new Set<string>()
  const addOption = (label: string, value: string) => {
    if (
      !options.some(
        (option) => option.label.toLowerCase() === label.toLowerCase() && option.value === value,
      )
    ) {
      options.push({ label, value })
    }
  }
  const addPersonalization = (value: string) => {
    if (!personalizations.includes(value)) personalizations.push(value)
  }
  const raw = variations?.trim() || ''
  if (raw) originals.add(raw)
  const compact = (value: string) => value.replace(/[,\s]+/g, '')
  for (const input of inputs) {
    if (input.assetDownloadUrl || !input.value?.trim()) continue
    const value = input.value.trim()
    const label = input.label?.trim() || input.type
    originals.add(`${label}: ${value}`)
    if (raw && compact(value) === compact(raw)) continue
    if (/^personalization$/i.test(label)) addPersonalization(value)
    else if (input.type === 'OPTION') addOption(label, value)
  }
  // Parsed inputs are authoritative; never combine them with guesses from the raw report.
  if (!options.length && !personalizations.length) {
    // shortcut: legacy CSV is flat text; preserve the personalization tail without guessing boundaries.
    const personalization = /(?:^|,\s*)personalization\s*:\s*([\s\S]*)$/i.exec(raw)
    if (personalization?.[1].trim()) addPersonalization(personalization[1].trim())
    const optionText = personalization ? raw.slice(0, personalization.index) : raw
    const optionMatches = optionText
      .split(',')
      .map((part) => /^\s*(sizes?|border(?: colou?r)?|colou?r)\s*:\s*([^:]+?)\s*$/i.exec(part))
    if (optionMatches.every((match) => match !== null)) {
      for (const match of optionMatches) addOption(match![1], match![2])
    }
  }
  return { options, personalizations, originals: [...originals] }
}
