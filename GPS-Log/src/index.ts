/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;
  //
  // Example binding to a Service. Learn more at https://developers.cloudflare.com/workers/runtime-apis/service-bindings/
  // MY_SERVICE: Fetcher;

  gps: D1Database;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    // verify the request is a GET
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    // verify the authorization header is present
    if (!request.headers.has("Authorization")) {
      return new Response("Authorization header is required", {
        status: 400,
      });
    }

    // verify the authorization header is a basic auth header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return new Response("Authorization header is required", { status: 400 });
    }
    if (!authHeader.startsWith("Basic ")) {
      return new Response("Authorization header must be a Basic auth header", {
        status: 400,
      });
    }

    // verify the authorization header is a valid base64 string
    const authHeaderBase64 = authHeader.replace("Basic ", "");
    const authHeaderBytes = atob(authHeaderBase64);
    if (!authHeaderBytes) {
      return new Response(
        "Authorization header must be a valid base64 string",
        { status: 400 }
      );
    }

    // verify the authorization header is a valid username and password
    const authHeaderUsernameAndPassword = authHeaderBytes.split(":");
    if (authHeaderUsernameAndPassword.length !== 2) {
      return new Response(
        "Authorization header must be a valid username and password",
        { status: 400 }
      );
    }

    // verify the username and password are valid from the database
    const username = authHeaderUsernameAndPassword[0];
    const password = authHeaderUsernameAndPassword[1];
    const { results } = await env.gps
      .prepare("SELECT * FROM Users WHERE Username = ? AND Password = ?")
      .bind(username, password)
      .all();
    // if the username and password are not valid, return a 401
    if (!results || results.length === 0) {
      return new Response("Unauthorized", { status: 401 });
    }

    const url = new URL(request.url);

    // try get path from url
    const path = url.pathname;
    if (path !== "/log") {
      return new Response("Path not found", { status: 404 });
    }

    // try get the data from the url
    const lat = url.searchParams.get("lat");
    const longitude = url.searchParams.get("longitude");
    const time = url.searchParams.get("time");
    const s = url.searchParams.get("s");
    // test if the data is valid
    if (!lat || !longitude || !time || !s) {
      return new Response("Request body is invalid", { status: 400 });
    }

    // try to insert the location into the database
    const { results: results_1 } = await env.gps
      .prepare(
        "INSERT INTO GPS (Username, Latitude, Longitude, Time, SPD) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(username, lat, longitude, time, s)
      .all();

    if (!results_1) {
      return new Response("Internal Server Error", { status: 500 });
    }

    /*
    // try to parse the body
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      return new Response("Request body is invalid", { status: 404 });
    }

    // verify the request body is valid
    if (!body) {
      return new Response("Request body is invalid", { status: 400 });
    }

    // verify the request body is a valid JSON string
    let bodyJSON;
    try {
      bodyJSON = JSON.parse(body);
    } catch (e) {
      return new Response("Request body must be a valid JSON string", {
        status: 400,
      });
    }

	// verify the request body is a valid JSON object
	if (!bodyJSON || typeof bodyJSON !== "object") {
		return new Response("Request body is invalid", { status: 400 });
	}

	// verify the request body has valid fields
	if (!bodyJSON.hasOwnProperty("lat") || !bodyJSON.hasOwnProperty("longitude") || !bodyJSON.hasOwnProperty("time") || !bodyJSON.hasOwnProperty("s")) {
		return new Response("Request body is invalid", { status: 400 });
	}

	// get the fields from the request body
	const lat = bodyJSON.lat;
	const longitude = bodyJSON.longitude;
	const time = bodyJSON.time;
	const s = bodyJSON.s;
	*/

    return new Response("Hello World!");
  },
};
