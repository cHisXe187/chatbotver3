import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const apiKey = process.env.OPENAI_API_KEY;
    const workflowId = process.env.OPENAI_WORKFLOW_ID;

    if (!apiKey || !workflowId)
      return new Response(JSON.stringify({ error: 'API-Keys fehlen' }), { status: 500 });

    const r = await fetch('https://api.openai.com/v1/workflows/runs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'workflows=v1'
      },
      body: JSON.stringify({
        workflow_id: workflowId,
        input: { messages }
      })
    });

    const data = await r.json();
    const text =
      data?.output_text ??
      data?.output?.text ??
      data?.response?.text ??
      JSON.stringify(data);

    return new Response(JSON.stringify({ text }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
