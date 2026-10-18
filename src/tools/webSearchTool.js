const declaration = {
  name: "web_search",
  description:
    "Searches the web (Tavily) for library docs or error messages. Use only when a fix is uncertain or a test keeps failing for an unfamiliar reason.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "Short search query, e.g. an error message plus the library name." },
    },
    required: ["query"],
  },
};

const isAvailable = (session) => Boolean(session.tavilyKey);

async function run({ query } = {}, session) {
  if (!session.tavilyKey) return { error: "Web search is not configured." };
  if (!query) return { error: "query is required." };

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.tavilyKey}`,
    },
    body: JSON.stringify({ query: String(query).slice(0, 300), max_results: 3, search_depth: "basic" }),
  });

  if (!res.ok) return { error: `Search failed with status ${res.status}.` };

  const data = await res.json();
  session.searches = (session.searches || 0) + 1;
  return {
    results: (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      snippet: String(r.content || "").slice(0, 600),
    })),
  };
}

module.exports = { declaration, isAvailable, run };
