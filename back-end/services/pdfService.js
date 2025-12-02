const pdfParse = require('pdf-parse');
const { PDFDocument } = require('pdf-lib');

async function pdfBufferToText(buffer) {
  try {
    // Try with default options first
    const data = await pdfParse(buffer);
    return data.text || '';
  } catch (error) {
    console.log('First parse attempt failed:', error.message);
    console.log('Attempting to repair PDF with pdf-lib...');
    
    try {
      // Try to load and repair the PDF with pdf-lib
      const pdfDoc = await PDFDocument.load(buffer, { 
        ignoreEncryption: true,
        updateMetadata: false 
      });
      
      // Save the repaired PDF
      const repairedBuffer = await pdfDoc.save();
      
      console.log('PDF repaired, attempting to parse again...');
      
      // Try parsing the repaired PDF
      const data = await pdfParse(repairedBuffer);
      return data.text || '';
      
    } catch (repairError) {
      console.error('PDF repair/parse error:', repairError.message);
      throw new Error(`Unable to parse PDF: ${repairError.message}. The PDF may be severely corrupted or password-protected.`);
    }
  }
}

function chunkText(text, options = {}) {
  const chunkSize = options.chunkSize || 1000; // characters
  const chunkOverlap = options.chunkOverlap || 200; // characters

  const normalized = text.replace(/\r\n|\r/g, '\n').replace(/\t/g, ' ');
  const paragraphs = normalized.split(/\n\s*\n/);

  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length <= chunkSize) {
      current = current ? current + '\n\n' + para : para;
    } else {
      if (current) chunks.push(current);
      // start new chunk with overlap from the end of previous
      const overlap = current.slice(Math.max(0, current.length - chunkOverlap));
      current = overlap ? overlap + '\n\n' + para : para;
      while (current.length > chunkSize) {
        chunks.push(current.slice(0, chunkSize));
        current = current.slice(chunkSize - chunkOverlap);
      }
    }
  }
  if (current) chunks.push(current);

  return chunks.map((c) => c.trim()).filter(Boolean);
}

module.exports = { pdfBufferToText, chunkText };


