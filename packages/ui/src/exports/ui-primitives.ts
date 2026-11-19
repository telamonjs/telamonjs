// ============================================================================
// BASE COMPONENTS
// ============================================================================
export { BaseCard } from '../components/base/BaseCard'
export type { BaseCardProps } from '../components/base/BaseCard'
export { DetailCardHeader } from '../components/base/DetailCardHeader'
export type { DetailCardHeaderProps } from '../components/base/DetailCardHeader'
export { LoadingSkeleton } from '../components/base/LoadingSkeleton'
export type { LoadingSkeletonProps } from '../components/base/LoadingSkeleton'
export { StatusBadge } from '../components/base/StatusBadge'
export type { StatusBadgeProps } from '../components/base/StatusBadge'

// ============================================================================
// CORE UI COMPONENTS
// ============================================================================
export { Button, buttonVariants } from '../ui/button'
export type { ButtonProps } from '../ui/button'
export { Badge } from '../ui/badge'
export { Input } from '../ui/input'
export { Label } from '../ui/label'
export { Textarea } from '../ui/textarea'
export { Checkbox } from '../ui/checkbox'
export { Switch } from '../ui/switch'
export { ScrollArea } from '../ui/scroll-area'
export { Separator } from '../ui/separator'
export { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
export { ContentTabs } from '../layouts/content-tabs'
export type {
  TabItem,
  ContentTabsVariant,
  ContentTabsProps,
} from '../layouts/content-tabs'

export type { PortalItem, ContentPortalProps } from '../layouts/content-portal'
export {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
export { Calendar } from '../ui/calendar'
export type { CalendarProps } from '../ui/calendar'
export { TimePicker as TimePickerUI } from '../ui/time-picker'
export { TimeField } from '../ui/time-field'
export { DateSegment } from '../ui/date-segment'
export { AspectRatio } from '../ui/aspect-ratio'
export { Slider } from '../ui/slider'
export { WheelSlider } from '../ui/wheel-slider'
export { Toggle, toggleVariants } from '../ui/toggle'
export { ToggleGroup, ToggleGroupItem } from '../ui/toggle-group'
export {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '../ui/input-otp'

// ============================================================================
// DIALOG & OVERLAY COMPONENTS
// ============================================================================
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog'
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
export {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '../ui/sheet'
export { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
export {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
export { HoverCard, HoverCardContent, HoverCardTrigger } from '../ui/hover-card'
export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../ui/dropdown-menu'

// ============================================================================
// FEEDBACK COMPONENTS
// ============================================================================
export { Alert, AlertDescription, AlertTitle } from '../ui/alert'
export { toast } from '../hooks/use-toast'
export { Toaster } from '../ui/toaster'
export { Toaster as Sonner } from '../ui/sonner'
export { Skeleton } from '../ui/skeleton'

// Page Skeletons (Compound Component + Presets)
export { PageSkeleton } from '../components/skeletons'

export {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '../ui/toast'

// ============================================================================
// NAVIGATION & LAYOUT COMPONENTS (UI primitives)
// ============================================================================
export {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion'
export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command'
export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../ui/card'
export {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '../ui/breadcrumb'
export {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '../ui/carousel'
export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
} from '../ui/chart'
export {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '../ui/collapsible'
export {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '../ui/resizable'

// ============================================================================
// ADDITIONAL UI COMPONENTS
// ============================================================================
export { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar'
export { RadioGroup, RadioGroupItem } from '../ui/radio-group'
export { Progress } from '../ui/progress'
export { ScrollBar } from '../ui/scroll-area'
