import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Msg = { role: 'user' | 'assistant'; content: string };

async function tryCall(
  url: string,
  apiKey: string,
  body: unknown,
  projectId?: string
) {
  const headers: Record<string,string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'workflows=v1'
  };
  if (projectId) headers['OpenAI-Project'] = projectId;

  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const raw = await r.text();
  let json: any = null;
  try { json = JSON.parse(raw); } catch {}
  return { ok: r.ok, status: r.status, url, raw, json };
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    const workflowId = process.env.OPENAI_WORKFLOW_ID;
    const projectId = process.env.OPENAI_PROJECT_ID || undefined;

    if (!apiKey || !workflowId) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY oder OPENAI_WORKFLOW_ID fehlt' }), { status: 500 });
    }

    const tries: any[] = [];

    // A) /v1/workflows/runs  + input
    tries.push(await tryCall('https://api.openai.com/v1/workflows/runs', apiKey, {
      workflow_id: workflowId, input: { messages: messages ?? [] }
    }, projectId));

    // B) /v1/workflows/runs  + inputs
    if (!tries.at(-1).ok) {
      tries.push(await tryCall('https://api.openai.com/v1/workflows/runs', apiKey, {
        workflow_id: workflowId, inputs: { messages: messages ?? [] }
      }, projectId));
    }

    // C) /v1/workflows/{id}/runs + input
    if (!tries.at(-1).ok) {
      tries.push(await tryCall(`https://api.openai.com/v1/workflows/${encodeURIComponent(workflowId)}/runs`,
        apiKey, { input: { messages: messages ?? [] } }, projectId));
    }

    // D) /v1/workflows/{id}/runs + inputs
    if (!tries.at(-1).ok) {
      tries.push(await tryCall(`https://api.openai.com/v1/workflows/${encodeURIComponent(workflowId)}/runs`,
        apiKey, { inputs: { messages: messages ?? [] } }, projectId));
    }

    const success = tries.find(t => t.ok && !t.json?.error);
    if (success) {
      const text =
        success.json?.output_text ??
        success.json?.output?.text ??
        success.json?.response?.output_text ??
        success.json?.response?.text ??
        JSON.stringify(success.json);
      return new Response(JSON.stringify({ text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // kein Erfolg → beste Fehlermeldung zurückgeben
    const last = tries.at(-1);
    const bestMsg = last?.json?.error?.message || last?.raw || 'Unknown error';
    return new Response(JSON.stringify({
      error: `OpenAI Workflows error: ${bestMsg}`,
      tried: tries.map(t => ({ url: t.url, status: t.status, ok: t.ok }))
    }), { status: 502, headers: { 'Content-Type': 'application/json' } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), { status: 500 });
  }
}
