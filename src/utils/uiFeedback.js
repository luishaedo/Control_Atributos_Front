export function buildActionableError({ what, why, how }) {
  const parts = [what, why ? `Motivo: ${why}.` : '', how ? `Cómo resolverlo: ${how}.` : '']
    .filter(Boolean)
  return parts.join(' ')
}
