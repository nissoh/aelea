

export const fetchJson = async <T>(input: RequestInfo, init?: RequestInit): Promise<T> => (await fetch(input, init)).json()
