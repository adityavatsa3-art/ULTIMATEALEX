import { Text } from "ink"
import React from "react"
import { defineTool } from "@/tools/ai.js"
import { streamText } from "ai"
import { z } from "zod"

export const tool = defineTool({
  description: `Your go-to tool for any technical or coding task. Analyzes requirements and breaks them down into clear, actionable implementation steps. Use this whenever you need help planning how to implement a feature, solve a technical problem, or structure your code.`,
  parameters: z.strictObject({
    prompt: z.string().describe("The technical request or coding task to analyze"),
    context: z
      .string()
      .describe("Optional context from previous conversation or system state")
      .optional(),
  }),
  async* generate({ prompt, context }, { model, abortSignal }) {
    yield <Text>Planning...</Text>
    const planning = streamText({
      system: `You are an expert software architect. Your role is to analyze technical requirements and produce clear, actionable implementation plans.
These plans will then be carried out by a junior software engineer so you need to be specific and detailed. However do not actually write the code, just explain the plan.

Follow these steps for each request:
1. Carefully analyze requirements to identify core functionality and constraints
2. Define clear technical approach with specific technologies and patterns
3. Break down implementation into concrete, actionable steps at the appropriate level of abstraction

Keep responses focused, specific and actionable. 

IMPORTANT: Do not ask the user if you should implement the changes at the end. Just provide the plan as described above.
IMPORTANT: Do not attempt to write the code or use any string modification tools. Just provide the plan.`,
      // TODO: lets user custom planning model
      model,
      messages: [
        {
          role: "user",
          content: context ? `<context>${context}</context>\n\n${prompt}` : prompt,
        },
      ],
      abortSignal,
    })
    let fullText = ""
    for await (const chunk of planning.textStream) {
      fullText += chunk
      yield <Text>{`${fullText}`}</Text>
    }
    yield fullText
  },
})
