import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { PPTXLoader } from "@langchain/community/document_loaders/fs/pptx";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { csWebsites } from "../data/csWebsites";
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

type SimilarityMetric = "cosine" | "euclidean" | "dot_product";

const {
  ASTRA_DB_KEYSPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  JINA_API_KEY
} = process.env;

const MAX_CHUNKS_PER_URL = 50;
const CONCURRENT_REQUESTS = 3;
const MAX_RETRIES = 2;
const DOCS_FOLDER = path.join(__dirname, "../pdfs");
const FAILED_URLS_FILE = path.join(__dirname, "../data/failedUrls.json");

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(ASTRA_DB_API_ENDPOINT!, { keyspace: ASTRA_DB_KEYSPACE });

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100
});

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

function normalizeVector(vector: number[]): number[] {
  if (vector.length < 1024) {
    return vector.concat(new Array(1024 - vector.length).fill(0));
  } else if (vector.length > 1024) {
    return vector.slice(0, 1024);
  }
  return vector;
}

async function scrapePage(url: string, retries = MAX_RETRIES): Promise<string> {
  try {
    const loader = new PuppeteerWebBaseLoader(url, {
      launchOptions: {
        headless: "new",
        args: ["--ignore-certificate-errors", "--no-sandbox", "--disable-setuid-sandbox"]
      },
      gotoOptions: {
        waitUntil: "domcontentloaded",
        timeout: 15000
      },
      evaluate: async (page) => {
        return await page.evaluate(() => document.body.innerHTML);
      }
    });

    return (await loader.scrape())?.replace(/<[^>]*>?/gm, "") || "";
  } catch (error: any) {
    if (retries > 0 && !error.message?.includes('ERR_NAME_NOT_RESOLVED')) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return scrapePage(url, retries - 1);
    }
    throw error;
  }
}

async function createCollection(similarityMetric: SimilarityMetric = "cosine") {
  await db.dropCollection(ASTRA_DB_COLLECTION!).catch(() => {});
  await db.createCollection(ASTRA_DB_COLLECTION!, {
    vector: {
      dimension: 1024,
      metric: similarityMetric
    }
  });
}

async function loadWebsites(collection: any) {
  let processed = 0;
  let failed = 0;
  const failedUrls: string[] = [];

  for (let i = 0; i < csWebsites.length; i += CONCURRENT_REQUESTS) {
    const batch = csWebsites.slice(i, i + CONCURRENT_REQUESTS);
    
    await Promise.allSettled(
      batch.map(async (url) => {
        try {
          const content = await scrapePage(url);
          
          if (!content || content.length < 50) {
            failed++;
            failedUrls.push(url);
            return;
          }

          let chunks = await splitter.splitText(content);
          
          if (chunks.length > MAX_CHUNKS_PER_URL) {
            chunks = chunks.slice(0, MAX_CHUNKS_PER_URL);
          }

          const vectors = await Promise.all(
            chunks.map(chunk => getJinaEmbedding(chunk))
          );

          const documents = chunks.map((chunk, idx) => ({
            $vector: normalizeVector(vectors[idx]),
            text: chunk,
            source: url
          }));

          if (documents.length > 0) {
            await collection.insertMany(documents);
          }
          
          processed++;
        } catch (error: any) {
          failed++;
          failedUrls.push(url);
        }
      })
    );
  }

  if (failedUrls.length > 0) {
    fs.writeFileSync(FAILED_URLS_FILE, JSON.stringify(failedUrls, null, 2));
  }

  console.log(`Websites: ${processed} processed, ${failed} failed`);
}

async function loadDocuments(collection: any) {
  if (!fs.existsSync(DOCS_FOLDER)) {
    return;
  }

  const files = fs.readdirSync(DOCS_FOLDER).filter(file => 
    file.endsWith('.pdf') || file.endsWith('.pptx')
  );
  
  if (files.length === 0) {
    return;
  }

  let processed = 0;
  let failed = 0;

  for (const file of files) {
    try {
      const filePath = path.join(DOCS_FOLDER, file);
      let docs;

      if (file.endsWith('.pdf')) {
        const loader = new PDFLoader(filePath, { splitPages: false });
        try {
          docs = await loader.load();
        } catch {
          failed++;
          continue;
        }
      } else if (file.endsWith('.pptx')) {
        const loader = new PPTXLoader(filePath);
        try {
          docs = await loader.load();
        } catch {
          failed++;
          continue;
        }
      } else {
        continue;
      }

      if (!docs || !Array.isArray(docs) || docs.length === 0) {
        failed++;
        continue;
      }

      const allChunks: string[] = [];
      
      for (const doc of docs) {
        if (!doc || !doc.pageContent || typeof doc.pageContent !== 'string') {
          continue;
        }

        if (doc.pageContent.trim().length < 20) {
          continue;
        }

        const chunks = await splitter.splitText(doc.pageContent);
        allChunks.push(...chunks);
      }

      if (allChunks.length === 0) {
        failed++;
        continue;
      }

      const vectors = await Promise.all(
        allChunks.map(chunk => getJinaEmbedding(chunk))
      );

      const documents = allChunks.map((chunk, idx) => ({
        $vector: normalizeVector(vectors[idx]),
        text: chunk,
        source: file
      }));

      if (documents.length > 0) {
        await collection.insertMany(documents);
      }
      
      processed++;
    } catch {
      failed++;
    }
  }

  console.log(`Documents: ${processed} processed, ${failed} failed`);
}

async function loadData() {
  const collection = await db.collection(ASTRA_DB_COLLECTION!);
  await loadWebsites(collection);
  await loadDocuments(collection);
}

createCollection()
  .then(() => loadData())
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });