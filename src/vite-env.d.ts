/// <reference types="vite/client" />
/// <reference types="react" />
/// <reference types="react-dom" />

declare namespace React {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // Erlaube beliebige Daten-Attribute
    [key: `data-${string}`]: any;
  }
}
