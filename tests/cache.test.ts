import { describe, it, expect } from "vitest";
import { cached, invalidate } from "@/lib/cache";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("cache", () => {
  it("coalesces concurrent misses into a single fetch (single-flight)", async () => {
    invalidate("t1");
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      await sleep(30);
      return "v";
    };
    const [a, b, c] = await Promise.all([
      cached("t1", 1000, fetcher),
      cached("t1", 1000, fetcher),
      cached("t1", 1000, fetcher),
    ]);
    expect(calls).toBe(1);
    expect(a.value).toBe("v");
    expect(b.stale).toBe(false);
    expect(c.value).toBe("v");
  });

  it("serves the last good value stale on error", async () => {
    invalidate("t2");
    await cached("t2", 10, async () => "good");
    await sleep(20); // let it expire
    const res = await cached("t2", 10, async () => {
      throw new Error("upstream down");
    });
    expect(res.value).toBe("good");
    expect(res.stale).toBe(true);
  });

  it("throws when there is no prior value and the fetch fails", async () => {
    invalidate("t3");
    await expect(cached("t3", 1000, async () => {
      throw new Error("boom");
    })).rejects.toThrow("boom");
  });
});
