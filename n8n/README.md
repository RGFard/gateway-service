# n8n shipments workflow

`shipments-workflow.json` is the n8n workflow the gateway posts to (`N8N_WEBHOOK_URL`).
Exported from the n8n editor (⋯ > Download). It holds no credentials.

## What it does

1. **Webhook** `POST /webhook/ai/webhook/shipment/` receives the gateway's envelope
   (`payload`, `target.system`, `target.serviceCode`, `target.accountNumber`).
2. **Normalize to Canonical**: nexus-engine `POST /ai/normalize` (source payload to canonical).
3. **If: Canonical valid?** No: reply with `stage: canonical` errors.
4. **Map canonical to target**: nexus-engine `POST /outbound/transform` with the target's saved plan
   and parameters `serviceCode` / `accountNumber`.
5. **If: Target payload valid?** No: reply with `stage: target` errors.
6. **Send to target**: `POST {target host}/{target.system}/shipments` (today the local mock).
7. **Respond to Webhook**: `{ success, carrier, trackingNumber }` or `{ success: false, stage, errors }`.

## Hosts it expects

| Service | URL in the workflow |
| --- | --- |
| nexus-engine | `http://127.0.0.1:3002` |
| mock-target-service | `http://127.0.0.1:3003` |

When the services move (Azure, Docker Compose), change these URLs in the three HTTP Request nodes
after importing, for example to `http://nexus-engine:3002`.

## Import into a fresh n8n

1. In n8n: **Workflows > ⋯ > Import from File**, pick `shipments-workflow.json`.
2. Check the three HTTP Request URLs (above).
3. **Publish** the workflow, so the production webhook URL is live.
4. Point the gateway's `N8N_WEBHOOK_URL` at `http(s)://<n8n host>/webhook/ai/webhook/shipment/`.

## Keeping it current

After changing the workflow in n8n, download it again over this file and commit.
