import { hrtime } from 'node:process';
import { PutEventsCommand, EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { formatISO } from 'date-fns';
import { request, Agent } from 'undici';
import { URL } from 'node:url';
import { UnexpectedRedirectLocationError, UnexpectedHttpStatusError, serializeError } from "../../common/errors.js";

const { randomUUID } = await import('node:crypto');

const client = new EventBridgeClient({});

const getDurationMs = function (start) {
    return Number(hrtime.bigint() - start) / 1e6;
}

const createAgent = function (options) {
    return new Agent(options);
}

const performHTTPRequest = async function (id, service, agentFactory) {

    /**
     * HTTP Connection lifecycle
     *
     * We want every measurement to be independent from whatever happened
     * in the past, but we also want to have a properly functioning http
     * agent able to reuse keep-alive connections while following a redirect
     * chain that hits the same host more than once.
     *
     * So, instead of relying on the default global http agent that
     * is going to reuse connections between measurements, we're going to
     * create/destroy a dedicated one every time.
     */
    const agent = agentFactory({
        // When testing prefixes, do not follow redirects
        maxRedirections: service.type === "prefix" ? 0 : 10,
        // Ensure timeouts
        headersTimeout: 5000,
        bodyTimeout: 5000,
        connect: { timeout: 5000 },
    });

    let statusCode = 0, headers = null, context = null, error = null;

    const start = hrtime.bigint();

    try {
        ({ statusCode, headers, context } = await request(service.url, {
            dispatcher: agent,
            method: 'HEAD',
            headers: { "User-Agent": `Mozilla/5.0 (compatible; PodUptimeBot/1.0; +https://poduptime.com; rid:${id})` },
        }));
    } catch (e) {
        error = e;
        console.error("Check endpoint error", service, e);
    }

    const duration = getDurationMs(start);

    try {
        await agent.destroy();
    } catch (e) { }

    const traversal = (context?.history ?? [new URL(service.url)]).map((u) => {
        return u.href;
    });

    return {
        status: statusCode, headers, error, traversal, duration
    };
}

const determineAvailability = function (service, response) {

    // If HTTP request triggered an error, we let it bubble
    if (response.error) {
        return { available: 0, error: serializeError(response.error) };
    }

    // Prefix service must redirect
    if ("prefix" === service.type && ![301, 302, 303, 307, 308].includes(response.status)) {
        return { available: 0, error: serializeError(new UnexpectedHttpStatusError(response.status)) };
    }

    // Prefix service must redirect to the expected location
    if ("prefix" === service.type && service.expected_url !== response.headers["location"]) {
        return { available: 0, error: serializeError(new UnexpectedRedirectLocationError(response.headers["location"])) };
    }

    // Other services should return 200
    if ("prefix" !== service.type && response.status !== 200) {
        return { available: 0, error: serializeError(new UnexpectedHttpStatusError(response.status)) };
    }

    return { available: 1, error: null };
}

const performCheck = async function (service, agentFactory) {

    const result = {
        id: randomUUID(),
        timestamp: formatISO(new Date()),
        region: process.env.AWS_REGION,
        endpoint: service.endpoint,
        url: service.url,
        type: service.type
    };

    const response = await performHTTPRequest(result.id, service, agentFactory);

    return {
        ...result,
        ...response,
        ...determineAvailability(service, response)
    };
}

export const checkEndpoint = async function (event, context) {

    const service = JSON.parse(event.Records[0].body);
    const result = await performCheck(service, context?.agentFactory ?? createAgent);

    await client.send(new PutEventsCommand({
        Entries: [{
            EventBusName: process.env.EVENT_BUS,
            Source: 'monitor',
            DetailType: "measurement",
            Detail: JSON.stringify(result)
        }]
    }));
}