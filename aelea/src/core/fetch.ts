export async function fetchJson<T>(
  input: RequestInfo,
  init: RequestInit & { parseJson?: (a: T) => T } = {}
): Promise<T> {
  const fetchResponse = await fetch(input, init)
  const { parseJson = x => x } = init
  const json = parseJson(await fetchResponse.json())
  return json
}
