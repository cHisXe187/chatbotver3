export const runtime = 'nodejs';
export async function GET() {
  return new Response(JSON.stringify({
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY ? 'present' : 'missing',
    OPENAI_WORKFLOW_ID: !!process.env.OPENAI_WORKFLOW_ID ? 'present' : 'missing',
    OPENAI_PROJECT_ID: !!process.env.OPENAI_PROJECT_ID ? 'present' : 'absent'
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
