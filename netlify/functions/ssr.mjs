import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";

let serverEntrypointPromise;

async function getServerEntrypoint() {
  if (!serverEntrypointPromise) {
    const moduleUrl = pathToFileURL(`${process.cwd()}/dist/server/index.js`).href;
    serverEntrypointPromise = import(moduleUrl).then((mod) => mod.default ?? mod);
  }
  return serverEntrypointPromise;
}

function buildRequest(event) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers ?? {})) {
    if (value != null) headers.set(key, value);
  }

  const hasBody = event.body != null && event.body !== "";
  const body = hasBody
    ? event.isBase64Encoded
      ? Buffer.from(event.body, "base64")
      : event.body
    : undefined;

  return new Request(event.rawUrl, {
    method: event.httpMethod,
    headers,
    body,
  });
}

function splitHeaders(response) {
  const headers = {};
  let multiValueHeaders;

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      multiValueHeaders ??= {};
      multiValueHeaders[key] = response.headers.getSetCookie();
      return;
    }
    headers[key] = value;
  });

  return { headers, multiValueHeaders };
}

async function toNetlifyResponse(response) {
  const arrayBuffer = await response.arrayBuffer();
  const bodyBuffer = Buffer.from(arrayBuffer);
  const { headers, multiValueHeaders } = splitHeaders(response);

  return {
    statusCode: response.status,
    headers,
    multiValueHeaders,
    body: bodyBuffer.toString("base64"),
    isBase64Encoded: true,
  };
}

export async function handler(event) {
  const server = await getServerEntrypoint();
  const request = buildRequest(event);
  const response = await server.fetch(request, {}, {});
  return toNetlifyResponse(response);
}
