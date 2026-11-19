import { Card, CardContent } from '../../ui/card'
import { Skeleton } from '../../ui/skeleton'

/**
 * Skeleton loading state for cards
 * Mimics the structure of a ClienteMobileCard or a generic card
 */
export function SkeletonCard() {
  return (
    <Card className='relative border-l-4 border-l-gray-300'>
      <CardContent className='p-4'>
        {/* Row 1: Avatar + Name + Chevron */}
        <div className='flex items-start gap-3 mb-2'>
          <Skeleton className='h-8 w-8 rounded-full flex-shrink-0' />
          <div className='flex-1 space-y-2'>
            <Skeleton className='h-4 w-3/4' />
          </div>
          <Skeleton className='h-5 w-5 rounded flex-shrink-0' />
        </div>

        {/* Row 2: Enrollment number + Badge */}
        <div className='flex items-center gap-2 mb-2 ml-11'>
          <Skeleton className='h-3 w-24' />
          <Skeleton className='h-5 w-20 rounded-full' />
        </div>

        {/* Row 3: Course */}
        <div className='flex items-center gap-2 mb-2 ml-11'>
          <Skeleton className='h-3.5 w-3.5 rounded' />
          <Skeleton className='h-3 w-2/3' />
        </div>

        {/* Row 4: Status + Benefit */}
        <div className='flex items-center gap-2 ml-11'>
          <Skeleton className='h-6 w-16 rounded-full' />
          <Skeleton className='h-6 w-24 rounded-full' />
        </div>
      </CardContent>
    </Card>
  )
}
