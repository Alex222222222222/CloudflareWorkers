import { unstable_dev } from "wrangler";
import type { UnstableDevWorker } from "wrangler";
import { describe, expect, it, beforeAll, afterAll } from "vitest";

describe("Worker", () => {
	it("should return Hello World", async () => {
		const resp = await fetch('https://view-counter.workers.huazifan.eu.org/site/view\?siteBase\=http%3A%2F%2F127.0.0.1%3A1313%2F\&sitePath\=%2F', {
			method: 'GET',
			headers: {
				'Authorization': 'Basic ' + btoa('blog:asdfghjk'),
				},
				});
		if (resp) {
			const text = await resp.text();
			console.log(text);
		}
	});
});
