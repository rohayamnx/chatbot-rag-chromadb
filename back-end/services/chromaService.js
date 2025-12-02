require('dotenv').config();

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const DEFAULT_COLLECTION = process.env.CHROMA_COLLECTION || 'documents';

// Use direct HTTP requests instead of the ChromaDB client to avoid version issues
async function getOrCreateCollection(name = DEFAULT_COLLECTION) {
  try {
    // Try to get the collection first
    const getResponse = await fetch(`${CHROMA_URL}/api/v1/collections/${name}`);
    if (getResponse.ok) {
      return await getResponse.json();
    }
    
    // Collection doesn't exist, create it
    const createResponse = await fetch(`${CHROMA_URL}/api/v1/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        metadata: { description: 'Document embeddings collection' }
      })
    });
    
    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create collection: ${error}`);
    }
    
    return await createResponse.json();
  } catch (error) {
    throw new Error(`ChromaDB collection error: ${error.message}`);
  }
}

async function upsertDocuments({
  collectionName = DEFAULT_COLLECTION,
  ids,
  documents,
  metadatas,
  embeddings,
}) {
  try {
    const collection = await getOrCreateCollection(collectionName);
    
    const response = await fetch(`${CHROMA_URL}/api/v1/collections/${collection.id}/upsert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids,
        embeddings,
        metadatas,
        documents
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upsert documents: ${error}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`ChromaDB upsert error: ${error.message}`);
  }
}

async function querySimilar({
  collectionName = DEFAULT_COLLECTION,
  queryEmbedding,
  topK = 5,
}) {
  try {
    const collection = await getOrCreateCollection(collectionName);
    
    const response = await fetch(`${CHROMA_URL}/api/v1/collections/${collection.id}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query_embeddings: [queryEmbedding],
        n_results: topK
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to query collection: ${error}`);
    }
    
    const result = await response.json();
    return {
      documents: result.documents?.[0] || [],
      metadatas: result.metadatas?.[0] || [],
      distances: result.distances?.[0] || []
    };
  } catch (error) {
    throw new Error(`ChromaDB query error: ${error.message}`);
  }
}

async function getDocumentsList(collectionName = DEFAULT_COLLECTION) {
  try {
    // Check if collection exists
    const response = await fetch(`${CHROMA_URL}/api/v1/collections`);
    const collections = await response.json();
    
    const collection = collections.find(c => c.name === collectionName);
    if (!collection) {
      return []; // No collection exists yet
    }
    
    // Get all documents from the collection
    const getResponse = await fetch(`${CHROMA_URL}/api/v1/collections/${collection.id}/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 10000, // Get all documents
        include: ['metadatas']
      })
    });
    
    if (!getResponse.ok) {
      throw new Error('Failed to fetch documents');
    }
    
    const data = await getResponse.json();
    
    // Group by docId and extract unique documents
    const documentsMap = new Map();
    
    if (data.metadatas) {
      data.metadatas.forEach((metadata, index) => {
        if (metadata && metadata.docId) {
          if (!documentsMap.has(metadata.docId)) {
            documentsMap.set(metadata.docId, {
              docId: metadata.docId,
              fileName: metadata.fileName,
              chunkCount: 1
            });
          } else {
            documentsMap.get(metadata.docId).chunkCount++;
          }
        }
      });
    }
    
    return Array.from(documentsMap.values());
  } catch (error) {
    console.error('Error getting documents list:', error);
    throw error;
  }
}

async function deleteDocument(docId, collectionName = DEFAULT_COLLECTION) {
  try {
    const response = await fetch(`${CHROMA_URL}/api/v1/collections`);
    const collections = await response.json();
    
    const collection = collections.find(c => c.name === collectionName);
    if (!collection) {
      return { success: true, message: 'Collection does not exist' };
    }
    
    // Get all document IDs for this docId
    const getResponse = await fetch(`${CHROMA_URL}/api/v1/collections/${collection.id}/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        where: { docId },
        include: ['metadatas']
      })
    });
    
    if (!getResponse.ok) {
      throw new Error('Failed to fetch document chunks');
    }
    
    const data = await getResponse.json();
    
    if (!data.ids || data.ids.length === 0) {
      return { success: true, message: 'No chunks found for this document' };
    }
    
    // Delete all chunks for this document
    const deleteResponse = await fetch(`${CHROMA_URL}/api/v1/collections/${collection.id}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ids: data.ids
      })
    });
    
    if (!deleteResponse.ok) {
      throw new Error('Failed to delete document chunks');
    }
    
    return { success: true, message: `Deleted ${data.ids.length} chunks` };
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

async function clearAllDocuments(collectionName = DEFAULT_COLLECTION) {
  try {
    const response = await fetch(`${CHROMA_URL}/api/v1/collections`);
    const collections = await response.json();
    
    const collection = collections.find(c => c.name === collectionName);
    if (!collection) {
      return { success: true, message: 'Collection does not exist' };
    }
    
    // Delete the entire collection
    const deleteResponse = await fetch(`${CHROMA_URL}/api/v1/collections/${collection.id}`, {
      method: 'DELETE'
    });
    
    if (!deleteResponse.ok) {
      const error = await deleteResponse.text();
      throw new Error(`Failed to delete collection: ${error}`);
    }
    
    return { success: true, message: 'All documents cleared from ChromaDB' };
  } catch (error) {
    console.error('Error clearing all documents:', error);
    throw error;
  }
}

module.exports = { 
  getOrCreateCollection, 
  upsertDocuments, 
  querySimilar, 
  getDocumentsList, 
  deleteDocument,
  clearAllDocuments,
  DEFAULT_COLLECTION 
};
