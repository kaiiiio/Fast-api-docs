# System Design: Resume Parsing Pipeline

## 1. Requirements

- **Input**: PDF/Word Resumes.
- **Output**: Structured JSON (Name, Skills, Experience).
- **Scale**: 10,000 resumes/day.
- **Latency**: Async (User gets email when done).

---

## 2. High Level Architecture

1.  **API Gateway**: Receives Upload (`POST /resumes`).
2.  **S3**: Stores raw file.
3.  **Kafka**: Publishes event `ResumeUploaded`.
4.  **OCR Service**: Consumes event. Extracts text (Tesseract/Textract). Publishes `TextExtracted`.
5.  **Parser Service (LLM)**: Consumes `TextExtracted`. Sends to GPT-4. Publishes `ResumeParsed`.
6.  **DB Service**: Saves JSON to MongoDB.

---

## 3. Key Challenges & Solutions

### Challenge: OCR is slow (30s)
**Solution**: Async processing. Don't block the HTTP request. Return `202 Accepted` and a `jobId`.

### Challenge: LLM Hallucinations
**Solution**: Use "Structured Output" (JSON Schema). Validate output against a Pydantic/Java Record model.

### Challenge: Duplicate Resumes
**Solution**: Calculate SHA-256 hash of the file. Check Redis before processing.

---

## 4. Data Model (MongoDB)

```json
{
  "_id": "resume_123",
  "userId": "user_99",
  "status": "COMPLETED",
  "rawText": "...",
  "parsedData": {
    "skills": ["Java", "Spring"],
    "experience": [
      { "company": "Google", "years": 2 }
    ]
  }
}
```
