# Design a Resume Parsing Pipeline: Complete Interview Guide

How to design and explain a resume parsing pipeline in interviews, covering architecture, error handling, scalability, and AI integration for Express.js applications.

## Overview: Resume Parsing Pipeline

**Goal:** Transform unstructured resume documents into structured, searchable data with AI-powered extraction and matching.

**Pipeline Stages:** Upload → Extraction → Parsing → Enrichment → Storage → Matching

## Pipeline Architecture

### High-Level Architecture

```
┌─────────────┐
│   Client    │ Uploads resume (PDF, DOCX)
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Express API    │ Receives upload
│  (Upload End)   │
└──────┬──────────┘
       │
       │ Queue Task
       ▼
┌─────────────────┐
│  Bull Worker    │ Background processing
│  (Processing)   │
└──────┬──────────┘
       │
       ├─► Text Extraction
       ├─► AI Parsing (LLM)
       ├─► Skill Extraction
       ├─► Embedding Generation
       └─► Storage
              │
              ▼
       ┌─────────────────┐
       │  Job Matching   │ Semantic search
       │   Service       │
       └─────────────────┘
```

## Step 1: Upload and Validation

### File Upload Endpoint

```javascript
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

app.post('/resumes/upload', upload.single('resume'), async (req, res) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Unsupported file type' });
    }
    
    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (req.file.size > MAX_SIZE) {
        return res.status(400).json({ error: 'File too large' });
    }
    
    // Queue parsing task
    const fileId = require('crypto').randomUUID();
    const task = await resumeQueue.add('parse-resume', {
        filePath: req.file.path,
        userId: req.user.id,
        fileId
    });
    
    res.json({
        status: 'uploaded',
        file_id: fileId,
        task_id: task.id,
        message: 'Resume uploaded successfully. Parsing in progress.'
    });
});
```

## Step 2: Text Extraction

### Extract Text from Documents

```javascript
const pdf = require('pdf-parse');
const mammoth = require('mammoth');

class TextExtractionService {
    async extractText(filePath, mimeType) {
        if (mimeType === 'application/pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            return {
                text: data.text,
                metadata: {
                    pages: data.numpages,
                    info: data.info
                }
            };
        } else if (mimeType.includes('wordprocessingml')) {
            const result = await mammoth.extractRawText({ path: filePath });
            return {
                text: result.value,
                metadata: {}
            };
        }
        throw new Error('Unsupported file type');
    }
}
```

## Step 3: AI Parsing

### Parse Resume with LLM

```javascript
const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class ResumeParsingService {
    async parseResume(text) {
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
                {
                    role: 'system',
                    content: 'Extract structured information from resume text.'
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            functions: [{
                name: 'extract_resume_data',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        email: { type: 'string' },
                        phone: { type: 'string' },
                        skills: { type: 'array', items: { type: 'string' } },
                        experience: { type: 'array' },
                        education: { type: 'array' }
                    }
                }
            }],
            function_call: { name: 'extract_resume_data' }
        });
        
        return JSON.parse(response.choices[0].message.function_call.arguments);
    }
}
```

## Step 4: Storage and Matching

### Store Parsed Resume

```javascript
// Store resume with embedding
async function storeResume(userId, parsedData, text) {
    // Generate embedding
    const embedding = await generateEmbedding(text);
    
    // Store in database
    await Resume.create({
        user_id: userId,
        name: parsedData.name,
        email: parsedData.email,
        skills: parsedData.skills,
        experience: parsedData.experience,
        education: parsedData.education,
        resume_text: text,
        embedding: JSON.stringify(embedding)
    });
}
```

## Best Practices

1. **File Validation**: Validate type and size
2. **Background Processing**: Use queues for parsing
3. **Error Handling**: Handle extraction failures
4. **Caching**: Cache parsed results
5. **Monitoring**: Track parsing success/failure rates

## Summary

**Resume Parsing Pipeline:**

1. **Stages**: Upload → Extraction → Parsing → Storage → Matching
2. **Tools**: Multer, PDF parsing, LLM, pgvector
3. **Architecture**: API + Queue + Workers
4. **Best Practice**: Validate, queue, parse, store, match
5. **Use Cases**: Job platforms, ATS systems

**Key Takeaway:**
Resume parsing pipeline transforms unstructured resumes into structured data. Use Express.js for upload, Bull queue for background processing, LLM for parsing, and pgvector for semantic matching. Validate files, handle errors gracefully, and monitor the pipeline.

**Pipeline Strategy:**
- Validate uploads
- Queue for processing
- Extract text
- Parse with AI
- Store with embeddings
- Match semantically

**Next Steps:**
- Learn [File Handling](../11_file_storage_and_media/01_file_handling_mastery.md) for uploads
- Study [AI Integration](../12_ai_and_llm_integration/) for parsing
- Master [Background Jobs](../08_background_jobs_and_task_queues/) for queues

