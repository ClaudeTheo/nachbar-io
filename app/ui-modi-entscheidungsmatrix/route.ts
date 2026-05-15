import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const nonce = request.headers.get("x-nonce") ?? "";
  const publicDir = path.join(process.cwd(), "public");
  const [html, script] = await Promise.all([
    readFile(path.join(publicDir, "ui-modi-entscheidungsmatrix.html"), "utf8"),
    readFile(path.join(publicDir, "ui-modi-entscheidungsmatrix.js"), "utf8"),
  ]);

  const scriptTag = `<script nonce="${nonce}">\n${script}\n</script>`;
  const body = html.replace(
    '<script src="/ui-modi-entscheidungsmatrix.js" defer></script>',
    scriptTag,
  );

  return new Response(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
