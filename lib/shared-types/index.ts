// Shared TypeScript types for Omni-LLM Suite

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatCompletionRequest {
  model: string
  messages: ChatMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

export interface ChatCompletionResponse {
  id: string
  object: 'chat.completion'
  created: number
  model: string
  choices: Array<{
    index: number
    message: ChatMessage
    finish_reason: 'stop' | 'length' | 'tool_calls' | null
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ProxyChainConfig {
  version: string
  strategy: 'sequential_fallback' | 'race' | 'mixture_of_agents'
  chain: UpstreamConfig[]
  modelRouting: Record<string, string[]>
}

export interface UpstreamConfig {
  name: string
  url: string
  priority: number
  capabilities: string[]
  retryOn: number[]
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'down'
  timestamp: string
  services: Record<string, boolean>
}

export interface KeyRotationConfig {
  providers: Array<{
    name: string
    keys: string[]
    baseUrl: string
  }>
}

export interface MCPServerConfig {
  command: string
  args: string[]
  cwd?: string
  env?: Record<string, string>
}
