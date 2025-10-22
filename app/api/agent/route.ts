import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Msg = { role: 'user' | 'assistant'; content: string };

async function tryCall(url: string, apiKey: string, body: any, projectId?: string) {
  const headers: Record<string,string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'OpenAI-Beta': 'workflows=v1'
  };
  if (projectId) headers['OpenAI-Project'] = projectId;

  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await r.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch { /* leave as text */ }
  return { ok: r.ok, status: r.status, json, text };
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    const workflowId = process.env.OPENAI_WORKFLOW_ID;
    const projectId = process.env.OPENAI_PROJECT_ID || undefined;

    if (!apiKey || !workflowId) {
      return new Response(JSON.stringify({ error: 'OPENAI_API_KEY oder OPENAI_WORKFLOW_ID fehlt' }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }

    const inputsA = { input:  { messages: messages ?? [] } };
    const inputsB = { inputs: { messages: messages ?? [] } };

    // 1) /v1/workflows/runs  mit input
    let res = await tryCall('https://api.openai.com/v1/workflows/runs', apiKey, { workflow_id: workflowId, ...inputsA }, projectId);
    if (res.ok && !res.json?.error) {
      const text =
        res.json?.output_text ??
        res.json?.output?.text ??
        res.json?.response?.output_text ??
        res.json?.response?.text ??
        JSON.stringify(res.json);
      return new Response(JSON.stringify({ text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 2) /v1/workflows/runs  mit inputs
    res = await tryCall('https://api.openai.com/v1/workflows/runs', apiKey, { workflow_id: workflowId, ...inputsB }, projectId);
    if (res.ok && !res.json?.error) {
      const text =
        res.json?.output_text ??
        res.json?.output?.text ??
        res.json?.response?.output_text ??
        res.json?.response?.text ??
        JSON.stringify(res.json);
      return new Response(JSON.stringify({ text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 3) /v1/workflows/{id}/runs  mit input
    res = await tryCall(`https://api.openai.com/v1/workflows/${encodeURIComponent(workflowId)}/runs`, apiKey, inputsA, projectId);
    if (res.ok && !res.json?.error) {
      const text =
        res.json?.output_text ??
        res.json?.output?.text ??
        res.json?.response?.output_text ??
        res.json?.response?.text ??
        JSON.stringify(res.json);
      return new Response(JSON.stringify({ text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // 4) /v1/workflows/{id}/runs  mit inputs
    res = await tryCall(`https://api.openai.com/v1/workflows/${encodeURIComponent(workflowId)}/runs`, apiKey, inputsB, projectId);
    if (res.ok && !res.json?.error) {
      const text =
        res.json?.output_text ??
        res.json?.output?.text ??
        res.json?.response?.output_text ??
        res.json?.response?.text ??
        JSON.stringify(res.json);
      return new Response(JSON.stringify({ text }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Wenn alles fehlschlägt: bestes Fehlersignal zurückgeben
    const best = res.json?.error?.message || res.text || 'Unknown error';
    return new Response(JSON.stringify({ error: `OpenAI Workflows error: ${best}`, detail: res.json ?? res.text, status: res.status }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Unknown error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
