(() => {
// Decide before first paint whether the $ is already there
    try {
      if (sessionStorage.getItem('tonk-dollar') || matchMedia('(prefers-reduced-motion: reduce)').matches)
        document.documentElement.classList.add('has-dollar')
    } catch { document.documentElement.classList.add('has-dollar') }

    // In desktop Chrome, line the fake bar up with the real one at any page zoom:
    // Chrome's toolbar doesn't zoom, so scale the bar back by 1/zoom
    const ZOOMS = [.25, .33, .5, .67, .75, .8, .9, 1, 1.1, 1.25, 1.5, 1.75, 2, 2.5, 3, 4, 5]
    const fitBar = () => {
      const root = document.documentElement
      const ua = navigator.userAgentData
      const chrome = ua && !ua.mobile && ua.brands.some(b => b.brand === 'Google Chrome')
      if (!chrome || outerWidth < 1000) return root.classList.remove('fit')
      const raw = outerWidth / innerWidth
      const zoom = ZOOMS.reduce((a, b) => (Math.abs(b - raw) < Math.abs(a - raw) ? b : a))
      root.style.setProperty('--unzoom', 1 / zoom)
      // Chrome's 427px is measured from the window edge; the page ends at the scrollbar
      root.style.setProperty('--sb', `${Math.round((innerWidth - root.clientWidth) * zoom)}px`)
      root.classList.add('fit')
    }
    fitBar()
    addEventListener('resize', fitBar)
    addEventListener('DOMContentLoaded', fitBar)
})()
