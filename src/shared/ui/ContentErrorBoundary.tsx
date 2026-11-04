import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Result } from 'antd'

export interface ContentErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode)
  title?: string
  description?: string
  onCatch?: (error: Error, errorInfo: ErrorInfo) => void
}

interface ContentErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ContentErrorBoundary extends Component<
  ContentErrorBoundaryProps,
  ContentErrorBoundaryState
> {
  constructor(props: ContentErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error: Error): ContentErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onCatch?.(error, errorInfo)
    if (import.meta.env.DEV) {
      console.error('[ContentErrorBoundary] Uncaught error:', error, errorInfo)
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    const { hasError, error } = this.state
    const { children, fallback, title, description } = this.props

    if (hasError) {
      if (typeof fallback === 'function') {
        return fallback(error ?? new Error('Unknown error'), this.handleReset)
      }

      if (fallback) {
        return fallback
      }

      return (
        <Result
          status="error"
          title={title || 'Không thể tải nội dung'}
          subTitle={
            description ||
            'Đã xảy ra lỗi không mong muốn khi hiển thị khu vực này. Bạn có thể thử tải lại.'
          }
          extra={
            <Button type="primary" onClick={this.handleReset}>
              Thử lại
            </Button>
          }
        />
      )
    }

    return children
  }
}
