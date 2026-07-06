import { render as rtlRender, type RenderOptions, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { ReactElement, ReactNode } from 'react'

export function getControlByLabel(labelText: string): HTMLElement {
  const label = screen.getByText(labelText, { selector: 'label' })
  const control =
    label.parentElement?.querySelector('input, select, textarea') ??
    label.closest('div')?.querySelector('input, select, textarea')
  if (!control) {
    throw new Error(`No form control found for label "${labelText}"`)
  }
  return control as HTMLElement
}

export function getSubmitButton(name: string | RegExp): HTMLElement {
  const submit = screen
    .getAllByRole('button', { name })
    .find((b) => b.getAttribute('type') === 'submit')
  if (submit) return submit
  return screen.getByRole('button', { name })
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

interface ProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string
  queryClient?: QueryClient
}

export function renderWithProviders(ui: ReactElement, options: ProvidersOptions = {}) {
  const { route = '/', queryClient = createTestQueryClient(), ...renderOptions } = options

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    )
  }

  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
}
