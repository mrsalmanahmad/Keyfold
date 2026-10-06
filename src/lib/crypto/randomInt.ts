/**
 * A uniformly distributed random integer in [0, exclusiveMax) via rejection sampling —
 * `crypto.getRandomValues() % n` is biased whenever n doesn't evenly divide 256, which
 * matters here since generated passwords/passphrases are exactly the kind of output
 * where a subtly skewed distribution weakens the thing you're generating.
 */
export function randomInt(exclusiveMax: number): number {
  if (!Number.isInteger(exclusiveMax) || exclusiveMax <= 0 || exclusiveMax > 256) {
    throw new Error('randomInt supports exclusiveMax in (0, 256]')
  }
  const range = 256 - (256 % exclusiveMax)
  const bytes = new Uint8Array(1)
  let value: number
  do {
    crypto.getRandomValues(bytes)
    value = bytes[0]
  } while (value >= range)
  return value % exclusiveMax
}
