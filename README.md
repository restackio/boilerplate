# Restack boilerplate

This project uses [Restack](https://restack.io), the open source AI agent orchestration at enterprise scale.

## Motivation

Restack has helped enterprise companies build AI agents at large scale where product teams often sit between domain experts (customer service, marketing, sales) and engineering teams.

- **The challenge:** product teams wants to iterate quickly with domain experts to craft agent behavior and experience. But every change requires engineering coordination, creating bottlenecks that slow innovation.

- **Restack approach:** empowers product teams with full autonomy from engineering. Product collaborates directly with domain experts to refine agent behavior. Engineering focuses on what they do best: building reliable integrations with 99.99% SLAs.

Built on Python + Kubernetes because enterprises already run AI workloads this way. Works with your existing infrastructure and team expertise.

## Quick start

```bash
cp .env.example .env
```

- Set `OPENAI_API_KEY` with a valid OpenAI API key
- Set `MCP_URL` for ngrok tunnel with `ngrok http 112233`

```bash
pnpm quickstart
```

### Access your platform
- **Agent Orchestration**: http://localhost:3000  
- **Developer Tracing**: http://localhost:5233
- **API**: http://localhost:8000

**Performance tip:** quickstart runs nextjs with hot reloading, changing pages takes a second. For instant loading, use `pnpm build && pnpm start` instead of dev mode.

## What can you build?

- **Customer Support Agents** (Zendesk, Intercom, Slack)  
Engineering connects support platforms. Product teams iterate on escalation rules, response tone, and handoff triggers.

- **Product Intelligence Agents** (PostHog, Linear, Slack)  
Engineering builds analytics and project management pipelines. Product teams adjust feature prioritization logic and user feedback analysis.

- **DevOps Monitoring Agents** (Sentry, Datadog, Kubernetes, GitHub, OpenAI Codex)  
Engineering integrates monitoring and development tools. Product teams define alert thresholds, incident response workflows, and automated troubleshooting.

- **Performance Marketing Agents** (Google Ads, Facebook Ads, PostHog, Slack)  
Engineering establishes advertising and analytics connections. Product teams optimize campaign strategies, bidding algorithms, and performance reporting.

- **Sales Intelligence Agents** (Salesforce, HubSpot, Slack)  
Engineering connects CRM and communication platforms. Product teams refine lead scoring, follow-up sequences, and sales forecasting models.

## Platform architecture

- **Product interface:** web-based agent management with version control, testing playground, and deployment controls. Product teams change agent behavior without code dependencies.

- **Engineering infrastructure:** python-based integration layer with [Temporal](https://temporal.io) workflow orchestration. [Kubernetes](https://kubernetes.io) deployment with enterprise-grade reliability and observability.

- **Integration protocol:** [Model Context Protocol](https://modelcontextprotocol.io) automatically exposes Python functions as agent tools, enabling seamless tool discovery and use across agent workflows.

```
┌─────────────────────────────────────┐
│       Agent Orchestration           │
│  ┌─────────────┐  ┌─────────────┐   │    ┌─────────────────┐
│  │  Frontend   │◄─│   Backend   │◄──┼────┤  MCP Server     │
│  │  (Next.js)  │  │ (Restack.py)│   │    │  (Integrations) │
│  └─────────────┘  └─────────────┘   │    └─────────────────┘
└─────────────────────────────────────┘             │
                                                    ▼
                                           ┌─────────────────┐
                                           │ External APIs   │
                                           │ (Zendesk, etc.) │
                                           └─────────────────┘
```

## OpenAI setup

This boilerplate uses OpenAI's response API for tool execution. You'll need:

1. **OpenAI API Key** - Get one at [platform.openai.com](https://platform.openai.com/api-keys)
2. **Public MCP URL** - For OpenAI to call your local tools

### Environment setup
```bash
cp env.development.example .env
# Add your OpenAI API key:
OPENAI_API_KEY=sk-your-key-here
```

### Mcp server public access
OpenAI needs a public URL to call your MCP server tools:

```bash
# Install ngrok (if not installed)
brew install ngrok  # or download from https://ngrok.com

# Expose MCP server
ngrok http 112233

# Add the ngrok URL to .env:
MCP_URL=https://your-ngrok-url.ngrok-free.app
```


## Getting started tutorial

### Step 1: Try a demo agent
1. Open Agent Orchestration at http://localhost:3000
2. Login with demo credentials: `demo@example.com` / `password`
3. Navigate to "Tasks" and select any completed task to see agent conversations
4. Go to "Agents" to see 5 pre-configured agents across different teams

### Step 2: Give an agent a new task
1. Select the "Customer Support" agent
2. Click "Create Task" and describe an issue: *"Customer can't log in to mobile app"*
3. Watch the agent analyze the problem and suggest solutions
4. See how it uses tools like Zendesk and knowledge base

### Step 3: Test agent improvements (no engineering required)
1. Click "Edit Agent" to change instructions
2. Try: *"Always ask for the customer's device type before troubleshooting"*
3. Open the **Playground** to test your changes
4. Send the same login issue and see the improved response
5. Click "Publish Version" to make it live

This workflow demonstrates the product-engineering partnership: product teams can iterate on agent behavior without touching code.

## Adding custom integrations

Build integrations in the **MCP Server** using Restack workflows with Pydantic types. Each function needs both a workflow and function definition to become an agent tool.

### Example: Zendesk integration (mock included)

```python
# apps/mcp_server/src/functions/zendesk.py
from pydantic import BaseModel

class SearchTicketsInput(BaseModel):
    query: str

class TicketResult(BaseModel):
    id: str
    subject: str
    status: str

async def search_zendesk_tickets(input: SearchTicketsInput) -> list[TicketResult]:
    """Search Zendesk tickets by query"""
    # Mock implementation included for demo
    return [
        TicketResult(id="12345", subject="Login issues", status="open"),
        TicketResult(id="12346", subject="Mobile app crash", status="pending")
    ]
```

```python
# apps/mcp_server/src/workflows/zendesk.py
from restack_ai import workflow

@workflow.defn(name="search_zendesk_tickets")
class SearchZendeskTicketsWorkflow:
    @workflow.run
    async def run(self, input: SearchTicketsInput) -> list[TicketResult]:
        return await workflow.step(search_zendesk_tickets, input)
```

### How it works
1. Create function with Pydantic types in `apps/mcp_server/src/functions/`
2. Create matching workflow in `apps/mcp_server/src/workflows/`
3. The MCP server auto-discovers workflows as agent tools
4. Test in the playground, no restart needed

See `apps/mcp_server/README.md` for more integration examples.

## Production deployment

### Option 1: Self-hosted Kubernetes (Enterprise)
Deploy on your own Kubernetes cluster:
```bash
# Add Restack Helm repository
helm repo add restack https://github.com/restackio/helm

# Deploy with your configuration
helm install restack restack/restack -f values.yaml
```
See [Restack Helm Charts](https://github.com/restackio/helm) for full configuration options.

### Option 2: Restack Cloud (recommended)
Fully managed infrastructure:
1. Sign up at [console.restack.io](https://console.restack.io)
2. Deploy your agent workflows
3. Connect your frontend to the managed backend

### Option 3: Hybrid (frontend + cloud backend)
**Frontend (Vercel)**
1. Connect your GitHub repo to Vercel
2. Set build settings:
   - Root Directory: `apps/frontend`
   - Build Command: `turbo run build --filter=boilerplate-frontend`

**Backend (Restack Cloud)**
- Deploy backend and MCP server to Restack Cloud
- Update frontend environment variables to point to cloud endpoints

### Option 4: Self-hosted Docker (Hobbyist)
```bash
# Production build
pnpm build
pnpm start

# Or with Docker Compose
docker-compose up -d
```

## Platform management

```bash
# Start platform
pnpm docker:reset

# View logs
pnpm docker:logs

# Stop platform
pnpm docker:down
```

## For developers

Want to contribute or change the platform? See [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Development setup with hot reloading
- Architecture deep-dive
- Testing and debugging
- Code contribution guidelines

## Learn more

- [Restack Documentation](https://docs.restack.io)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Temporal Workflows](https://docs.temporal.io)
- [Python Integration Examples](https://github.com/restackio/examples-python)
- [Community Discord](https://discord.gg/restack)

## 📄 License

MIT License - feel free to use this platform for your own projects.