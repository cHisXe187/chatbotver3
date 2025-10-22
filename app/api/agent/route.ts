import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Msg = { role: "user" | "assistant"; content: string };

function messagesToText(messages: Msg[] = []): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (lastUser?.content) return lastUser.content;
  return messages.map((m) => `${m.role}: ${m.content}`).join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: Msg[] } = await req.json();

    const apiKey = process.env.OPENAI_API_KEY;
    const workflowId = process.env.OPENAI_WORKFLOW_ID;
    if (!apiKey || !workflowId) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY oder OPENAI_WORKFLOW_ID fehlt" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const inputText = messagesToText(messages ?? []);

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "workflows=v1",
      },
      body: JSON.stringify({
        workflow: { id: workflowId }, // Agent-Builder Workflow ausführen
        input: inputText,              // einfacher String-Input
      }),
    });

    const raw = await r.text();
    let json: any = null;
    try { json = JSON.parse(raw); } catch {}

    if (!r.ok) {
      const msg = json?.error?.message || raw || `HTTP ${r.status}`;
      return new Response(JSON.stringify({ error: msg }), {
        status: 502, headers: { "Content-Type": "application/json" },
      });
    }

    const text =
      json?.output_text ??
      json?.output?.text ??
      json?.response?.output_text ??
      json?.response?.text ??
      json?.output?.[0]?.content?.[0]?.text?.value ??
      JSON.stringify(json);

    return new Response(JSON.stringify({ text }), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
}
