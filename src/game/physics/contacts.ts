/* 접촉 추적 — 같은 레벨끼리 일정 시간 맞닿아 있어야 합체 (스치는 접촉은 무시).
   바디 삭제 시 역인덱스로 해당 접촉만 정리 (합체·폭발마다 전체 스캔하지 않음). */

export interface ContactBody {
  id: number;
}

export interface Contact<T> {
  a: T;
  b: T;
  t: number;
}

export class ContactTracker<T extends ContactBody> {
  private time = new Map<string, Contact<T>>();
  private byBody = new Map<number, Set<string>>();
  private seen = new Set<string>();

  static key(aId: number, bId: number): string {
    return aId < bId ? `${aId}:${bId}` : `${bId}:${aId}`;
  }

  get size(): number {
    return this.time.size;
  }

  touch(a: T, b: T, dt: number): void {
    const key = ContactTracker.key(a.id, b.id);
    const prev = this.time.get(key);
    if (!prev) {
      this.time.set(key, { a, b, t: dt });
      this.link(a.id, key);
      this.link(b.id, key);
    } else {
      prev.a = a;
      prev.b = b;
      prev.t += dt;
    }
    this.seen.add(key);
  }

  /** 이번 프레임에 목격되지 않은 접촉을 버리고, 합체 조건을 만족한 목록을 반환 */
  due(need: number): Contact<T>[] {
    for (const key of [...this.time.keys()]) {
      if (!this.seen.has(key)) this.delete(key);
    }
    this.seen.clear();
    const out: Contact<T>[] = [];
    for (const c of this.time.values()) {
      if (c.t >= need) out.push(c);
    }
    return out;
  }

  removeBody(body: ContactBody): void {
    const keys = this.byBody.get(body.id);
    if (!keys) return;
    for (const key of [...keys]) this.delete(key);
  }

  clear(): void {
    this.time.clear();
    this.byBody.clear();
    this.seen.clear();
  }

  private link(id: number, key: string): void {
    let set = this.byBody.get(id);
    if (!set) {
      set = new Set();
      this.byBody.set(id, set);
    }
    set.add(key);
  }

  private delete(key: string): void {
    const c = this.time.get(key);
    if (!c) return;
    this.time.delete(key);
    this.unlink(c.a.id, key);
    this.unlink(c.b.id, key);
  }

  private unlink(id: number, key: string): void {
    const set = this.byBody.get(id);
    if (!set) return;
    set.delete(key);
    if (set.size === 0) this.byBody.delete(id);
  }
}
