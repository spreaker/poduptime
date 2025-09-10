const endpoints = [
  {
    id: "origin",
    label: "Static (this website)",
    website_url: "https://poduptime.com",
    services: [
      {
        type: "enclosure",
        url: "https://poduptime.com/rss/1_second_of_silence.mp3",
      },
      {
        type: "feed",
        url: "https://poduptime.com/rss/feed.xml",
      },
    ],
  },
  {
    id: "spreaker",
    label: "Spreaker",
    website_url: "https://www.spreaker.com",
    services: [
      {
        type: "enclosure",
        url: "https://api.spreaker.com/v2/episodes/50675844/download.mp3",
      },
      {
        type: "feed",
        url: "https://www.spreaker.com/show/5627262/episodes/feed",
      },
    ],
  },
  {
    id: "omny",
    label: "Omny Studio",
    website_url: "https://omnystudio.com",
    services: [
      {
        type: "enclosure",
        url: "https://traffic.omny.fm/d/clips/c74ece17-3415-430a-bb53-ad100097288f/a2a218b0-f858-4bcd-86bc-b09000e1c42c/7b0a8f39-4bf6-4ef2-9f0b-b09000e252e1/audio.mp3?utm_source=Podcast&in_playlist=5ab25fd1-4a9d-403b-a510-b09000e22d3c",
      },
      {
        type: "feed",
        url: "https://www.omnycontent.com/d/playlist/c74ece17-3415-430a-bb53-ad100097288f/a2a218b0-f858-4bcd-86bc-b09000e1c42c/5ab25fd1-4a9d-403b-a510-b09000e22d3c/podcast.rss",
      },
    ],
  },
  {
    id: "buzzsprout",
    label: "Buzzsprout",
    website_url: "https://www.buzzsprout.com",
    services: [
      {
        type: "enclosure",
        url: "https://www.buzzsprout.com/2257072/14229220-1-second-of-silence-re-upload.mp3",
      },
      {
        type: "feed",
        url: "https://feeds.buzzsprout.com/2257072.rss",
      },
    ],
  },
  {
    id: "rsscom",
    label: "RSS.com",
    website_url: "https://rss.com",
    services: [
      {
        type: "enclosure",
        url: "https://media.rss.com/poduptime/2023_10_04_07_27_39_79f08d2e-ea8b-4080-a269-cbce68f922be.mp3",
      },
      {
        type: "feed",
        url: "https://media.rss.com/poduptime/feed.xml",
      },
    ],
  },
  {
    id: "anchor",
    label: "Spotify for Podcasters",
    website_url: "https://podcasters.spotify.com/",
    services: [
      {
        type: "enclosure",
        url: "https://anchor.fm/s/ea8acfc4/podcast/play/76776603/https%3A%2F%2Fd3ctxlq1ktw2nl.cloudfront.net%2Fstaging%2F2023-9-4%2F6d3fe73d-f7f9-f5c2-c96c-edd49eb5096b.mp3",
      },
      {
        type: "feed",
        url: "https://anchor.fm/s/ea8acfc4/podcast/rss",
      },
    ],
  },
  {
    id: "acast",
    label: "Acast",
    website_url: "https://www.acast.com",
    services: [
      {
        type: "enclosure",
        url: "https://sphinx.acast.com/p/open/s/651e5d9ce6253800112a5ac5/e/651e60d3ed61ed0011ee4d72/media.mp3",
      },
      {
        type: "feed",
        url: "https://feeds.acast.com/public/shows/651e5d9ce6253800112a5ac5",
      },
    ],
  },
  {
    id: "libsyn",
    label: "Libsyn",
    website_url: "https://libsyn.com",
    services: [
      {
        type: "enclosure",
        url: "https://traffic.libsyn.com/secure/f74e1620-949c-4fce-acd6-8e0f064d56b6/37417951.mp3?dest-id=4174196",
      },
      {
        type: "feed",
        url: "https://feeds.libsyn.com/489188/rss",
      },
    ],
  },
  {
    id: "redcircle",
    label: "RedCircle",
    website_url: "https://redcircle.com",
    services: [
      {
        type: "enclosure",
        url: "https://audio3.redcircle.com/episodes/cb0bb6e3-f5cc-406f-8224-ee9a6d7dcca9/stream.mp3",
      },
      {
        type: "feed",
        url: "https://feeds.redcircle.com/44245d8f-99ce-424b-8e8c-450ea1edd0f2",
      },
    ],
  },
  {
    id: "alitu",
    label: "Alitu",
    website_url: "https://alitu.com",
    services: [
      {
        type: "enclosure",
        url: "https://feeds.alitu.com/53786915/c2435837-6cda-4693-93b1-f928b3a3b28c.mp3?t=1697026250000",
      },
      {
        type: "feed",
        url: "https://feeds.alitu.com/53786915",
      },
    ],
  },
  {
    id: "audioboom",
    label: "Audioboom",
    website_url: "https://audioboom.com",
    services: [
      {
        type: "enclosure",
        url: "https://audioboom.com/posts/8391199.mp3?modified=1698395341&sid=5119220&source=rss",
      },
      {
        type: "feed",
        url: "https://audioboom.com/channels/5119220.rss",
      },
    ],
  },
  {
    id: "ivoox",
    label: "iVoox",
    website_url: "https://podcasters.ivoox.com/",
    services: [
      {
        type: "enclosure",
        url: "https://www.ivoox.com/podcast-poduptime_fg_f12312823_filtro_1.xml",
      },
      {
        type: "feed",
        url: "https://www.ivoox.com/sample-episode_mf_118495604_feed_1.mp3?d=1698394289",
      },
    ],
  },
  {
    id: "podbean",
    label: "Podbean",
    website_url: "https://podbean.com",
    services: [
      {
        type: "enclosure",
        url: "https://mcdn.podbean.com/mf/web/ffwsj4/37417951.mp3",
      },
      {
        type: "feed",
        url: "https://feed.podbean.com/poduptime/feed.xml",
      },
    ],
  },
  {
    id: "podtrac",
    label: "Podtrac",
    website_url: "https://analytics.podtrac.com",
    services: [
      {
        type: "prefix",
        url: "https://dts.podtrac.com/redirect.mp3/poduptime.com/rss/1_second_of_silence.mp3",
        expected_url: "https://poduptime.com/rss/1_second_of_silence.mp3",
      },
    ],
  },
  {
    id: "op3",
    label: "OP3.dev",
    website_url: "https://op3.dev",
    services: [
      {
        type: "prefix",
        url: "https://op3.dev/e/poduptime.com/rss/1_second_of_silence.mp3",
        expected_url: "https://poduptime.com/rss/1_second_of_silence.mp3",
      },
    ],
  },
  {
    id: "chartable",
    label: "Chartable",
    website_url: "https://chartable.com",
    services: [
      {
        type: "prefix",
        url: "https://chrt.fm/track/F471DC/poduptime.com/rss/1_second_of_silence.mp3",
        expected_url: "https://poduptime.com/rss/1_second_of_silence.mp3",
      },
    ],
  },
  {
    id: "blubrry-stats",
    label: "Blubrry (Stats)",
    website_url: "https://blubrry.com/",
    services: [
      {
        type: "prefix",
        url: "https://media.blubrry.com/3020970/poduptime.com/rss/1_second_of_silence.mp3",
        expected_url: "https://poduptime.com/rss/1_second_of_silence.mp3",
      },
    ],
  },
  {
    id: "podcorn",
    label: "Podcorn",
    website_url: "https://podcorn.com",
    services: [
      {
        type: "prefix",
        url: "https://pdcn.co/e/poduptime.com/rss/1_second_of_silence.mp3",
        expected_url: "https://poduptime.com/rss/1_second_of_silence.mp3",
      },
    ],
  },
  {
    id: "podderapp",
    label: "Podder",
    website_url: "https://podderapp.com",
    services: [
      {
        type: "prefix",
        url: "https://p.podderapp.com/1019872499/poduptime.com/rss/1_second_of_silence.mp3",
        expected_url: "https://poduptime.com/rss/1_second_of_silence.mp3",
      },
    ],
  },
  {
    id: "podscribe",
    label: "Podscribe",
    website_url: "https://podscribe.com",
    services: [
      {
        type: "prefix",
        url: "https://pscrb.fm/rss/p/poduptime.com/rss/1_second_of_silence.mp3",
        expected_url: "https://poduptime.com/rss/1_second_of_silence.mp3",
      },
    ],
  },
  {
    id: "claritas",
    label: "Claritas",
    website_url: "https://claritas.com/",
    services: [
      {
        type: "prefix",
        url: "https://clrtpod.com/m/poduptime.com/rss/1_second_of_silence.mp3",
        expected_url: "https://poduptime.com/rss/1_second_of_silence.mp3",
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

const base_url = "https://poduptime.com";

export default {
  endpoints,
  regions,
  base_url,
};
