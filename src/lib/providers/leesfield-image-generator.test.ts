import { describe, expect, it, vi } from "vitest";
import { generateImageBytes } from "@/lib/providers/leesfield-image-generator";

describe("leesfield-image-generator", () => {
  it("polls until result URL and downloads bytes", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();

      if (url.endsWith("/api/external/image-generation")) {
        return new Response(
          JSON.stringify({ requestId: "req-1", status: "processing", progress: 0 }),
          {
            status: 200,
            headers: { "content-type": "application/json" },
          },
        );
      }

      if (url.endsWith("/api/external/image-generation/req-1")) {
        return new Response(
          JSON.stringify({
            requestId: "req-1",
            status: "pending",
            progress: 100,
            result: { images: [{ url: "https://img.example/a", width: 1024, height: 1024 }] },
            errorMessage: "OK",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url === "https://img.example/a") {
        return new Response(new Uint8Array([9, 8, 7]), {
          status: 200,
          headers: { "content-type": "image/webp" },
        });
      }

      return new Response("unexpected", { status: 500 });
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("LEESFIELD_API_KEY", "key");
    vi.stubEnv("LEESFIELD_IMAGE_MODEL", "z-image-turbo");

    const result = await generateImageBytes(
      { prompt: "hello", width: 1024, height: 1024, steps: 9, imageCount: 1 },
      { timeoutMs: 5000, pollIntervalMs: 1 },
    );

    expect(result.requestId).toBe("req-1");
    expect(result.contentType).toBe("image/webp");
    expect(Array.from(result.bytes)).toEqual([9, 8, 7]);
    expect(result.sourceUrl).toBe("https://img.example/a");
  });
});
