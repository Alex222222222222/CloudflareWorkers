import { unstable_dev } from "wrangler";
import type { UnstableDevWorker } from "wrangler";
import { describe, expect, it, beforeAll, afterAll } from "vitest";

const baseUrl = "https://sms-log.huazifan.workers.dev"

describe("Base Worker", () => {
	let worker: UnstableDevWorker;

	beforeAll(async () => {
		worker = await unstable_dev("src/index.ts", {
			experimental: { disableExperimentalWarning: true },
		});
	});

	afterAll(async () => {
		await worker.stop();
	});

	it("should return Hello World", async () => {
		const resp = await worker.fetch();
		if (resp) {
			const text = await resp.text();
			expect(text).toMatchInlineSnapshot(`"Hello World!"`);
		}
	});
});

describe("sms-log Worker", () => {
	let worker: UnstableDevWorker;

	beforeAll(async () => {
		worker = await unstable_dev("src/sms-log.ts", {
			experimental: { disableExperimentalWarning: true },
		});
	});

	afterAll(async () => {
		await worker.stop();
	});

    it("should return Logged", async () => {
        const resp = await worker.fetch(undefined,{
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "SMS Forwarder App"
            },
            body: JSON.stringify({
                from: "1234567890",
                text: "Hello World!",
                sentStamp: "2021-08-01T00:00:00.000Z",
                receiveStamp: "2021-08-01T00:00:00.000Z",
                sim: "1234567890"
            })
        });

        if (resp) {
            const text = await resp.text();
            expect(text).toMatchInlineSnapshot(`"Logged"`);
        }
    });
});

describe("Base URL", () => {
	// fetch the base url
	it("should return Hello World", async () => {
		const resp = await fetch(baseUrl);
		if (resp) {
			const text = await resp.text();
			expect(text).toMatchInlineSnapshot(`"Hello World!"`);
		}
	});
});

describe("sms-log url", () => {
	// fetch the sms-log url
    it("should return Logged", async () => {
        const resp = await fetch(baseUrl + "/sms-log",{
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "User-Agent": "SMS Forwarder App"
            },
            body: JSON.stringify({
                from: "1234567890",
                text: "Hello World!",
                sentStamp: "2021-08-01T00:00:00.000Z",
                receiveStamp: "2021-08-01T00:00:00.000Z",
                sim: "1234567890"
            })
        });

        if (resp) {
            const text = await resp.text();
            expect(text).toMatchInlineSnapshot(`"Logged"`);
        }
    });
});