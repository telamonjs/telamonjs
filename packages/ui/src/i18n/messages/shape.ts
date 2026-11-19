/** Same keys as T, every leaf a string — en/es completeness against pt-BR is checked at compile time. */
export type MessagesShape<T> = { [K in keyof T]: T[K] extends string ? string : MessagesShape<T[K]> }
