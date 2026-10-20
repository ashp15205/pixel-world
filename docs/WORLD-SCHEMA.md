# World JSON schema (v1)

```json
{
  "version": 1,
  "name": "docs.example.com",
  "rootUrl": "https://docs.example.com/",
  "createdAt": "2026-10-20T12:00:00.000Z",
  "width": 40,
  "height": 30,
  "pages": [
    {
      "id": "getting-started-0",
      "url": "https://docs.example.com/getting-started",
      "title": "Getting Started",
      "excerpt": "Welcome to the docs...",
      "markdown": "# Getting Started...",
      "links": ["https://docs.example.com/api"],
      "district": "Getting Started",
      "x": 5,
      "y": 4
    }
  ],
  "edges": [{"from":"getting-started-0","to":"api-1"}]
}
```

Coordinates are tile units. The renderer currently uses a 32-pixel tile scale. IDs must be unique. Unknown extra properties are preserved by import, but the renderer relies on `pages`, `edges`, `width`, `height`, and `rootUrl`.
