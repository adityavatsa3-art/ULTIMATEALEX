import type { DOMElement } from "react"
import type { LegacyRef } from "react"
import type { ReactNode } from "react"
import type { Key } from "react"
import type { ComponentProps } from "react"
import type { Text } from "ink"
import "react/canary"

declare global {
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface IntrinsicElements {
      "ink-box": Ink.Box
      "ink-text": Ink.Text
    }
  }
}

declare namespace Ink {
  type Box = {
    internal_static?: boolean
    children?: ReactNode
    key?: Key
    ref?: LegacyRef<DOMElement<any, any>>
    style?: Omit<ComponentProps<typeof Text>, "textWrap">
  }

  type Text = {
    children?: ReactNode
    key?: Key
    style?: ComponentProps<typeof Text>

    // eslint-disable-next-line @typescript-eslint/naming-convention
    internal_transform?: (children: string, index: number) => string
  }
}
