import {
  getDisplayName,
  hasMemoCache,
  isCompositeFiber,
  isHostFiber,
  isValidElement,
  MemoComponentTag,
  SimpleMemoComponentTag,
  SuspenseComponentTag,
  traverseFiber,
  type Fiber,
  type FiberRoot,
} from "bippy"
import { mapValues } from "lodash-es"

export interface InspectableElement {
  // element: HTMLElement
  depth: number
  name: string
  fiber: Fiber
}

export const getFirstStateNode = (fiber: Fiber): Element | null => {
  let current: Fiber | null = fiber
  while (current) {
    if (current.stateNode instanceof Element) {
      return current.stateNode
    }

    if (!current.child) {
      break
    }
    current = current.child
  }

  while (current) {
    if (current.stateNode instanceof Element) {
      return current.stateNode
    }

    if (!current.return) {
      break
    }
    current = current.return
  }
  return null
}

export const getParentCompositeFiber = (fiber: Fiber): readonly [Fiber, Fiber | null] | null => {
  let current: Fiber | null = fiber
  let prevHost: Fiber | null = null

  while (current) {
    if (isCompositeFiber(current)) return [current, prevHost] as const
    if (isHostFiber(current) && !prevHost) prevHost = current
    current = current.return
  }

  return null
}

export const getCompositeComponentFromElement = (associatedFiber: Fiber) => {
  const stateNode = getFirstStateNode(associatedFiber)
  if (!stateNode) return {}
  const parentCompositeFiberInfo = getParentCompositeFiber(associatedFiber)
  if (!parentCompositeFiberInfo) {
    return {}
  }
  const [parentCompositeFiber] = parentCompositeFiberInfo

  return {
    parentCompositeFiber,
  }
}

export const getInspectableElements = (fiberRoot: FiberRoot): Array<InspectableElement> => {
  const result: Array<InspectableElement> = []

  traverseFiber(fiberRoot.current, (fiber) => {
    result.push({
      depth: 0,
      name: getDisplayName(fiber.type) ?? "Unknown",
      fiber,
    })
  })

  return result
}

const fiberMap = new WeakMap<HTMLElement, Fiber>()

interface TreeNode {
  label: string
  title?: string
  // fiber: Fiber
  children?: TreeNode[]
  renderData?: {}
}

const LazyComponentTag = 24
const ProfilerTag = 12

interface WrapperBadge {
  type: "memo" | "forwardRef" | "lazy" | "suspense" | "profiler" | "strict"
  title: string
  compiler?: boolean
}

export interface ExtendedDisplayName {
  name: string | null
  wrappers: Array<string>
  wrapperTypes: Array<WrapperBadge>
}

export type ComponentTree = {
  name: string
  props: any
  state: any
  children: ComponentTree[]
}

export const buildComponentTree = (fiber: Fiber) => {
  const result: ComponentTree[] = []

  const traverse = (fiber: Fiber, parent?: ComponentTree) => {
    const displayName = getDisplayName(fiber.type) ?? "Unknown"

    // Check if component name starts with "Internal"
    const isInternalComponent = displayName.startsWith("Internal")

    if (!isInternalComponent) {
      // Only create and add component to tree if it's not an internal component
      const target = parent?.children ?? result
      const current = {
        name: displayName,
        props: mapValues(fiber.memoizedProps, (value) => {
          if (isValidElement(value) || typeof value === "object" || typeof value === "function") {
            return undefined
          }
          return value
        }),
        state: mapValues(fiber.memoizedState, (value) => {
          if (isValidElement(value) || typeof value === "object" || typeof value === "function") {
            return undefined
          }
          return value
        }),
        children: [],
      } as ComponentTree
      target.push(current)

      // For non-internal components, traverse children with current as parent
      if (fiber.child) traverse(fiber.child, current)
      if (fiber.sibling) traverse(fiber.sibling, parent)
    } else {
      // For internal components, traverse children with the same parent
      if (fiber.child) traverse(fiber.child, parent)
      if (fiber.sibling) traverse(fiber.sibling, parent)
    }
  }

  traverse(fiber)

  return result
}

// take a component tree and return a string visually representing the tree
// for example, the tree:
// <Root>
//   <App state={{ name: "John" }}>
//     <Box>
//       <ink-box color="red">Hello</Text> // color="red" is a prop
//     </Box>
//   </App>
// </Root>

export const componentTreeToString = (tree: ComponentTree[]) => {
  const result: string[] = []

  const traverse = (node: ComponentTree, depth = 0) => {
    const indent = "  ".repeat(depth)

    // Format props
    const propsStr = Object.entries(node.props || {})
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => {
        // Add prefix for numeric keys
        const formattedKey = /^\d+$/.test(key) ? `_${key}` : key

        if (
          typeof value === "number" ||
          typeof value === "boolean" ||
          typeof value === "undefined"
        ) {
          return `${formattedKey}={${value}}`
        }
        return `${formattedKey}=${JSON.stringify(value)}`
      })
      .join(" ")

    // Format state
    const stateStr =
      Object.keys(node.state || {}).length > 0 ? ` state=${JSON.stringify(node.state)}` : ""

    // Create component string
    const componentStr = `${indent}<${node.name}${propsStr ? " " + propsStr : ""}${stateStr}>`
    result.push(componentStr)

    // Traverse children
    for (const child of node.children) {
      traverse(child, depth + 1)
    }

    // Close tag if there were children
    if (node.children.length > 0) {
      result.push(`${indent}</${node.name}>`)
    }
  }

  // Handle array of trees
  if (Array.isArray(tree)) {
    for (const node of tree) {
      traverse(node)
    }
  } else {
    traverse(tree)
  }

  return result.join("\n")
}
