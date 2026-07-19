# Data sources & attribution

AEGIS is built entirely on **free, public, legally-accessible open data**. It uses
only publicly broadcast signals (ADS-B, TLE), open APIs, and cameras that operators
**intentionally publish** for public viewing — no classified data, no private or
unsecured surveillance feeds, no scraping of people. Given the mix of licenses
(several are non-commercial), **AEGIS is for non-commercial, educational, and
research use.** Respect each provider's terms.

| Layer | Source | Notes | Key |
|-------|--------|-------|-----|
| Flights | [adsb.lol](https://adsb.lol) + [airplanes.live](https://airplanes.live) | Community ADS-B; adsb.lol data is ODbL; non-commercial. | none |
| Satellites | [CelesTrak](https://celestrak.org) / 18th SDS | Free TLE; respect throttling. | none |
| Earthquakes | [USGS](https://earthquake.usgs.gov) | U.S. Gov public domain. | none |
| Natural events | [NASA EONET](https://eonet.gsfc.nasa.gov) | NASA open data. | none |
| Weather (probe) | [Open-Meteo](https://open-meteo.com) | **CC-BY 4.0** — attribution required. | none |
| Weather radar | [RainViewer](https://www.rainviewer.com) | Free radar tiles. | none |
| Global events | [GDELT](https://www.gdeltproject.org) + news RSS (BBC, Al Jazeera, NPR) | Rate-limited; RSS fallback. | none |
| Public cameras | [Transport for London](https://tfl.gov.uk) JamCams; [Windy Webcams](https://www.windy.com) | Public cameras only. Windy adds global coverage. | none / optional |
| Markets | [CoinGecko](https://www.coingecko.com) + [alternative.me](https://alternative.me/fear-and-greed-index) | Free tiers; attribution required. | none |
| Cyber threats | [ThreatFox / abuse.ch](https://threatfox.abuse.ch); geo by [ip-api.com](https://ip-api.com) | CSV export key-free; ip-api free tier is non-commercial. | none |
| Ships *(optional)* | [aisstream.io](https://aisstream.io) | Free key; persistent server WS relay. | `AISSTREAM_API_KEY` |
| Wildfires *(optional)* | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov) | Free MAP_KEY. | `FIRMS_MAP_KEY` |
| Internet outages *(optional)* | [Cloudflare Radar](https://radar.cloudflare.com) | Free API token. | `CLOUDFLARE_API_TOKEN` |
| Air quality *(optional)* | [OpenAQ](https://openaq.org) | Free API key. | `OPENAQ_API_KEY` |
| AI briefing *(optional)* | [Ollama](https://ollama.com) (local) | Runs on your machine; private. | none |
| Basemap | [CARTO](https://carto.com) (dark/minimal/light) / [OpenFreeMap](https://openfreemap.org) | Free vector basemaps. | none |

## Responsible use

- **Not a spy tool.** AEGIS aggregates the same open feeds that power public
  flight/ship/satellite trackers. It cannot see anything not already publicly
  broadcast, and the camera layer uses only cameras published for public viewing.
- **CelesTrak** limits downloads (1/group/2h/IP); AEGIS honors this with a 2-hour
  cache, no retry loops, and a descriptive User-Agent.
- **GDELT** rate-limits aggressively; AEGIS caches 15 min, backs off on 429 via a
  circuit breaker, and falls back to news RSS.
