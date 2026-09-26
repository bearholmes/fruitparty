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
  const { name, score, maxCombo, submissionId } = payload as { name?: unknown; score?: unknown; maxCombo?: unknown; submissionId?: unknown };
  const trimmed = typeof name === 'string' ? name.trim() : '';
  const combo = maxCombo === undefined ? null : maxCombo;
  if (!trimmed || Array.from(trimmed).length > 8 || !Number.isSafeInteger(score) || Number(score) <= 0 ||
    (combo !== null && (!Number.isSafeInteger(combo) || Number(combo) < 0)) ||
    typeof submissionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(submissionId)) {
    return Response.json({ error: '이름 또는 점수가 올바르지 않습니다.' }, { status: 400 });
  }
  try {
    const entries = await addScore(trimmed, Number(score), combo as number | null, submissionId);
    if (!entries) return Response.json({ error: '베스트 20 순위에 들지 못했습니다.' }, { status: 409 });
    return Response.json({ entries }, { status: 201 });
  } catch (error) {
    console.error('Leaderboard write failed', error);
    return Response.json({ error: '점수를 저장하지 못했습니다.' }, { status: 500 });
  }
}
