import { DataAPIClient } from "@datastax/astra-db-ts";

const {
  ASTRA_DB_KEYSPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN
} = process.env;

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(ASTRA_DB_API_ENDPOINT!, { keyspace: ASTRA_DB_KEYSPACE });

// Performs a lightweight Astra DB query to keep the RAG database warm
export async function GET() {
  try {
    if (!ASTRA_DB_COLLECTION || !ASTRA_DB_API_ENDPOINT || !ASTRA_DB_KEYSPACE || !ASTRA_DB_APPLICATION_TOKEN) {
      return new Response(
        JSON.stringify({ status: "error", message: "Astra DB environment variables not fully configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const collection = await db.collection(ASTRA_DB_COLLECTION);
    const cursor = collection.find(
      null,
      {
        limit: 1,
        projection: { _id: 1 }
      }
    );
    await cursor.toArray();

    return new Response(
      JSON.stringify({ status: "ok" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ status: "error", message: String(error) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
