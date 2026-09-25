import { addScore, top20 } from '../../../db/leaderboard';

export async function GET() {
  try {
    return Response.json({ entries: await top20() });
  } catch (error) {
    console.error('Leaderboard read failed', error);
    return Response.json({ error: '순위표를 불러오지 못했습니다.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: '잘못된 요청입니다.' }, { status: 400 });
  }
  const { name, score } = payload as { name?: unknown; score?: unknown };
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed || Array.from(trimmed).length > 5 || !Number.isSafeInteger(score) || Number(score) <= 0) {
    return Response.json({ error: '이름 또는 점수가 올바르지 않습니다.' }, { status: 400 });
  }
  try {
    const entries = await addScore(trimmed, Number(score));
    if (!entries) return Response.json({ error: '베스트 20 순위에 들지 못했습니다.' }, { status: 409 });
    return Response.json({ entries }, { status: 201 });
  } catch (error) {
    console.error('Leaderboard write failed', error);
    return Response.json({ error: '점수를 저장하지 못했습니다.' }, { status: 500 });
  }
}
