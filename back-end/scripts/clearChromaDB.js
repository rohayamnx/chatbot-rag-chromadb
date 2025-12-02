#!/usr/bin/env node

/**
 * Script to clear all test data from ChromaDB
 * Usage: node scripts/clearChromaDB.js
 */

require('dotenv').config();

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const COLLECTION_NAME = process.env.CHROMA_COLLECTION || 'documents';

async function clearChromaDB() {
  try {
    console.log('Fetching collections from ChromaDB...');
    
    // Get all collections
    const response = await fetch(`${CHROMA_URL}/api/v1/collections`);
    const collections = await response.json();
    
    console.log(`Found ${collections.length} collection(s)`);
    
    // Find and delete the documents collection
    for (const collection of collections) {
      if (collection.name === COLLECTION_NAME) {
        console.log(`Deleting collection: ${collection.name} (ID: ${collection.id})`);
        
        const deleteResponse = await fetch(`${CHROMA_URL}/api/v1/collections/${collection.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log('✓ Collection deleted successfully');
        } else {
          const error = await deleteResponse.text();
          console.log('Note:', error);
        }
      }
    }
    
    console.log('\n✓ ChromaDB cleanup complete!');
    console.log('The collection will be recreated automatically when you upload your next PDF.');
    
  } catch (error) {
    console.error('Error clearing ChromaDB:', error.message);
    process.exit(1);
  }
}

clearChromaDB();

