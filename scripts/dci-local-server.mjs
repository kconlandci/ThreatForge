// Local-only HTTP harness for the same handlers used by a serverless runtime.
// No request bodies, headers, credentials, or access codes are logged.
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import signin from "../api/dci/signin.js";
import progress from "../api/dci/progress.js";

export async function startDciLocalServer({ port = 0 } = {}) {
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, "http://127.0.0.1").pathname;
      const handler = pathname === "/api/dci/signin" ? signin
        : pathname === "/api/dci/progress" ? progress : null;
      if (!handler) {
        response.writeHead(404).end();
        return;
      }
      await handler(request, response);
    } catch {
      if (!response.headersSent) response.writeHead(500);
      response.end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  const address = server.address();
  return {
    url: `http://127.0.0.1:${address.port}/api/dci`,
    close: () => new Promise((resolve, reject) => {
      server.closeAllConnections();
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.loadEnvFile(new URL("../.env.local", import.meta.url));
  const local = await startDciLocalServer({ port: 8787 });
  console.log(`DCI local harness listening at ${local.url}`);
}
