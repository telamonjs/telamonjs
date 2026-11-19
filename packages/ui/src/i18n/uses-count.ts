/** True when a raw ICU message references `{count}` (it renders the number itself). */
export const usesCount = (raw: unknown) => typeof raw === 'string' && /\{\s*count\b/.test(raw)
