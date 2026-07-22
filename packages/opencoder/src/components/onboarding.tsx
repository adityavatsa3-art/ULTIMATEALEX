import { OrderedList } from "@inkjs/ui"
import React from "react"
import { Text } from "ink"

export function Onboarding() {
  return (
    <OrderedList>
      <OrderedList.Item>
        <Text>Red</Text>
      </OrderedList.Item>

      <OrderedList.Item>
        <Text>Green</Text>

        <OrderedList>
          <OrderedList.Item>
            <Text>Light</Text>
          </OrderedList.Item>

          <OrderedList.Item>
            <Text>Dark</Text>
          </OrderedList.Item>
        </OrderedList>
      </OrderedList.Item>

      <OrderedList.Item>
        <Text>Blue</Text>
      </OrderedList.Item>
    </OrderedList>
  )
}
