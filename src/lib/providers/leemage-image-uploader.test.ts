import { describe, expect, it, vi } from "vitest";
import { uploadImageToLeemage } from "@/lib/providers/leemage-image-uploader";

describe("leemage-image-uploader", () => {
  it("uploads via presign -> put -> confirm", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = input.toString();

      if (url.includes("/files/presign")) {
        return new Response(
          JSON.stringify({
            fileId: "file-1",
            presignedUrl: "https://oci.example.com/presigned",
            objectName: "object-1",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      if (url === "https://oci.example.com/presigned") {
        expect(init?.method).toBe("PUT");
        return new Response("", { status: 200 });
      }

      if (url.includes("/files/confirm")) {
        return new Response(
          JSON.stringify({
            id: "file-1",
            url: "https://cdn.example.com/original.jpg",
            variants: [{ sizeLabel: "max800", url: "https://cdn.example.com/max800.webp" }],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      return new Response("unexpected", { status: 500 });
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("LEEMAGE_API_KEY", "key");

    const result = await uploadImageToLeemage({
      projectId: "project-1",
      data: new Uint8Array([1, 2, 3]),
      fileName: "a.webp",
      contentType: "image/webp",
      variants: [{ sizeLabel: "max800", format: "webp" }],
    });

    expect(result.fileId).toBe("file-1");
    expect(result.url).toBe("https://cdn.example.com/max800.webp");
    expect(fetchMock).toHaveBeenCalled();
  });
});
