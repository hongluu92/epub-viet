'use client';

import { Component } from 'react';

/**
 * Generic React error boundary.
 * Wrap page-level or heavy components to catch render errors gracefully.
 *
 * Usage:
 *   <ErrorBoundary fallback={<p>Something went wrong</p>}>
 *     <HeavyComponent />
 *   </ErrorBoundary>
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Use custom fallback if provided
    if (this.props.fallback) return this.props.fallback;

    return (
      <div
        className="min-h-[200px] flex flex-col items-center justify-center gap-4 p-8 text-center"
        style={{ color: 'var(--text-muted)' }}
      >
        <svg
          width="40" height="40" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <p className="text-sm font-medium mb-1" style={{ color: 'var(--text)' }}>
            Có lỗi xảy ra
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {this.state.error?.message || 'Lỗi không xác định'}
          </p>
        </div>
        <button
          onClick={this.handleRetry}
          className="text-xs px-4 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        >
          Thử lại
        </button>
      </div>
    );
  }
}
