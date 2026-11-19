'use client'

import * as React from 'react'

/**
 * True inside Dialog/Sheet content. Popover reads it to default to `modal`:
 * a modal's scroll lock (react-remove-scroll) drops touch/scroll events that land
 * on body-portalled content, but a modal Popover mounts its own lock around its
 * content (the innermost lock wins), so the list can be scrolled by touch while
 * the content stays portalled to body (no clipping by the dialog).
 */
const ModalContext = React.createContext(false)

export { ModalContext }
