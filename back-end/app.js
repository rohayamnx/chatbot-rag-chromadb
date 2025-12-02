const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const chatRoutes = require('./routes/chat');
const uploadRoutes = require('./routes/upload');
const ragRoutes = require('./routes/rag');
const documentsRoutes = require('./routes/documents');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(bodyParser.json());
app.use('/api', chatRoutes);
app.use('/api', uploadRoutes);
app.use('/api', ragRoutes);
app.use('/api', documentsRoutes);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
