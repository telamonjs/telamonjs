import type { Meta, StoryObj } from '@storybook/react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card'
import { Button } from './button'

const meta = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Componente de card flexível para organizar conteúdo em seções bem definidas.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Card>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Card className='w-[350px]'>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Card Content</p>
      </CardContent>
    </Card>
  ),
}

export const WithFooter: Story = {
  render: () => (
    <Card className='w-[350px]'>
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy your new project in one-click.</CardDescription>
      </CardHeader>
      <CardContent>
        <form>
          <div className='grid w-full items-center gap-4'>
            <div className='flex flex-col space-y-1.5'>
              <label htmlFor='name'>Name</label>
              <input id='name' placeholder='Name of your project' />
            </div>
            <div className='flex flex-col space-y-1.5'>
              <label htmlFor='framework'>Framework</label>
              <select id='framework'>
                <option value=''>Select</option>
                <option value='next'>Next.js</option>
                <option value='sveltekit'>SvelteKit</option>
                <option value='astro'>Astro</option>
                <option value='nuxt'>Nuxt.js</option>
              </select>
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter className='flex justify-between'>
        <Button variant='outline'>Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
}

export const Simple: Story = {
  render: () => (
    <Card className='w-[350px]'>
      <CardContent className='pt-6'>
        <div className='text-center'>
          <h3 className='text-lg font-semibold'>Simple Card</h3>
          <p className='text-sm text-muted-foreground mt-2'>
            This is a simple card with just content, no header or footer.
          </p>
        </div>
      </CardContent>
    </Card>
  ),
}

export const HeaderOnly: Story = {
  render: () => (
    <Card className='w-[350px]'>
      <CardHeader>
        <CardTitle>Header Only Card</CardTitle>
        <CardDescription>
          This card only has a header section for simple displays.
        </CardDescription>
      </CardHeader>
    </Card>
  ),
}

export const StatCard: Story = {
  render: () => (
    <Card className='w-[350px]'>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>Total Revenue</CardTitle>
        <svg
          xmlns='http://www.w3.org/2000/svg'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth='2'
          className='h-4 w-4 text-muted-foreground'
        >
          <path d='M12 2v20m9-9H3' />
        </svg>
      </CardHeader>
      <CardContent>
        <div className='text-2xl font-bold'>$45,231.89</div>
        <p className='text-xs text-muted-foreground'>+20.1% from last month</p>
      </CardContent>
    </Card>
  ),
}

export const MultipleCards: Story = {
  render: () => (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
      <Card>
        <CardHeader>
          <CardTitle>Sales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>$12,234</div>
          <p className='text-xs text-muted-foreground'>+19% from last month</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Subscriptions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>+2350</div>
          <p className='text-xs text-muted-foreground'>
            +180.1% from last month
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active Now</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-2xl font-bold'>+573</div>
          <p className='text-xs text-muted-foreground'>+201 since last hour</p>
        </CardContent>
      </Card>
    </div>
  ),
}
