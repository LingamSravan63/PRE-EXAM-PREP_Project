const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Set up multer for file storage
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

const AI_SERVICE_URL = 'http://localhost:5001/api/process';

// Route for handling file uploads
app.post('/api/upload', upload.single('document'), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: 'Please upload a file!' });
    }

    try {
        // We need to create a new FormData object to forward the file to the Python service
        const formData = new FormData();
        formData.append('file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        // Forward the request to the Python AI service
        const response = await axios.post(AI_SERVICE_URL, formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        // Send the AI service's response back to the client
        res.json(response.data);

    } catch (error) {
        console.error('Error forwarding file to AI service:', error.message);
        res.status(500).send({ message: 'Failed to process the document.', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server is running on http://localhost:${port}`);
});