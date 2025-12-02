const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { pdfBufferToText, chunkText } = require('../services/pdfService');
const { embedTexts } = require('../services/embeddingService');
const { upsertDocuments, DEFAULT_COLLECTION } = require('../services/chromaService');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const UPLOADS_DIR = path.join(__dirname, '../uploads');

router.post('/upload-pdf', upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received');
    if (!req.file) {
      console.log('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', req.file.originalname, 'Size:', req.file.size);
    const docId = uuidv4();
    const fileName = req.file.originalname;
    
    console.log('Parsing PDF...');
    const text = await pdfBufferToText(req.file.buffer);
    console.log('Text extracted, length:', text.length);
    
    const chunks = chunkText(text, { chunkSize: 1200, chunkOverlap: 200 });
    console.log('Text chunked into', chunks.length, 'chunks');

    if (chunks.length === 0) {
      return res.status(400).json({ error: 'Could not extract text from PDF' });
    }

    console.log('Creating embeddings...');
    const embeddings = await embedTexts(chunks);
    console.log('Embeddings created');
    
    const ids = chunks.map((_, i) => `${docId}:${i}`);
    const metadatas = chunks.map((_, i) => ({ docId, chunkIndex: i, fileName }));

    console.log('Upserting to ChromaDB...');
    await upsertDocuments({
      ids,
      documents: chunks,
      metadatas,
      embeddings,
    });
    console.log('Upload complete!');

    // Save PDF file to disk
    const filePath = path.join(UPLOADS_DIR, `${docId}.pdf`);
    await fs.writeFile(filePath, req.file.buffer);
    console.log('PDF saved to:', filePath);

    return res.json({
      status: 'ok',
      collection: DEFAULT_COLLECTION,
      docId,
      fileName,
      chunks: chunks.length,
    });
  } catch (err) {
    console.error('Upload error:', err);
    console.error('Error stack:', err.stack);
    return res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});

// View PDF in browser
router.get('/pdf/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    const filePath = path.join(UPLOADS_DIR, `${docId}.pdf`);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'PDF not found' });
    }
    
    // Send PDF file
    res.contentType('application/pdf');
    res.sendFile(filePath);
  } catch (err) {
    console.error('Error retrieving PDF:', err);
    res.status(500).json({ error: 'Failed to retrieve PDF', details: err.message });
  }
});

// Download PDF
router.get('/pdf/:docId/download', async (req, res) => {
  try {
    const { docId } = req.params;
    const { fileName } = req.query;
    const filePath = path.join(UPLOADS_DIR, `${docId}.pdf`);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'PDF not found' });
    }
    
    // Send PDF as download
    res.download(filePath, fileName || `${docId}.pdf`);
  } catch (err) {
    console.error('Error downloading PDF:', err);
    res.status(500).json({ error: 'Failed to download PDF', details: err.message });
  }
});

// Delete a specific document
router.delete('/pdf/:docId', async (req, res) => {
  try {
    const { docId } = req.params;
    const filePath = path.join(UPLOADS_DIR, `${docId}.pdf`);
    
    // Delete PDF file
    try {
      await fs.unlink(filePath);
      console.log('PDF file deleted:', filePath);
    } catch (err) {
      console.log('PDF file not found or already deleted:', filePath);
    }
    
    // Note: ChromaDB chunks will be handled by chromaService
    res.json({ status: 'ok', message: 'Document deleted successfully' });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: 'Failed to delete document', details: err.message });
  }
});

module.exports = router;


