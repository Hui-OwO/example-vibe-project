import { describe, it, expect, vi, afterEach } from "vitest";
import { logger } from "@/lib/logger";

describe("lib/logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("info는 console.log로 JSON 한 줄을 출력한다", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info({ module: "test", event: "ping" });

    expect(spy).toHaveBeenCalledOnce();
    const payload = JSON.parse(spy.mock.calls[0][0] as string);
    expect(payload).toMatchObject({
      level: "info",
      module: "test",
      event: "ping",
    });
    expect(payload.ts).toBeTypeOf("string");
  });

  it("warn은 console.warn으로 보낸다", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn({ module: "test", event: "slow" });
    expect(spy).toHaveBeenCalledOnce();
  });

  it("error는 console.error로 보낸다", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error({ module: "test", event: "boom" });
    expect(spy).toHaveBeenCalledOnce();
  });
});
