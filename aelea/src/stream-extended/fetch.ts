export async function fetchJson<T>(
  input: RequestInfo,
  init: RequestInit = {},
  config: { parseJson?: (a: unknown) => T } = {}
): Promise<T> {
  const response = await fetch(input, init)

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const { parseJson = x => x as T } = config
  const json = await response.json()

  return parseJson(json)
}
