import { describe, expect, it } from 'vitest'
import {
  chipText,
  dateFromIso,
  dependentsOf,
  filterApiKey,
  filterParams,
  isoFromDate,
  paramsOnChange,
  paramsOnClear,
  paramsOnRemove,
  parentValue,
  readUrlFilters,
  type ActiveUrlFilter,
  type ChipTextDeps,
  type UrlFilterDef,
} from './url-filters'
import { msg } from '../i18n/msg'

const load = async () => []
const STATUS: UrlFilterDef = {
  kind: 'options',
  param: 'status',
  label: 'Status',
  options: [
    { value: 'OPEN', label: 'Open' },
    { value: 'CLOSED', label: 'Closed' },
  ],
}
const VIEW: UrlFilterDef = {
  kind: 'options',
  param: 'vis',
  apiKey: 'view',
  label: 'View',
  defaultValue: 'open',
  noDefaultValue: 'all',
  options: [
    { value: 'open', label: 'Open ones' },
    { value: 'all', label: 'All' },
  ],
}
const STATE: UrlFilterDef = { kind: 'options', param: 'state', label: 'State', load, queryKey: ['states'] }
const CITY: UrlFilterDef = {
  kind: 'options',
  param: 'city',
  apiKey: 'cityId',
  label: 'City',
  load,
  queryKey: ['cities'],
  dependsOn: 'state',
}
const PERIOD: UrlFilterDef = { kind: 'dateRange', param: 'period', label: 'Period' }
const DUE: UrlFilterDef = {
  kind: 'dateRange',
  param: 'due',
  label: 'Due',
  fromParam: 'dueDe',
  toParam: 'dueAte',
  apiFrom: 'dueFrom',
  apiTo: 'dueTo',
}
const NUMBER: UrlFilterDef = { kind: 'text', param: 'num', apiKey: 'number', label: 'Number' }
const DEFS = [STATUS, VIEW, STATE, CITY, PERIOD, DUE, NUMBER]

const PROJECT: UrlFilterDef = { kind: 'options', param: 'projectId', label: 'Project', load, queryKey: ['p'] }
const GOAL: UrlFilterDef = { kind: 'options', param: 'goal', label: 'Goal', load, queryKey: ['g'], dependsOn: 'projectId' }
const PLAN: UrlFilterDef[] = [
  PROJECT,
  GOAL,
  { kind: 'options', param: 'step', label: 'Step', load, queryKey: ['s'], dependsOn: 'goal' },
  { kind: 'options', param: 'indicator', label: 'Indicator', load, queryKey: ['i'], dependsOn: 'step' },
  { kind: 'options', param: 'family', label: 'Family', load, queryKey: ['f'], dependsOn: 'projectId' },
]

const read = (q: Record<string, string>) => readUrlFilters(DEFS, p => q[p] ?? null)

describe('readUrlFilters', () => {
  it('with an empty URL only the default applies (and is active, so it shows as a chip)', () => {
    const { values, active } = read({})
    expect(values).toEqual({ view: 'open' })
    expect(active.map(a => a.def.param)).toEqual(['vis'])
  })

  it('a range with only the end goes to the `To` API key', () => {
    expect(read({ periodTo: '2026-03-01' }).values).toEqual({ view: 'open', periodTo: '2026-03-01' })
  })

  it('a local option outside the list and a malformed date are ignored', () => {
    expect(read({ status: 'HACK', periodFrom: '01/02/2026' }).values).toEqual({ view: 'open' })
  })

  it('a remote value is kept as is (its label is resolved later)', () => {
    expect(read({ state: 'anything' }).values).toEqual({ view: 'open', state: 'anything' })
  })

  it('reads every kind and sends it under its apiKey', () => {
    const { values, active } = read({
      status: 'OPEN',
      vis: 'all',
      state: 'RN',
      city: 'c1',
      periodFrom: '2026-02-01',
      dueAte: '2026-03-10',
      num: ' 12 ',
    })
    expect(values).toEqual({
      status: 'OPEN',
      view: 'all',
      state: 'RN',
      cityId: 'c1',
      periodFrom: '2026-02-01',
      dueTo: '2026-03-10',
      number: '12',
    })
    expect(active).toHaveLength(7)
    expect(active.find(a => a.def === PERIOD)).toEqual({ def: PERIOD, value: '2026-02-01', to: '' })
  })

  it('the default value in the URL counts as the default', () => {
    expect(read({ vis: 'open' }).values).toEqual({ view: 'open' })
  })

  it('unique params: a list does not see the param of another list', () => {
    expect(readUrlFilters([STATUS], p => ({ otherStatus: 'OPEN' })[p] ?? null).values).toEqual({})
  })
})

describe('chipText', () => {
  const deps = (over: Partial<ChipTextDeps> = {}): ChipTextDeps => ({
    label: 'L',
    text: v => (typeof v === 'string' ? v : `t:${v.key}`),
    formatDate: iso => iso.split('-').reverse().join('/'),
    since: d => `since ${d}`,
    until: d => `until ${d}`,
    ...over,
  })
  const chip = (a: ActiveUrlFilter, over?: Partial<ChipTextDeps>) => chipText(a, deps(over))

  it('builds the text of each kind', () => {
    expect(chip({ def: STATUS, value: 'OPEN' }, { label: 'Status' })).toBe('Status: Open')
    expect(chip({ def: STATUS, value: 'OTHER' }, { label: 'Status' })).toBe('Status: OTHER')
    expect(chip({ def: STATE, value: 'RN' }, { label: 'State', remoteLabel: 'Rio Grande do Norte' })).toBe(
      'State: Rio Grande do Norte'
    )
    expect(chip({ def: STATE, value: 'RN' }, { label: 'State' })).toBe('State: …')
    expect(chip({ def: PERIOD, value: '2026-02-01', to: '2026-02-10' }, { label: 'Period' })).toBe(
      'Period: 01/02/2026 – 10/02/2026'
    )
    expect(chip({ def: PERIOD, value: '2026-02-01', to: '' }, { label: 'Period' })).toBe('Period: since 01/02/2026')
    expect(chip({ def: PERIOD, value: '', to: '2026-02-10' }, { label: 'Period' })).toBe('Period: until 10/02/2026')
    expect(chip({ def: NUMBER, value: '12' }, { label: 'Number' })).toBe('Number: 12')
  })

  it('resolves an I18nText option label', () => {
    const def: UrlFilterDef = { ...STATUS, options: [{ value: 'OPEN', label: msg('app.open') }] }
    expect(chip({ def, value: 'OPEN' })).toBe('L: t:app.open')
  })
})

describe('what to write', () => {
  it('empty and the default itself remove the param', () => {
    expect(paramsOnChange(DEFS, STATUS, 'CLOSED')).toEqual({ status: 'CLOSED' })
    expect(paramsOnChange(DEFS, STATUS, '')).toEqual({ status: null })
    expect(paramsOnChange(DEFS, VIEW, 'open')).toEqual({ vis: null })
    expect(paramsOnChange(DEFS, NUMBER, '  ')).toEqual({ num: null })
  })

  it('changing the state clears the city', () => {
    expect(paramsOnChange(DEFS, STATE, 'PB')).toEqual({ city: null, state: 'PB' })
  })

  it('cascade: changing or removing the project clears goal, step and indicator; the goal clears only those below', () => {
    expect(paramsOnChange(PLAN, PROJECT, 'p2')).toEqual({
      goal: null,
      step: null,
      indicator: null,
      family: null,
      projectId: 'p2',
    })
    expect(paramsOnRemove(PLAN, { def: PROJECT, value: 'p1' })).toEqual({
      goal: null,
      step: null,
      indicator: null,
      family: null,
      projectId: null,
    })
    expect(paramsOnChange(PLAN, GOAL, 'm2')).toEqual({ step: null, indicator: null, goal: 'm2' })
    expect(dependentsOf(PLAN, 'indicator')).toEqual([])
  })

  it('parent value: the panel one, else the one the scope fixes; no parent is null', () => {
    const active = [{ def: PROJECT, value: 'p1' }]
    expect(parentValue(GOAL, active)).toBe('p1')
    expect(parentValue(GOAL, [], { projectId: 'p9' })).toBe('p9')
    expect(parentValue(GOAL, active, { projectId: 'p9' })).toBe('p1')
    expect(parentValue(GOAL, [], { projectId: '' })).toBeNull()
    expect(parentValue(GOAL, [], { projectId: 7 })).toBeNull()
    expect(parentValue(GOAL, [])).toBeNull()
    expect(parentValue(PROJECT, active)).toBeNull()
    expect(parentValue(PERIOD, active)).toBeNull()
  })

  it('a date range writes both params, under custom URL keys too', () => {
    expect(paramsOnChange(DEFS, PERIOD, '2026-01-01', null)).toEqual({ periodFrom: '2026-01-01', periodTo: null })
    expect(paramsOnChange(DEFS, PERIOD, null)).toEqual({ periodFrom: null, periodTo: null })
    expect(paramsOnChange(DEFS, DUE, null, '2026-01-02')).toEqual({ dueDe: null, dueAte: '2026-01-02' })
  })

  it('removing the default chip writes noDefaultValue; anything else leaves', () => {
    expect(paramsOnRemove(DEFS, { def: VIEW, value: 'open' })).toEqual({ vis: 'all' })
    expect(paramsOnRemove(DEFS, { def: VIEW, value: 'all' })).toEqual({ vis: null })
    const noAlternative: UrlFilterDef = { ...VIEW, noDefaultValue: undefined }
    expect(paramsOnRemove(DEFS, { def: noAlternative, value: 'open' })).toEqual({ vis: null })
    expect(paramsOnRemove(DEFS, { def: PERIOD, value: '2026-01-01' })).toEqual({ periodFrom: null, periodTo: null })
  })

  it('clear resets every param at once', () => {
    expect(paramsOnClear([STATUS, PERIOD, DUE])).toEqual({
      status: null,
      periodFrom: null,
      periodTo: null,
      dueDe: null,
      dueAte: null,
    })
    expect(filterParams(NUMBER)).toEqual(['num'])
    expect(filterApiKey(STATE)).toBe('state')
    expect(filterApiKey(CITY)).toBe('cityId')
  })
})

describe('dates', () => {
  it('round-trips between a local Date and YYYY-MM-DD', () => {
    expect(isoFromDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05')
    expect(isoFromDate(undefined)).toBeNull()
    expect(dateFromIso('2026-01-05')?.getDate()).toBe(5)
    expect(dateFromIso(undefined)).toBeUndefined()
  })
})
