# 🦌 Omni-LLM-Suite

> A unified, Windows-native monorepo combining 12 open-source AI & security tools into a single fully executable stack.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Windows](https://img.shields.io/badge/Platform-Windows-blue.svg)](scripts/setup-windows.ps1)
[![.NET 8](https://img.shields.io/badge/.NET-8.0-purple.svg)](apps/gateway)
[![Node.js](https://img.shields.io/badge/Node.js-22+-green.svg)](package.json)
[![pnpm](https://img.shields.io/badge/pnpm-9-orange.svg)](pnpm-workspace.yaml)

## 🏗 Architecture

```
Client → Gateway (:8080) → Rotato (:8990) → Claude Cruise (:4141) → MOA (:8007) → LLMs
                    ↕
               Dashboard (:5173)
                    ↕
          Token Savior MCP (:3100)
```

## 📦 Integrated Repositories

| Package | Source | Role |
|---|---|---|
| **rotato** | p32929/rotato | Zero-dep API key rotation |
| **claude-cruise** | amitlals/claude-cruise | 429 fallback proxy |
| **free-llm-proxy** | xor0110xor-prog/free-llm-proxy-mixture | Mixture-of-Agents (free tiers) |
| **token-savior** | Mibayy/token-savior | MCP: -80% token usage |
| **caveman** | JuliusBrussee/caveman | LLM context compression |
| **rtk** | rtk-ai/rtk | Rust token killer proxy |
| **opencoder** | ducan-ne/opencoder | Open-source Claude Code agent |
| **openwork** | different-ai/openwork | AI workspace orchestration |
| **jwt-tool** | ticarpi/jwt_tool | JWT testing & manipulation tool |
| **keyhacks** | streaak/keyhacks | API keys validation & checks |
| **trufflehog** | trufflesecurity/trufflehog | Secret scanning & credential detection |
| **awesome-hacking** | Hack-with-Github/Awesome-Hacking | Security reference database |

## 🚀 Quick Start (Windows)

```powershell
# 1. Clone
git clone <your-repo> omni-llm-suite
cd omni-llm-suite

# 2. One-shot bootstrap (installs Node, Python, Rust, .NET, Docker)
.\scripts\setup-windows.ps1

# 3. Configure API keys
notepad .env

# 4. Launch all services
.\scripts\start-all.ps1

# 5. Health check
.\scripts\health-check.ps1

# 6. Open Dashboard
start http://localhost:5173
```

## 🌐 Services & Ports

| Service | Port | Description |
|---|---|---|
| **Gateway** | 8080 | Unified .NET 8 entry point |
| **Dashboard** | 5173 | React monitoring UI |
| **Rotato** | 8990 | API key rotation |
| **Claude Cruise** | 4141 | 429 fallback |
| **MOA Aggregator** | 8007 | Mixture of Agents |
| **Token Savior MCP** | 3100 | Code navigation + memory |
| **Redis** | 6379 | Rate limiting |

## 🔧 Scripts

| Script | Description |
|---|---|
| `setup-windows.ps1` | One-shot install of all toolchains |
| `start-all.ps1` | Launch all services concurrently |
| `stop-all.ps1` | Graceful teardown |
| `health-check.ps1` | Port & HTTP liveness probe |
| `build-all.ps1` | Full cross-language build |

## 📝 Configuration

Copy `.env.example` to `.env` and fill in your API keys:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-v1-...
ROTATO_ADMIN_PASSWORD=your-secure-password
```

## 🧪 Testing

```powershell
pnpm test                  # All tests via Vitest
pnpm --filter dashboard dev  # Dashboard only
dotnet run --project apps/gateway  # Gateway only
```

## 🏛 Tech Stack

- **Gateway**: C# / .NET 8 (ASP.NET Core)
- **Dashboard**: React + Vite + Recharts
- **Proxies**: Node.js / TypeScript
- **Token Optimizer**: Python 3.12 + uv
- **CLI Agent**: Rust (RTK)
- **Rate Limiting**: Redis + Lua atomic scripts
- **Orchestration**: Turborepo + pnpm workspaces

## 📄 License

MIT
