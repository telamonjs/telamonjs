import defaultComponents from 'fumadocs-ui/mdx'
import { Callout } from 'fumadocs-ui/components/callout'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion'
import { Step, Steps } from 'fumadocs-ui/components/steps'
import { TypeTable } from 'fumadocs-ui/components/type-table'
import { PeerDeps, PkgVersion, VersionMatrix } from './version-components'
import { ComponentPreview } from '@/components/component-preview'
import * as previews from '@/components/previews'

// Function components only: mdx/types `MDXComponents` (what `<MDX components>` takes) rejects
// `ComponentClass`, so `ComponentType` no longer fits. Props stay `any` because each entry has its
// own incompatible props shape and a narrower type rejects every real component (see
// fumadocs-ui/mdx, Accordion, TypeTable, etc.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
type MDXComponents = Record<string, React.FC<any>>

export function useMDXComponents(
  components: MDXComponents = {}
): MDXComponents {
  return {
    ...defaultComponents,
    Callout,
    Tab,
    Tabs,
    Accordion,
    Accordions,
    Step,
    Steps,
    TypeTable,
    PkgVersion,
    VersionMatrix,
    PeerDeps,
    ComponentPreview,
    ...previews,
    ...components,
  }
}
