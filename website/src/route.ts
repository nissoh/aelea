import { createRouteSchema } from 'aelea/ui-router'

export const routeSchema = createRouteSchema({
  fragment: '',
  title: 'aelea',
  children: {
    pages: {
      fragment: 'p',
      children: {
        guide: { fragment: 'guide', title: 'Guide' },
        examples: {
          fragment: 'examples',
          children: {
            controllers: { fragment: 'controllers', title: 'Controllers' },
            theme: { fragment: 'theme', title: 'Theme' },
            dragAndSort: { fragment: 'drag-and-sort', title: 'Drag N Drop' },
            countCounters: { fragment: 'count-counters', title: 'Count Counters' },
            todoApp: { fragment: 'todo-app', title: 'Todo App' },
            calculator: { fragment: 'calculator', title: 'Calculator' },
            virtualScroll: { fragment: 'virtual-scroll', title: 'Virtual Scroll' },
            popover: { fragment: 'popover', title: 'Popover' },
            table: { fragment: 'table', title: 'Table' },
            toastQueue: { fragment: 'toast-queue', title: 'Toast Queue' }
          }
        }
      }
    }
  }
} as const)
