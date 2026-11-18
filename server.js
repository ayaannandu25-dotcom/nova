
const http = require("node:http");

const PORT = Number(process.env.PORT || 8080);
const ALLOWED_HOST = "example.com";

http.createServer(async (req, res) => {
  const requestURL = new URL(req.url, "http://localhost");

  if (requestURL.pathname === "/") {
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8"
    });
    return res.end(`
      <h1>My AWS Proxy</h1>
      <form action="/proxy">
        <input name="path" value="/" />
        <button>Load page</button>
      </form>
    `);
  }

  if (requestURL.pathname !== "/proxy") {
    res.writeHead(404);
    return res.end("Not found");
  }

  const path = requestURL.searchParams.get("path") || "/";

  if (!path.startsWith("/") || path.startsWith("//")) {
    res.writeHead(400);
    return res.end("Invalid path");
  }

  try {
    const upstream = new URL(path, `https://${ALLOWED_HOST}`);

    const response = await fetch(upstream, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000)
    });

    const type = response.headers.get("content-type") || "";

    if (!type.toLowerCase().startsWith("text/html")) {
      res.writeHead(415);
      return res.end("Only HTML is supported");
    }

    const html = await response.text();

    res.writeHead(response.status, {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy":
        "sandbox; default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff"
    });

    res.end(html);
  } catch {
    res.writeHead(502);
    res.end("Could not retrieve page");
  }
}).listen(PORT, "0.0.0.0", () => {
  console.log(`Running on port ${PORT}`);
});
