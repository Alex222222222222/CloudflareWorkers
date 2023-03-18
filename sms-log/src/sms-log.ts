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

	sms: D1Database;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext
	): Promise<Response> {

		// test the user agent
		const ua = request.headers.get("User-Agent");
		if (!(ua && ua.includes("SMS Forwarder App"))) {
			return new Response("Not Found", { status: 404 });
		}

		// test if the type is json
		const contentType = request.headers.get("Content-Type");
		if (!(contentType && contentType.includes("application/json"))) {
			return new Response("Not Found", { status: 404 });
		}

		// try to parse the body
		let body: any;
		try {
			body = await request.json();
		} catch (e) {
			return new Response("Not Found", { status: 404 });
		}

		// test if the body is valid
		if (!body) {
			return new Response("Not Found", { status: 404 });
		}

		// test if the body has the required fields
		if (!body.from || !body.text || !body.sentStamp || !body.receiveStamp || !body.sim) {
			return new Response("Not Found", { status: 404 });
		}

		// insert into database
		const { results } = await env.sms.prepare(
			"INSERT INTO sms (from_number, text, sentStamp, receiveStamp, sim) VALUES (?, ?, ?, ?, ?)"
		  )
			.bind(body.from, body.text, body.sentStamp, body.receiveStamp, body.sim)
			.all();
		
		// test result valid
		if (!results) {
			return new Response("Insert failed", { status: 404 });
		}

		return new Response("Logged");
	},
};
