declare const GM_info:
  | {
      script?: {
        version?: string
      }
    }
  | undefined

declare const GM_xmlhttpRequest: (...args: any[]) => any
declare const GM_openInTab: (...args: any[]) => any
declare const unsafeWindow: any

interface ParentNode {
  querySelector<E extends Element = any>(selectors: string): E | null
  querySelectorAll<E extends Element = any>(selectors: string): NodeListOf<E>
}
