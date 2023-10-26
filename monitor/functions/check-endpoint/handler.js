import { hrtime } from 'node:process';
import { PutEventsCommand, EventBridgeClient } from "@aws-sdk/client-eventbridge";
import { formatISO } from 'date-fns';
import { request, Agent } from 'undici';
import { URL } from 'node:url';

const { randomUUID } = await import('node:crypto');

const client = new EventBridgeClient({});

const getDurationMs = function (start) {
    return Number(hrtime.bigint() - start) / 1e6;
}

const createAgent = function (options) {
    return new Agent(options);
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

    let statusCode = 0, headers = null, context = null;

    const start = hrtime.bigint();

    try {
        ({ statusCode, headers, context } = await request(result.url, {
            dispatcher: agent,
            method: 'HEAD',
            headers: { "User-Agent": `Mozilla/5.0 (compatible; PodUptimeBot/1.0; +https://poduptime.com; rid:${result.id})` },
        }));
    } catch (e) {
        console.error("Check endpoint error", result, e);
    }

    const durationMs = getDurationMs(start);

    try {
        await agent.destroy();
    } catch (e) { }

    const traversal = (context?.history ?? [new URL(result.url)]).map((u) => {
        return u.href;
    });

    /**
     * Availability is defined differently based on the endpoint type.
     *
     * - Prefix endpoints are considered available when they redirect to
     *   the expected url
     * - Other endpoints are considered available when they respond with
     *   an HTTP 200 status code
     */
    const available = "prefix" !== service.type ? statusCode === 200 :
        [301, 302, 303, 307, 308].includes(statusCode) &&
        service.expected_url === headers["location"];

    return {
        ...result,
        status: statusCode,
        duration: durationMs,
        headers: headers,
        traversal: traversal,
        available: available ? 1 : 0
    };
}

export const checkEndpoint = async function (event, context) {

    const service = JSON.parse(event.Records[0].body);
    const result = await performCheck(service, context?.agentFactory ?? createAgent);

    try {
        await client.send(new PutEventsCommand({
            Entries: [{
                EventBusName: process.env.EVENT_BUS,
                Source: 'monitor',
                DetailType: "measurement",
                Detail: JSON.stringify(result)
            }]
        }));
    } catch (e) {
        console.error("Put event error", result, e);
    }
}