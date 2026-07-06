import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Modal } from './Modal'

const onClose = vi.fn()

describe('Modal', () => {
  beforeEach(() => {
    onClose.mockClear()
  })

  it('renders when open', () => {
    render(
      <Modal open onClose={onClose} title="Test Modal">
        <p>Modal content</p>
      </Modal>
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Test Modal')).toBeInTheDocument()
    expect(screen.getByText('Modal content')).toBeInTheDocument()
  })

  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={onClose} title="Test Modal">
        Modal content
      </Modal>
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    render(
      <Modal open onClose={onClose} title="Test Modal">
        Content
      </Modal>
    )

    fireEvent.click(screen.getByRole('button', { name: /Close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when the overlay is clicked', () => {
    render(
      <Modal open onClose={onClose} title="Test Modal">
        Content
      </Modal>
    )

    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when Escape is pressed', () => {
    render(
      <Modal open onClose={onClose} title="Test Modal">
        Content
      </Modal>
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('renders footer when provided', () => {
    render(
      <Modal open onClose={onClose} title="Test Modal" footer={<button type="button">Action</button>}>
        Content
      </Modal>
    )

    expect(screen.getByRole('button', { name: /Action/i })).toBeInTheDocument()
  })
})
