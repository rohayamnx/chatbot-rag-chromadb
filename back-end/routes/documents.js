const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { getDocumentsList, deleteDocument, clearAllDocuments } = require('../services/chromaService');

const router = express.Router();
const UPLOADS_DIR = path.join(__dirname, '../uploads');

router.get('/documents', async (req, res) => {
  try {
    const documents = await getDocumentsList();
    res.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
});

// Delete a specific document (both PDF file and ChromaDB entries)
router.delete('/documents/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    
    // Delete from ChromaDB
    const chromaResult = await deleteDocument(docId);
    console.log('ChromaDB deletion result:', chromaResult);
    
    // Delete PDF file
    const filePath = path.join(UPLOADS_DIR, `${docId}.pdf`);
    try {
      await fs.unlink(filePath);
      console.log('PDF file deleted:', filePath);
    } catch (err) {
      console.log('PDF file not found or already deleted:', filePath);
    }
    
    res.json({ 
      status: 'ok', 
      message: 'Document deleted successfully',
      chromaResult 
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document', details: error.message });
  }
});

// Clear all documents (both PDF files and ChromaDB)
router.delete('/documents', async (req, res) => {
  try {
    // Clear all from ChromaDB
    const chromaResult = await clearAllDocuments();
    console.log('ChromaDB clear result:', chromaResult);
    
    // Delete all PDF files
    try {
      const files = await fs.readdir(UPLOADS_DIR);
      const pdfFiles = files.filter(f => f.endsWith('.pdf'));
      
      await Promise.all(
        pdfFiles.map(file => 
          fs.unlink(path.join(UPLOADS_DIR, file))
            .catch(err => console.log('Error deleting file:', file, err.message))
        )
      );
      
      console.log(`Deleted ${pdfFiles.length} PDF files`);
      
      res.json({ 
        status: 'ok', 
        message: `All documents cleared (${pdfFiles.length} files deleted)`,
        chromaResult 
      });
    } catch (err) {
      console.error('Error clearing PDF files:', err);
      res.json({ 
        status: 'partial', 
        message: 'ChromaDB cleared but error deleting some files',
        chromaResult,
        error: err.message
      });
    }
  } catch (error) {
    console.error('Error clearing all documents:', error);
    res.status(500).json({ error: 'Failed to clear documents', details: error.message });
  }
});

module.exports = router;

