/**
 * Performance monitoring utilities
 * Helps track and optimize page load times and animations
 */

export const performance = {
  /**
   * Mark the start of a performance measurement
   */
  mark: (name: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(name)
    }
  },

  /**
   * Measure the time between two marks
   */
  measure: (name: string, startMark: string, endMark: string) => {
    if (typeof window !== 'undefined' && window.performance) {
      try {
        window.performance.measure(name, startMark, endMark)
        const measure = window.performance.getEntriesByName(name)[0]
        if (measure) {
          console.log(`⚡ ${name}: ${measure.duration.toFixed(2)}ms`)
        }
      } catch (error) {
        // Marks might not exist, ignore
      }
    }
  },

  /**
   * Log page load metrics
   */
  logPageLoad: () => {
    if (typeof window !== 'undefined' && window.performance) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = window.performance.timing
          const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart
          const connectTime = perfData.responseEnd - perfData.requestStart
          const renderTime = perfData.domComplete - perfData.domLoading

          console.log('📊 Performance Metrics:')
          console.log(`  Page Load: ${pageLoadTime}ms`)
          console.log(`  Connect: ${connectTime}ms`)
          console.log(`  Render: ${renderTime}ms`)
        }, 0)
      })
    }
  },

  /**
   * Measure component render time
   */
  measureComponent: (componentName: string, callback: () => void) => {
    const startMark = `${componentName}-start`
    const endMark = `${componentName}-end`
    const measureName = `${componentName}-render`

    performance.mark(startMark)
    callback()
    performance.mark(endMark)
    performance.measure(measureName, startMark, endMark)
  },
}

// Auto-log page load metrics in development
const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

if (isDev) {
  performance.logPageLoad()
}
