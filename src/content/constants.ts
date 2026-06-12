export const uiMarker = 'data-docscrape-ui'

export const isFirefoxLike
  = import.meta.env.EXTENSION_PUBLIC_BROWSER === 'firefox'
    || import.meta.env.EXTENSION_PUBLIC_BROWSER === 'gecko-based'
