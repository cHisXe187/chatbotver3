import { NextRequest } from "next/server";
import OpenAI from "openai";

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
    if (!apiKey) {
      return Response.json({ error: "OPENAI_API_KEY fehlt" }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });
    const inputText = messagesToText(messages ?? []);

    // Direkter Responses-Call mit Modell (funktioniert immer)
    const resp = await client.responses.create({
      model: "gpt-4.1-mini",
      input: inputText,
    });

    // robuste Extraktion
    // @ts-ignore
    const text =
      // @ts-ignore
      resp.output_text ??
      // @ts-ignore
      resp.output?.[0]?.content?.[0]?.text?.value ??
      JSON.stringify(resp);

    return Response.json({ text });
  } catch (e: any) {
    return Response.json({ error: e?.message || String(e) }, { status: 500 });
  }
}
