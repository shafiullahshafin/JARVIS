import Groq from "groq-sdk";
import { DataAPIClient } from "@datastax/astra-db-ts";

const {
  ASTRA_DB_KEYSPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  GROQ_API_KEY,
  SERPER_API_KEY,
  JINA_API_KEY
} = process.env;

const groq = new Groq({ apiKey: GROQ_API_KEY });
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(ASTRA_DB_API_ENDPOINT!, { keyspace: ASTRA_DB_KEYSPACE });

async function getJinaEmbedding(text: string) {
  const response = await fetch('https://api.jina.ai/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${JINA_API_KEY}`
    },
    body: JSON.stringify({
      input: [text],
      model: 'jina-embeddings-v3'
    })
  });
  
  const data = await response.json();
  return data.data[0].embedding;
}

async function webSearch(query: string) {
  try {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query })
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const results = data.organic?.slice(0, 5) || [];
    
    return results.map((r: any) => ({
      title: r.title,
      snippet: r.snippet,
      link: r.link
    }));
  } catch (error) {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    
    const lastMsg = messages[messages.length - 1];
    const latestMessage = lastMsg?.content || lastMsg?.text || "";
    
    if (!latestMessage) {
      return new Response(JSON.stringify({ error: "No message content" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    let docContext = "";
    let webContext = "";
    let shouldSearchWeb = false;

    try {
      let vector = await getJinaEmbedding(latestMessage);

      if (vector.length < 1024) {
        vector = vector.concat(new Array(1024 - vector.length).fill(0));
      } else if (vector.length > 1024) {
        vector = vector.slice(0, 1024);
      }

      const collection = await db.collection(ASTRA_DB_COLLECTION);
      const cursor = collection.find(null, {
        sort: { $vector: vector },
        limit: 10
      });

      const docs = await cursor.toArray();
      
      if (!docs || docs.length === 0 || docs.every(d => !d.text || d.text.trim().length < 50)) {
        shouldSearchWeb = true;
      } else {
        const docsMap = docs.map((d) => d.text);
        docContext = JSON.stringify(docsMap);
      }
    } catch (error) {
      docContext = "";
      shouldSearchWeb = true;
    }

    const needsWebSearch = shouldSearchWeb || 
                          /who is|what is.*current|latest|recent|news|today|this year|2024|2025/i.test(latestMessage) ||
                          (latestMessage.toLowerCase().includes('current') && 
                           /president|champion|winner|leader|ceo|founder/i.test(latestMessage));
    
    if (needsWebSearch && SERPER_API_KEY) {
      const searchResults = await webSearch(latestMessage);
      if (searchResults && searchResults.length > 0) {
        webContext = `\n\nWEB SEARCH RESULTS:\n${searchResults.map((r: any) => 
          `- ${r.title}: ${r.snippet} (${r.link})`
        ).join('\n')}`;
      }
    }

    const systemPrompt = `You are JARVIS, an AI assistant specializing in Computer Science, Web Development, and Technical Research.

Developer: Md. Shafiullah Shafin (ph00en1x) | Contact: shafiullahshafin735@gmail.com

You have access to a CS knowledge database and web search for answering questions.

Response Guidelines:
- Be concise and direct—get to the point immediately
- Answer in short paragraphs for most questions
- Use bullets only when comparing or listing 3+ items
- Use LaTeX for math: $O(n^2)$, $\log_2(n)$
- Bold **key terms** sparingly
- Provide ONE example maximum, only if it clarifies significantly
- No code unless explicitly requested
- Avoid filler phrases like "It's worth noting" or "In conclusion"
- Skip introductions—start with the answer
- Stay focused on CS topics

Keep responses tight, clear, informative and actionable and pleasant for the user.


        Context available:
        ${docContext}
        ${webContext}
    `;

    const groqMessages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    messages.forEach((msg: any) => {
      groqMessages.push({
        role: msg.role,
        content: msg.content || msg.text
      });
    });

    const stream = await groq.chat.completions.create({
      messages: groqMessages,
      model: "llama-3.3-70b-versatile",
      stream: true,
      temperature: 0.7,
      max_tokens: 2048
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}