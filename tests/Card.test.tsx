import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Card } from "@/components/Card";

afterEach(() => cleanup());

describe("components/Card", () => {
  it("title과 description을 렌더한다", () => {
    render(<Card href="/x" title="에이전트 루프" description="루프 설명" />);

    expect(screen.getByText("에이전트 루프")).toBeDefined();
    expect(screen.getByText("루프 설명")).toBeDefined();
  });

  it("href를 링크에 연결한다", () => {
    render(<Card href="/agent-loop" title="t" description="d" />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/agent-loop");
  });

  it("badge가 있으면 배지를 렌더한다", () => {
    render(<Card href="/x" title="t" description="d" badge="NEW" />);
    expect(screen.getByText("NEW")).toBeDefined();
  });

  it("badge가 없으면 배지를 렌더하지 않는다", () => {
    render(<Card href="/x" title="t" description="d" />);
    expect(screen.queryByText("NEW")).toBeNull();
  });
});
