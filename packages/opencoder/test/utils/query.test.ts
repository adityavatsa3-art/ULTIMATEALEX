import { expect, test, describe } from "vitest"
import type { ComponentTree } from "./debugger.js" // Import the type
import { queryComponentTree } from "./query.js"

// Updated mock data reflecting ComponentTree[] structure
const mockTree: ComponentTree[] = [
  {
    name: "App",
    props: { title: "Test App" },
    state: { loaded: true },
    children: [
      {
        name: "Box",
        props: { id: "main-box", width: 100 },
        state: {},
        children: [
          {
            name: "Text",
            props: { color: "red", value: "Hello" },
            state: { active: true },
            children: [],
          },
          {
            name: "Text",
            props: { color: "blue", value: "World" },
            state: { active: false, count: 5 },
            children: [],
          },
          {
            name: "Button",
            props: { disabled: true, type: "submit" },
            state: {},
            children: [{ name: "Text", props: { value: "Click Me" }, state: {}, children: [] }],
          },
        ],
      },
      {
        name: "Counter",
        props: { initial: 0 },
        state: { value: 10 },
        children: [],
      },
      {
        name: "Box", // Another Box
        props: { id: "footer-box" },
        state: {},
        children: [],
      },
    ],
  },
]

describe("queryComponentTree", () => {
  test("should find component by name", () => {
    const box = queryComponentTree(mockTree, "Box")
    expect(box).toBeDefined()
    expect(box?.name).toBe("Box")
    expect(box?.props.id).toBe("main-box") // Finds the first one
  })

  test("should return null if component name not found", () => {
    const nonExistent = queryComponentTree(mockTree, "NonExistent")
    expect(nonExistent).toBeNull()
  })

  test("should find component by prop existence", () => {
    const buttonWithDisabled = queryComponentTree(mockTree, "Button[disabled]")
    expect(buttonWithDisabled).toBeDefined()
    expect(buttonWithDisabled?.name).toBe("Button")
    expect(buttonWithDisabled?.props.disabled).toBe(true)

    const textWithValue = queryComponentTree(mockTree, "Text[value]")
    expect(textWithValue).toBeDefined()
    expect(textWithValue?.name).toBe("Text")
    expect(textWithValue?.props.value).toBe("Hello") // Finds first Text
  })

  test("should find component by specific prop value (string, quoted)", () => {
    const redText = queryComponentTree(mockTree, 'Text[color="red"]')
    expect(redText).toBeDefined()
    expect(redText?.name).toBe("Text")
    expect(redText?.props.color).toBe("red")
    expect(redText?.props.value).toBe("Hello")
  })

  test("should find component by specific prop value (string, unquoted)", () => {
    const blueText = queryComponentTree(mockTree, "Text[color=blue]")
    expect(blueText).toBeDefined()
    expect(blueText?.name).toBe("Text")
    expect(blueText?.props.color).toBe("blue")
    expect(blueText?.props.value).toBe("World")
  })

  test("should find component by specific prop value (number)", () => {
    const wideBox = queryComponentTree(mockTree, "Box[width=100]")
    expect(wideBox).toBeDefined()
    expect(wideBox?.name).toBe("Box")
    expect(wideBox?.props.width).toBe(100)
    expect(wideBox?.props.id).toBe("main-box")
  })

  test("should find component by specific prop value (boolean)", () => {
    const disabledButton = queryComponentTree(mockTree, "Button[disabled=true]")
    expect(disabledButton).toBeDefined()
    expect(disabledButton?.name).toBe("Button")
    expect(disabledButton?.props.disabled).toBe(true)

    const appLoaded = queryComponentTree(mockTree, "App[loaded=true]") // Note: state check uses [state.key=...]
    expect(appLoaded).toBeNull() // Should be null because `loaded` is state

    const appLoadedCorrect = queryComponentTree(mockTree, "App[state.loaded=true]")
    expect(appLoadedCorrect).toBeDefined()
    expect(appLoadedCorrect?.name).toBe("App")
    expect(appLoadedCorrect?.state.loaded).toBe(true)
  })

  test("should find component by state existence", () => {
    const textWithActiveState = queryComponentTree(mockTree, "Text[state.active]")
    expect(textWithActiveState).toBeDefined()
    expect(textWithActiveState?.name).toBe("Text")
    expect(textWithActiveState?.props.value).toBe("Hello") // First Text has 'active' state
    expect(textWithActiveState?.state.active).toBe(true)
  })

  test("should find component by specific state value (number)", () => {
    const counterAtTen = queryComponentTree(mockTree, "Counter[state.value=10]")
    expect(counterAtTen).toBeDefined()
    expect(counterAtTen?.name).toBe("Counter")
    expect(counterAtTen?.state.value).toBe(10)
  })

  test("should find component by specific state value (boolean)", () => {
    const inactiveText = queryComponentTree(mockTree, "Text[state.active=false]")
    expect(inactiveText).toBeDefined()
    expect(inactiveText?.name).toBe("Text")
    expect(inactiveText?.props.value).toBe("World") // Second Text has active=false
    expect(inactiveText?.state.active).toBe(false)
  })

  test("should return null if prop value does not match", () => {
    const greenText = queryComponentTree(mockTree, 'Text[color="green"]')
    expect(greenText).toBeNull()
  })

  test("should return null if state value does not match", () => {
    const counterAtZero = queryComponentTree(mockTree, "Counter[state.value=0]")
    expect(counterAtZero).toBeNull()
  })

  test("should find component with multiple conditions (prop + state)", () => {
    const blueInactiveText = queryComponentTree(mockTree, "Text[color=blue][state.active=false]")
    expect(blueInactiveText).toBeDefined()
    expect(blueInactiveText?.name).toBe("Text")
    expect(blueInactiveText?.props.color).toBe("blue")
    expect(blueInactiveText?.state.active).toBe(false)
    expect(blueInactiveText?.props.value).toBe("World")
  })

  test("should find component with multiple conditions (prop + prop)", () => {
    const specificButton = queryComponentTree(mockTree, "Button[disabled=true][type=submit]")
    expect(specificButton).toBeDefined()
    expect(specificButton?.name).toBe("Button")
    expect(specificButton?.props.disabled).toBe(true)
    expect(specificButton?.props.type).toBe("submit")
  })

  test("should return null if not all multiple conditions match", () => {
    const nonExistent = queryComponentTree(mockTree, "Text[color=red][state.active=false]")
    expect(nonExistent).toBeNull() // First text is red but active=true
  })

  test("should find nested components correctly", () => {
    // Find the Text inside the first Button

    // For now, let's test finding a specific nested text directly
    const clickMeText = queryComponentTree(mockTree, 'Text[value="Click Me"]')
    expect(clickMeText).toBeDefined()
    expect(clickMeText?.name).toBe("Text")
    expect(clickMeText?.props.value).toBe("Click Me")

    // Verify it's nested (manually checking structure for now)
    const button = queryComponentTree(mockTree, "Button[type=submit]")
    let foundInButton = false
    if (button?.children) {
      for (const child of button.children) {
        if (child.name === "Text" && child.props.value === "Click Me") {
          foundInButton = true
          break
        }
      }
    }
    expect(foundInButton).toBe(true)
  })

  test("should handle mixed existence and equality checks", () => {
    const specificText = queryComponentTree(mockTree, "Text[state.count][value=World]")
    expect(specificText).toBeDefined()
    expect(specificText?.name).toBe("Text")
    expect(specificText?.props.value).toBe("World")
    expect(specificText?.state.count).toBe(5)
  })
})
