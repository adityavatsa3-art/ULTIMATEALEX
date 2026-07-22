import React, { useMemo, useState, useLayoutEffect, type ReactNode } from "react"
import { Text } from "ink"
type Styles = any
export type Props<T> = {
  readonly items: T[]
  readonly style?: Styles
  readonly children: (item: T, index: number) => ReactNode
}

export default function Static<T>(props: Props<T>) {
  const { items, children: render, style: customStyle } = props
  const [index, setIndex] = useState(0)

  const itemsToRender: T[] = useMemo(() => {
    return items.slice(index)
  }, [items, index])

  useLayoutEffect(() => {
    setIndex(items.length)
  }, [items.length])

  const children = itemsToRender.map((item, itemIndex) => {
    return <Text key={itemIndex}>Hello world</Text>
  })

  const style: Styles = useMemo(
    () => ({
      position: "absolute",
      flexDirection: "column",
      ...customStyle,
    }),
    [customStyle],
  )

  const Comp = "ink-box" as any
  return (
    <Comp internal_static style={style}>
      <Text>Hello world</Text>
    </Comp>
  )
}
