# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within PixelWorld, please **do not report it via public GitHub issues**.

Instead, please send an email with the details, steps to reproduce, and attack vector to the repository maintainer or open a private GitHub Security Advisory.

## Defensive Architecture & Practices

PixelWorld adheres to defensive programming standards:
- **BYOK (Bring Your Own Key)**: Keys are supplied by the client and sent via `x-context-dev-key` headers; they are never persisted server-side.
- **SSRF Defense**: Strict URL validation via `validPublicUrl()` blocks non-HTTP/HTTPS protocols and reserved/private IP address ranges (`localhost`, `127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, `::1`).
- **XSS Prevention**: Untrusted scraped HTML and Markdown are strictly parsed and rendered using React DOM children without `dangerouslySetInnerHTML`.
- **Outgoing Links**: All external URLs strictly enforce `http:` / `https:` and are secured with `rel="noreferrer"` and `target="_blank"`.
- **Rate & Concurrency Limits**: Crawl limits (`cap`) are clamped between 10 and 100, and scrape worker concurrency is throttled to 2 concurrent requests.
