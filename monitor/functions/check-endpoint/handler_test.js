import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PutEventsCommand } from "@aws-sdk/client-eventbridge";
import { checkEndpoint } from "./handler.js"
import { MockAgent } from 'undici';
import { use } from "../../common/fixtures.js";
import { throwsAsync } from '../../common/assert.js'
import { UnexpectedRedirectLocationError, UnexpectedHttpStatusError, serializeError } from "../../common/errors.js";

const assertEventBridgePayload = function (events, expected) {

    const calls = events.calls(PutEventsCommand);
    assert.equal(calls.length, 1);

    const actual = JSON.parse(calls[0].args[0].input.Entries[0].Detail);

    expected = {
        id: /[0-9a-f-]+/, // is a GUID
        timestamp: /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z)/, // is an ISO 8601 timestamp
        duration: /\d+.\d+/, // is a floating point
        endpoint: "test",
        error: null,
        ...expected,
    }

    assert.match(actual.id, expected.id);
    assert.match(actual.timestamp, expected.timestamp);
    assert.equal(actual.endpoint, expected.endpoint);
    assert.equal(actual.url, expected.url);
    assert.equal(actual.status, expected.status);
    assert.deepStrictEqual(actual.headers, expected.headers);
    assert.deepStrictEqual(actual.traversal, expected.traversal);
    assert.equal(actual.type, expected.type);
    assert.deepStrictEqual(actual.error, expected.error);
    assert.equal(actual.available, expected.available);
}

describe('monitor - checkEndpoint', () => {

    const events = use('events');

    it('should check hosting endpoint, following redirects, and send result to EventBridge', async () => {

        const service = {
            type: "enclosure",
            endpoint: "test",
            url: "https://poduptime.com/test.mp3"
        };

        await checkEndpoint({ Records: [{ body: JSON.stringify(service) }] }, {
            agentFactory: (options) => {

                const mockAgent = new MockAgent(options);
                mockAgent.disableNetConnect();

                mockAgent.get("https://poduptime.com").intercept({ path: "/test.mp3", method: 'HEAD' }).reply(302, {}, {
                    headers: { location: "https://poduptime.com/test-redirect.mp3" }
                });

                mockAgent.get("https://poduptime.com").intercept({ path: "/test-redirect.mp3", method: 'HEAD' }).reply(200, {}, {
                    headers: { "x-test": "value" }
                });

                return mockAgent;
            }
        });

        assertEventBridgePayload(events, {
            url: "https://poduptime.com/test.mp3",
            status: 200,
            headers: { "x-test": "value" },
            // Mocked agent doesn't provide context.history, so we cannot really check this is correct
            traversal: ["https://poduptime.com/test.mp3"],
            available: 1,
            type: "enclosure"
        });
    });

    it('should mark unavailable an enclosure responding with wrong http status', async () => {

        const service = {
            type: "enclosure",
            endpoint: "test",
            url: "https://poduptime.com/test.mp3"
        };

        await checkEndpoint({ Records: [{ body: JSON.stringify(service) }] }, {
            agentFactory: (options) => {

                const mockAgent = new MockAgent(options);
                mockAgent.disableNetConnect();

                mockAgent.get("https://poduptime.com").intercept({ path: "/test.mp3", method: 'HEAD' }).reply(404);

                return mockAgent;
            }
        });

        assertEventBridgePayload(events, {
            url: "https://poduptime.com/test.mp3",
            status: 404,
            headers: {},
            traversal: ["https://poduptime.com/test.mp3"],
            available: 0,
            type: "enclosure",
            error: serializeError(new UnexpectedHttpStatusError(404))
        });
    });

    it('should check prefix endpoint, not following redirects, and send result to EventBridge', async () => {

        const service = {
            type: "prefix",
            endpoint: "test",
            url: "https://prefix.com/poduptime.com/test.mp3",
            expected_url: "https://poduptime.com/test.mp3"
        };

        await checkEndpoint({ Records: [{ body: JSON.stringify(service) }] }, {
            agentFactory: (options) => {

                const mockAgent = new MockAgent(options);
                mockAgent.disableNetConnect();

                mockAgent.get("https://prefix.com").intercept({ path: "/poduptime.com/test.mp3", method: 'HEAD' }).reply(302, {}, {
                    headers: { location: "https://poduptime.com/test.mp3" }
                });

                mockAgent.get("https://poduptime.com").intercept({ path: "/test.mp3", method: 'HEAD' }).reply(200, {}, {
                    headers: { "x-test": "value" }
                });

                return mockAgent;
            }
        });

        assertEventBridgePayload(events, {
            url: "https://prefix.com/poduptime.com/test.mp3",
            status: 302,
            headers: { location: "https://poduptime.com/test.mp3" },
            traversal: ["https://prefix.com/poduptime.com/test.mp3"],
            available: 1,
            type: "prefix"
        });
    });

    it('should mark unavailable a prefix responding with wrong http status', async () => {

        const service = {
            type: "prefix",
            endpoint: "test",
            url: "https://prefix.com/poduptime.com/test.mp3",
            expected_url: "https://poduptime.com/test.mp3"
        };

        await checkEndpoint({ Records: [{ body: JSON.stringify(service) }] }, {
            agentFactory: (options) => {

                const mockAgent = new MockAgent(options);
                mockAgent.disableNetConnect();

                mockAgent.get("https://prefix.com").intercept({ path: "/poduptime.com/test.mp3", method: 'HEAD' }).reply(200);

                return mockAgent;
            }
        });

        assertEventBridgePayload(events, {
            url: "https://prefix.com/poduptime.com/test.mp3",
            status: 200,
            headers: {},
            traversal: ["https://prefix.com/poduptime.com/test.mp3"],
            available: 0,
            type: "prefix",
            error: serializeError(new UnexpectedHttpStatusError(200))
        });
    });

    it('should mark unavailable a prefix redirecting to the wrong place', async () => {

        const service = {
            type: "prefix",
            endpoint: "test",
            url: "https://prefix.com/poduptime.com/test.mp3",
            expected_url: "https://poduptime.com/test.mp3"
        };

        await checkEndpoint({ Records: [{ body: JSON.stringify(service) }] }, {
            agentFactory: (options) => {

                const mockAgent = new MockAgent(options);
                mockAgent.disableNetConnect();

                mockAgent.get("https://prefix.com").intercept({ path: "/poduptime.com/test.mp3", method: 'HEAD' }).reply(302, {}, {
                    headers: { location: "https://poduptime.com/wrong.mp3" }
                });

                return mockAgent;
            }
        });

        assertEventBridgePayload(events, {
            url: "https://prefix.com/poduptime.com/test.mp3",
            status: 302,
            headers: { location: "https://poduptime.com/wrong.mp3" },
            traversal: ["https://prefix.com/poduptime.com/test.mp3"],
            available: 0,
            type: "prefix",
            error: serializeError(new UnexpectedRedirectLocationError("https://poduptime.com/wrong.mp3"))
        });
    });

    it('should handle network errors', async (t) => {

        const errorLogger = t.mock.method(console, 'error', () => { });

        const service = {
            type: "enclosure",
            endpoint: "test",
            url: "https://poduptime.com/test.mp3"
        };

        const error = new Error("Mock Error message");
        error.code = "MOCK_ERROR";

        await checkEndpoint({ Records: [{ body: JSON.stringify(service) }] }, {
            agentFactory: (options) => {

                const mockAgent = new MockAgent(options);
                mockAgent.disableNetConnect();

                mockAgent.get("https://poduptime.com")
                    .intercept({ path: "test.mp3", method: 'HEAD' })
                    .replyWithError(error);

                return mockAgent;
            }
        });

        assert.equal(errorLogger.mock.calls.length, 1);

        assertEventBridgePayload(events, {
            url: "https://poduptime.com/test.mp3",
            status: 0,
            headers: null,
            traversal: ["https://poduptime.com/test.mp3"],
            available: 0,
            type: "enclosure",
            error: serializeError(error)
        });
    });

    it('should throw on EventBridge errors', async (t) => {

        const service = {
            type: "prefix",
            endpoint: "test",
            url: "https://prefix.com/poduptime.com/test.mp3",
            expected_url: "https://poduptime.com/test.mp3"
        };

        events.rejects('simulated error');

        await throwsAsync(checkEndpoint({ Records: [{ body: JSON.stringify(service) }] }, {
            agentFactory: (options) => {

                const mockAgent = new MockAgent(options);
                mockAgent.disableNetConnect();

                mockAgent.get("https://prefix.com").intercept({ path: "/poduptime.com/test.mp3", method: 'HEAD' }).reply(302, {}, {
                    headers: { location: "https://poduptime.com/test.mp3" }
                });

                return mockAgent;
            }
        }));
    });
});