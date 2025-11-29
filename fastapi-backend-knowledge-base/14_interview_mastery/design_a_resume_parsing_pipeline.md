# Design a Resume Parsing Pipeline: Complete Interview Guide

How to design and explain a resume parsing pipeline in interviews, covering architecture, error handling, scalability, and AI integration.

## Overview: Resume Parsing Pipeline

**Goal:** Transform unstructured resume documents into structured, searchable data with AI-powered extraction and matching.

**Pipeline Stages:**
```
Upload → Extraction → Parsing → Enrichment → Storage → Matching
```

## Pipeline Architecture

### High-Level Architecture

```
┌─────────────┐
│   Client    │ Uploads resume (PDF, DOCX)
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  FastAPI API    │ Receives upload
│  (Upload End)   │
└──────┬──────────┘
       │
       │ Queue Task
       ▼
┌─────────────────┐
│  Celery Worker  │ Background processing
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

```python
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter()

@router.post("/resumes/upload")
async def upload_resume(
    file: UploadFile = File(...),
    user_id: int = Depends(get_current_user_id),
    celery_app: Celery = Depends(get_celery)
):
    """
    Upload resume and trigger parsing pipeline.
    
    Validates file, stores temporarily, queues background task.
    """
    # Validate file type
    allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Supported: PDF, DOCX"
        )
    
    # Validate file size (max 10MB)
    MAX_SIZE = 10 * 1024 * 1024  # 10MB
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large: {len(content)} bytes. Maximum: {MAX_SIZE} bytes"
        )
    
    # Store file temporarily
    file_id = str(uuid.uuid4())
    file_path = f"/tmp/resumes/{file_id}_{file.filename}"
    
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Queue parsing task
    task = celery_app.send_task(
        "tasks.parse_resume",
        args=[file_path, user_id, file_id],
        countdown=0
    )
    
    return JSONResponse({
        "status": "uploaded",
        "file_id": file_id,
        "task_id": task.id,
        "message": "Resume uploaded successfully. Parsing in progress."
    })
```

### File Validation Service

```python
class FileValidationService:
    """Validate uploaded resume files."""
    
    ALLOWED_EXTENSIONS = {".pdf", ".docx"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    def validate_file(self, file: UploadFile) -> dict:
        """Validate file and return validation result."""
        errors = []
        
        # Check extension
        if not any(file.filename.endswith(ext) for ext in self.ALLOWED_EXTENSIONS):
            errors.append(f"Invalid file extension. Allowed: {', '.join(self.ALLOWED_EXTENSIONS)}")
        
        # Check content type
        if file.content_type not in ["application/pdf", 
                                     "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]:
            errors.append(f"Invalid content type: {file.content_type}")
        
        return {
            "valid": len(errors) == 0,
            "errors": errors
        }
```

## Step 2: Text Extraction

### Extract Text from Documents

```python
import pdfplumber
from docx import Document

class TextExtractionService:
    """Extract text from various document formats."""
    
    async def extract_text(self, file_path: str) -> dict:
        """
        Extract text from resume file.
        
        Returns:
            dict with 'text' (full text) and 'metadata' (file info)
        """
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext == ".pdf":
            return await self._extract_from_pdf(file_path)
        elif file_ext == ".docx":
            return await self._extract_from_docx(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_ext}")
    
    async def _extract_from_pdf(self, file_path: str) -> dict:
        """Extract text from PDF."""
        text_parts = []
        
        with pdfplumber.open(file_path) as pdf:
            metadata = {
                "page_count": len(pdf.pages),
                "title": pdf.metadata.get("Title", ""),
                "author": pdf.metadata.get("Author", "")
            }
            
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        
        return {
            "text": "\n\n".join(text_parts),
            "metadata": metadata,
            "extraction_method": "pdfplumber"
        }
    
    async def _extract_from_docx(self, file_path: str) -> dict:
        """Extract text from DOCX."""
        doc = Document(file_path)
        
        text_parts = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text_parts.append(paragraph.text)
        
        return {
            "text": "\n\n".join(text_parts),
            "metadata": {
                "paragraph_count": len(doc.paragraphs)
            },
            "extraction_method": "python-docx"
        }
```

## Step 3: AI-Powered Parsing

### Structured Extraction with LLM

```python
from openai import AsyncOpenAI
from pydantic import BaseModel

class ResumeData(BaseModel):
    """Structured resume data extracted from text."""
    name: str
    email: Optional[str]
    phone: Optional[str]
    location: Optional[str]
    summary: Optional[str]
    experience: List[dict]  # [{title, company, start_date, end_date, description}]
    education: List[dict]   # [{degree, school, graduation_year}]
    skills: List[str]
    certifications: List[str]

class ResumeParsingService:
    """Parse resume text into structured data using LLM."""
    
    def __init__(self, openai_client: AsyncOpenAI):
        self.client = openai_client
    
    async def parse_resume(self, text: str) -> ResumeData:
        """
        Parse resume text into structured format using LLM.
        
        Uses structured output to ensure consistent format.
        """
        prompt = f"""
        Parse the following resume text and extract structured information.
        
        Resume Text:
        {text[:4000]}  # Limit to avoid token limits
        
        Extract the following information:
        - Personal information (name, email, phone, location)
        - Professional summary
        - Work experience (with dates, companies, titles, descriptions)
        - Education (degrees, schools, graduation years)
        - Skills (technical and soft skills)
        - Certifications
        
        Return structured JSON format.
        """
        
        response = await self.client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are an expert resume parser. Extract structured data from resumes."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"},  # Ensure JSON output
            temperature=0.1  # Low temperature for consistent parsing
        )
        
        # Parse structured output
        parsed_data = json.loads(response.choices[0].message.content)
        
        # Convert to Pydantic model for validation
        return ResumeData(**parsed_data)
```

### Alternative: Using LangChain

```python
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate
from langchain.output_parsers import PydanticOutputParser

class ResumeParserWithLangChain:
    """Alternative parsing using LangChain for better structure."""
    
    def __init__(self, llm):
        self.llm = llm
        self.parser = PydanticOutputParser(pydantic_object=ResumeData)
    
    async def parse_resume(self, text: str) -> ResumeData:
        """Parse resume using LangChain."""
        prompt = PromptTemplate(
            template="""
            Parse the following resume text and extract structured information.
            
            {format_instructions}
            
            Resume Text:
            {resume_text}
            """,
            input_variables=["resume_text"],
            partial_variables={"format_instructions": self.parser.get_format_instructions()}
        )
        
        chain = LLMChain(llm=self.llm, prompt=prompt, output_parser=self.parser)
        
        result = await chain.ainvoke({"resume_text": text[:4000]})
        return result
```

## Step 4: Skill Extraction and Normalization

### Extract and Normalize Skills

```python
class SkillExtractionService:
    """Extract and normalize skills from resume."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def extract_and_normalize_skills(self, resume_data: ResumeData) -> List[dict]:
        """
        Extract skills from resume and normalize against skill catalog.
        
        Returns:
            List of {skill_id, skill_name, confidence, source}
        """
        # Get all skills from resume text and structured data
        all_skill_mentions = set()
        
        # From structured skills field
        if resume_data.skills:
            all_skill_mentions.update(resume_data.skills)
        
        # Extract from experience descriptions
        for exp in resume_data.experience:
            skills_from_exp = self._extract_skills_from_text(exp.get("description", ""))
            all_skill_mentions.update(skills_from_exp)
        
        # Normalize skills against catalog
        normalized_skills = []
        for skill_mention in all_skill_mentions:
            normalized = await self._normalize_skill(skill_mention)
            if normalized:
                normalized_skills.append(normalized)
        
        return normalized_skills
    
    async def _normalize_skill(self, skill_mention: str) -> Optional[dict]:
        """Normalize skill mention to catalog skill."""
        # Search for exact match
        exact_match = await self.db.execute(
            select(Skill).where(func.lower(Skill.name) == skill_mention.lower())
        )
        if exact_match.scalar_one_or_none():
            skill = exact_match.scalar_one()
            return {
                "skill_id": skill.id,
                "skill_name": skill.name,
                "confidence": 1.0,
                "source": "exact_match"
            }
        
        # Search for fuzzy match (using similarity)
        similar_skills = await self.db.execute(
            select(Skill).where(
                func.similarity(Skill.name, skill_mention) > 0.7  # PostgreSQL similarity
            ).order_by(func.similarity(Skill.name, skill_mention).desc())
        )
        
        similar = similar_skills.scalar_one_or_none()
        if similar:
            return {
                "skill_id": similar.id,
                "skill_name": similar.name,
                "confidence": 0.8,
                "source": "fuzzy_match"
            }
        
        # No match found - could create new skill or return None
        return None
    
    def _extract_skills_from_text(self, text: str) -> List[str]:
        """Extract skill mentions from text using simple pattern matching."""
        # In production, use NER model or skill extraction API
        common_skills = ["Python", "JavaScript", "SQL", "AWS", "Docker", "Kubernetes"]
        found_skills = []
        
        text_lower = text.lower()
        for skill in common_skills:
            if skill.lower() in text_lower:
                found_skills.append(skill)
        
        return found_skills
```

## Step 5: Embedding Generation

### Generate Resume Embeddings

```python
class EmbeddingService:
    """Generate embeddings for semantic search."""
    
    def __init__(self, openai_client: AsyncOpenAI):
        self.client = openai_client
        self.model = "text-embedding-3-large"  # 3072 dimensions
        # Or use text-embedding-3-small for 1536 dimensions
    
    async def generate_resume_embedding(self, resume_data: ResumeData) -> List[float]:
        """
        Generate embedding from structured resume data.
        
        Creates comprehensive text representation for embedding.
        """
        # Combine all resume information into single text
        embedding_text = self._create_embedding_text(resume_data)
        
        response = await self.client.embeddings.create(
            model=self.model,
            input=embedding_text
        )
        
        return response.data[0].embedding
    
    def _create_embedding_text(self, resume_data: ResumeData) -> str:
        """Create comprehensive text representation for embedding."""
        parts = []
        
        if resume_data.summary:
            parts.append(f"Summary: {resume_data.summary}")
        
        parts.append(f"Skills: {', '.join(resume_data.skills)}")
        
        # Experience
        for exp in resume_data.experience:
            exp_text = f"{exp.get('title', '')} at {exp.get('company', '')}: {exp.get('description', '')}"
            parts.append(exp_text)
        
        # Education
        for edu in resume_data.education:
            edu_text = f"{edu.get('degree', '')} from {edu.get('school', '')}"
            parts.append(edu_text)
        
        return "\n".join(parts)
```

## Step 6: Complete Pipeline Implementation

### Celery Task for Pipeline

```python
@celery_app.task(bind=True, max_retries=3)
async def parse_resume_task(self, file_path: str, user_id: int, file_id: str):
    """
    Complete resume parsing pipeline.
    
    Steps:
    1. Extract text
    2. Parse with AI
    3. Extract skills
    4. Generate embedding
    5. Store in database
    6. Trigger job matching
    """
    try:
        # Initialize services
        text_extractor = TextExtractionService()
        parser = ResumeParsingService(openai_client)
        skill_extractor = SkillExtractionService(db)
        embedding_service = EmbeddingService(openai_client)
        
        # Step 1: Extract text
        extraction_result = await text_extractor.extract_text(file_path)
        resume_text = extraction_result["text"]
        
        # Step 2: Parse with AI
        resume_data = await parser.parse_resume(resume_text)
        
        # Step 3: Extract and normalize skills
        normalized_skills = await skill_extractor.extract_and_normalize_skills(resume_data)
        
        # Step 4: Generate embedding
        embedding = await embedding_service.generate_resume_embedding(resume_data)
        
        # Step 5: Store in database
        job_seeker = await db.get(JobSeeker, user_id)
        
        job_seeker.resume_data = resume_data.dict()  # Store structured data as JSONB
        job_seeker.resume_text = resume_text  # Store full text
        job_seeker.resume_embedding = embedding  # Store vector
        
        await db.commit()
        
        # Associate skills
        for skill_info in normalized_skills:
            await db.execute(
                job_seeker_skills.insert().values(
                    job_seeker_id=user_id,
                    skill_id=skill_info["skill_id"],
                    proficiency_level="expert"  # Could be inferred
                )
            )
        await db.commit()
        
        # Step 6: Trigger job matching (async)
        celery_app.send_task(
            "tasks.match_jobs_for_seeker",
            args=[user_id],
            countdown=5  # Delay slightly to ensure commit
        )
        
        # Cleanup temp file
        os.remove(file_path)
        
        return {
            "status": "success",
            "file_id": file_id,
            "parsed_data": resume_data.dict()
        }
    
    except Exception as e:
        logger.error(f"Resume parsing failed: {e}", exc_info=True)
        
        # Cleanup on failure
        if os.path.exists(file_path):
            os.remove(file_path)
        
        # Retry with exponential backoff
        raise self.retry(exc=e, countdown=2 ** self.request.retries)
```

## Step 7: Error Handling and Resilience

### Comprehensive Error Handling

```python
class ResumeParsingError(Exception):
    """Base exception for resume parsing."""
    pass

class TextExtractionError(ResumeParsingError):
    """Failed to extract text from document."""
    pass

class ParsingError(ResumeParsingError):
    """Failed to parse structured data."""
    pass

async def parse_resume_with_error_handling(file_path: str, user_id: int):
    """Parse resume with comprehensive error handling."""
    try:
        # Extract text
        try:
            text_result = await text_extractor.extract_text(file_path)
        except Exception as e:
            raise TextExtractionError(f"Failed to extract text: {e}")
        
        # Parse with retries
        max_parse_retries = 3
        resume_data = None
        for attempt in range(max_parse_retries):
            try:
                resume_data = await parser.parse_resume(text_result["text"])
                break
            except Exception as e:
                if attempt == max_parse_retries - 1:
                    raise ParsingError(f"Failed to parse after {max_parse_retries} attempts: {e}")
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
        
        return resume_data
    
    except ResumeParsingError:
        # Store raw text for manual review
        await store_raw_resume_for_review(file_path, user_id)
        raise
```

## Step 8: Scalability Considerations

### Performance Optimizations

**1. Caching:**
```python
# Cache parsed results for similar resumes
@cache_result(ttl=3600)
async def parse_resume_cached(text_hash: str, text: str):
    """Parse with caching."""
    return await parser.parse_resume(text)
```

**2. Batch Processing:**
```python
# Process multiple resumes in batch
async def batch_parse_resumes(file_paths: List[str]):
    """Parse multiple resumes concurrently."""
    tasks = [parse_resume_task.delay(path) for path in file_paths]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

**3. Queue Prioritization:**
```python
# Priority queue for premium users
@celery_app.task(queue="high_priority")
async def parse_resume_priority(file_path: str, user_id: int):
    """High-priority parsing for premium users."""
    return await parse_resume_task(file_path, user_id)
```

## Interview Talking Points

1. **Pipeline stages**: Explain each stage and why it's needed
2. **Error handling**: How to handle failures at each stage
3. **Scalability**: How to handle high volume (queues, workers, caching)
4. **AI integration**: Why use LLM for parsing (flexibility vs rules)
5. **Data quality**: How to ensure parsing accuracy

## Summary

A well-designed resume parsing pipeline includes:
- ✅ File validation and upload
- ✅ Text extraction from multiple formats
- ✅ AI-powered structured parsing
- ✅ Skill extraction and normalization
- ✅ Embedding generation for matching
- ✅ Comprehensive error handling
- ✅ Scalability considerations

Explain each stage clearly and show understanding of trade-offs!
