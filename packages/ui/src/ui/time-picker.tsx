'use client'

import { TimeField } from './time-field'
import React from 'react'
import { TimeValue } from 'react-aria'
import { TimeFieldStateOptions } from 'react-stately'

// _forwardedRef is not forwarded (historical behavior), but forwardRef's
// render fn MUST have arity 2 — React validates this in dev and logs an error
const TimePicker = React.forwardRef<
  HTMLDivElement,
  Omit<TimeFieldStateOptions<TimeValue>, 'locale'>
>((props, _forwardedRef) => {
  return <TimeField {...props} />
})

TimePicker.displayName = 'TimePicker'

export { TimePicker }
