import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prod from "./conf/config_prod.js";
import nonprod from "./conf/config_nonprod.js";

const assertValidUrl = (url, message) => {
    try {
        assert.ok(new URL(url), message);
    } catch (e) {
        assert.ok(false, message);
    }
}

describe('config', () => {

    const envs = [{ name: "prod", config: prod }, { name: "nonprod", config: nonprod }]

    for (const env of envs) {

        describe(`for environment ${env.name}`, () => {

            const config = env.config;

            it(`regions should be valid`, () => {

                assert.ok(config.regions, "Regions must be defined");
                assert.ok(!!config.regions.find((r) => r.id === "global"), "Global must be defined");
                assert.ok(config.regions.length > 1, "At least another region");
            });

            it(`endpoints should be valid`, () => {

                assert.ok(config.endpoints, "Endpoints must be defined");
                assert.ok(config.endpoints.length > 0, "At least one endpoint");
            });

            for (const endpoint of config.endpoints) {

                it(`endpoint ${endpoint.id} should be valid`, () => {

                    assert.ok(endpoint.id, "An id is defined");
                    assert.ok(endpoint.label, "A label is defined");
                    assert.ok(endpoint.services, "Services are defined");
                    assertValidUrl(endpoint.website_url, "A website_url is defined and valid");
                });

                describe(`for endpoint ${endpoint.id}`, () => {

                    for (const service of endpoint.services) {

                        it(`service ${service.type} should be valid`, () => {

                            assert.ok(service.type, "Service type is defined");
                            assert.ok(["feed", "enclosure", "prefix"].includes(service.type), "Service type is supported");

                            assertValidUrl(service.url, "Service url is defined and valid");
                            if ("prefix" === service.type) {
                                assertValidUrl(service.expected_url, "Expected url is defined and valid");
                            }
                        });
                    }
                });
            }
        });
    }
});