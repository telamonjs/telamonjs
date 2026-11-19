import defaultComponents from 'fumadocs-ui/mdx'
import { Callout } from 'fumadocs-ui/components/callout'
import { Tab, Tabs } from 'fumadocs-ui/components/tabs'
import { Accordion, Accordions } from 'fumadocs-ui/components/accordion'
import { Step, Steps } from 'fumadocs-ui/components/steps'
import { TypeTable } from 'fumadocs-ui/components/type-table'
import { PeerDeps, PkgVersion, VersionMatrix } from './version-components'
import { ComponentPreview } from '@/components/component-preview'
import * as previews from '@/components/previews'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- MDX's own component-map type (mdx/types MDXComponents) is `Record<string, ComponentType<any>>`; each entry has its own incompatible props shape, so a narrower type rejects every real component (see fumadocs-ui/mdx, Accordion, TypeTable, etc.)
type MDXComponents = Record<string, React.ComponentType<any>>

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
