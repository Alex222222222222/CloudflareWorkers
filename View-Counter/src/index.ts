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
  view: D1Database;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

async function handleOptions(request: Request) {
  if (
    request.headers.get("Origin") !== null &&
    request.headers.get("Access-Control-Request-Method") !== null &&
    request.headers.get("Access-Control-Request-Headers") !== null
  ) {
    // Handle CORS preflight requests.
    let headers = {
      ...corsHeaders,
      "Access-Control-Allow-Headers": "",
    };
    let acrh = request.headers.get("Access-Control-Request-Headers");
    if (acrh) {
      headers["Access-Control-Allow-Headers"] = acrh;
    }
    return new Response(null, {
      headers: headers,
    });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: "GET, HEAD, POST, OPTIONS",
      },
    });
  }
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    if (request.method === "OPTIONS") {
      // Handle CORS preflight requests
      return handleOptions(request);
    }

    // deny all POST requests
    if (request.method === "POST") {
      return new Response("Not allowed", {
        status: 405,
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // use basic auth from headers
    const auth = request.headers.get("Authorization");
    if (!auth) {
      return new Response("Unauthorized", {
        status: 401,
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Access-Control-Max-Age": "86400",
        },
      });
    }
    const is_auth = await basic_auth(env, auth);
    if (!is_auth) {
      return new Response("Unauthorized", {
        status: 401,
        headers: {
          "content-type": "application/json;charset=UTF-8",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // get the path from the request
    const path = new URL(request.url).pathname;
    switch (path) {
      case "/site/view": {
        return await handleRequestSitePathView(request, env, ctx);
      }
    }

    // return 404 not found
    return new Response("Not found", {
      status: 404,
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
    });
  },
};

async function basic_auth(env: Env, auth: string): Promise<boolean> {
  // the basic auth is in the format of "Basic <base64 encoded string>"
  // so we need to decode the base64 string

  // test if auth contains "Basic "
  if (!auth.startsWith("Basic ")) {
    return false;
  }

  // remove "Basic " from the string
  auth = auth.substring(6);

  // decode the base64 string
  auth = atob(auth);

  // split the string into username and password
  const auth_split = auth.split(":");
  if (auth_split.length != 2) {
    return false;
  }

  // get the username and password
  const username = auth_split[0];
  const password = auth_split[1];

  // get the password from the database
  const { results } = await env.view
    .prepare("SELECT * FROM Users WHERE Username = ? AND Password = ? LIMIT 1")
    .bind(username, password)
    .all();

  if (!results) {
    return false;
  }

  if (results.length != 1) {
    return false;
  }

  return true;
}

async function handleRequestSitePathView(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const siteBase = url.searchParams.get("siteBase");
  const sitePath = url.searchParams.get("sitePath");

  if (!siteBase || !sitePath) {
    return new Response("Missing siteBase or sitePath", { status: 400 });
  }

  const site_view_all = await getAllViewFromDatabase(env, siteBase, sitePath);
  const site_base_view_all = await getAllBaseViewFromDatabase(env, siteBase);
  const site_1h_view = await getTimeViewFromDatabase(
    env,
    siteBase,
    sitePath,
    3600
  );
  const site_1d_view = await getTimeViewFromDatabase(
    env,
    siteBase,
    sitePath,
    86400
  );
  const site_1w_view = await getTimeViewFromDatabase(
    env,
    siteBase,
    sitePath,
    604800
  );
  const site_1m_view = await getTimeViewFromDatabase(
    env,
    siteBase,
    sitePath,
    2592000
  );

  // add the view to the database
  await env.view
    .prepare("INSERT INTO views (BaseURL, Path, Time) VALUES (?, ?, ?)")
    .bind(siteBase, sitePath, Math.floor(Date.now() / 1000))
    .run();

  return new Response(
    JSON.stringify({
      site_view_all: site_view_all,
      site_base_view_all: site_base_view_all,
      site_1h_view: site_1h_view,
      site_1d_view: site_1d_view,
      site_1w_view: site_1w_view,
      site_1m_view: site_1m_view,
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        "Access-Control-Max-Age": "86400",
      },
    }
  );
}

async function getAllViewFromDatabase(
  env: Env,
  siteBase: String,
  sitePath: String
): Promise<number> {
  const { results } = await env.view
    .prepare("SELECT COUNT(*) AS Num FROM views WHERE BaseURL = ? AND Path = ?")
    .bind(siteBase, sitePath)
    .all();

  if (!results) {
    return 0;
  }

  let res = JSON.parse(JSON.stringify(results));
  return res[0].Num;
}

async function getTimeViewFromDatabase(
  env: Env,
  siteBase: String,
  sitePath: String,
  time: number
): Promise<number> {
  // get the current timestamp in seconds
  const time_now = Math.floor(Date.now() / 1000);
  time = time_now - time;

  const { results } = await env.view
    .prepare(
      "SELECT COUNT(*) AS Num FROM views WHERE BaseURL = ? AND Path = ? AND Time > ?"
    )
    .bind(siteBase, sitePath, time)
    .all();

  if (!results) {
    return 0;
  }

  let res = JSON.parse(JSON.stringify(results));
  return res[0].Num;
}

async function getAllBaseViewFromDatabase(
  env: Env,
  siteBase: String
): Promise<number> {
  const { results } = await env.view
    .prepare("SELECT COUNT(*) AS Num FROM views WHERE BaseURL = ?")
    .bind(siteBase)
    .all();

  if (!results) {
    return 0;
  }

  let res = JSON.parse(JSON.stringify(results));
  return res[0].Num;
}
