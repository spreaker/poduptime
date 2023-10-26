const endpoints = [
  {
    id: "dummy-hosting",
    label: "Dummy Hosting",
    website_url: "https://httpbin.org",
    services: [
      {
        type: "enclosure",
        url: "https://httpbin.org/status/200",
      },
      {
        type: "feed",
        url: "https://httpbin.org/status/200",
      },
    ],
  },
  {
    id: "dummy-prefix",
    label: "Dummy Prefix",
    website_url: "https://httpbin.org",
    services: [
      {
        type: "prefix",
        url: "https://httpbin.org/redirect-to?url=https://httpbin.org/status/200",
        expected_url: "https://httpbin.org/status/200",
      },
    ],
  },
];

const regions = [
  {
    id: "global",
    label: "Global (aggregated)",
  },
  {
    id: "us-east-2",
    label: "Ohio (us-east-2)",
  },
  {
    id: "us-west-1",
    label: "N. California (us-west-1)",
  },
  {
    id: "eu-south-1",
    label: "Milan (eu-south-1)",
  },
];

const base_url = "";

export default {
  endpoints,
  regions,
  base_url,
};
