## JARVIS – AI Assistant for CS, Algorithms, Web Dev & Research

JARVIS is an AI assistant focused on Computer Science, Algorithms, Web Development, and Technical Research.  
It combines a curated CS knowledge base in Astra DB with live web search and a Groq LLM to give concise, goal‑focused answers.

---

## Features

- **Goal‑focused chat interface**
  - Streaming assistant responses
  - Prompt suggestions to inspire useful queries
  - Responsive layout for mobile, tablet, and desktop

- **Retrieval‑Augmented Generation (RAG)**
  - Curated CS / programming / research sources
  - Text chunking and embeddings with Jina v3
  - Vector search over Astra DB to pull relevant context

- **Web search fallback (optional)**
  - Uses Serper to answer time‑sensitive or out‑of‑scope questions
  - Merges web snippets into the context shown to the LLM

- **Math & formatting**
  - Markdown rendering with `react-markdown`
  - LaTeX math via `remark-math` + `rehype-katex`
  - Good for complexity analysis and algorithm derivations

---

## Tech Stack

- **Frontend**
  - Next.js (App Router), React, TypeScript
  - Streaming chat UI with `ReadableStream`

- **Backend**
  - Next.js API routes under `app/api/*`
  - Groq (LLaMA 3.3 70B) for chat completions
  - Jina embeddings v3 for text embeddings
  - Serper for web search (optional)

- **RAG / data ingestion**
  - DataStax Astra DB as vector store
  - LangChain loaders for web pages, PDFs, and PPTX

---

## Quick Start

Install dependencies:

```bash
npm install
```

Create `.env.local` (or equivalent) and set:

```env
ASTRA_DB_KEYSPACE=your_keyspace
ASTRA_DB_COLLECTION=your_collection
ASTRA_DB_API_ENDPOINT=your_astra_endpoint
ASTRA_DB_APPLICATION_TOKEN=your_astra_token

GROQ_API_KEY=your_groq_key
JINA_API_KEY=your_jina_key
SERPER_API_KEY=your_serper_key   # optional
```

Run the dev server:

```bash
npm run dev
```

---

## RAG Data & Seeding

The app expects an Astra collection populated with embedded CS content.

Sources:

- URLs listed in `data/csWebsites.ts`
- Optional PDFs/PPTX placed in the `pdfs/` directory

To (re)build the Astra collection:

```bash
npm run seed
```

This script:

- Drops and recreates the collection with a 1024‑dimensional vector field
- Scrapes configured URLs and loads local PDFs/PPTX
- Splits text into chunks and embeds with Jina
- Inserts documents into Astra DB with `$vector`, `text`, and `source`

---

## How to Collaborate

- Open an issue if you:
  - Find a bug in the chat flow or RAG results
  - Have ideas for better sources to add to `data/csWebsites.ts`
  - Want to discuss model or UX changes

- For code changes:
  - Fork the repository
  - Create a feature branch from `main`
  - Run `npm run lint` and `npm run seed` if you touch RAG logic
  - Open a pull request with a short description of:
    - What changed
    - How to reproduce or test it

- Focus areas that are especially welcome:
  - Better CS/algorithms/web dev sources
  - UI/UX improvements to keep the chat goal‑focused
  - Reliability and error‑handling improvements around Astra DB and external APIs
