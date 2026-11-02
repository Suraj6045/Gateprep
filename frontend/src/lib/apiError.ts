export function getApiErrorDetail(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined
  const response = error.response
  if (!response || typeof response !== 'object' || !('data' in response)) return undefined
  const data = response.data
  if (!data || typeof data !== 'object' || !('detail' in data)) return undefined
  return typeof data.detail === 'string' && data.detail ? data.detail : undefined
}
