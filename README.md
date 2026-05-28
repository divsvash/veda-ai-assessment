# VedaAI Assessment Creator — Backend

> AI-powered question paper generation system built with Node.js, Express, MongoDB, Redis, BullMQ, and Claude AI.

## Architecture

```
Client (Next.js)
      │
      ▼
┌─────────────────────┐
│   API Gateway        │  POST /api/assignments
│   (Express + TS)     │  GET  /api/assignments/:id/output
└─────────────────────┘
      │ 1. Save to DB    │ 5. WebSocket Updates
      ▼                  ▼
┌───────────┐     ┌──────────────┐
│  MongoDB  │     │  WebSocket   │  ws://host/ws?assignmentId=ID
│           │     │  Server      │
└───────────┘     └──────────────┘
      │
      ▼
┌─────────────────────┐
│   BullMQ Queue       │  Redis-backed job queue
│   (assessment-gen)  │
└─────────────────────┘
      │ 2. Dequeue job
      ▼
┌─────────────────────┐
│   AI Worker          │  Concurrent processing (3 jobs)
│   (BullMQ Worker)   │
└─────────────────────┘
      │ 3. Build prompt
      ▼
┌─────────────────────┐
│  Claude Sonnet 4     │  Structured JSON response
│  (Anthropic API)    │
└─────────────────────┘
      │ 4. Parse + validate
      ▼
┌─────────────────────┐
│   MongoDB            │  Store AssignmentOutput
│   +                  │
│   Redis Cache        │  Cache for fast retrieval
└─────────────────────┘
```

## Job Progress Stages

| Stage               | Progress | Description                         |
|---------------------|----------|-------------------------------------|
| `queued`            | 0%       | Job added to BullMQ queue           |
| `analyzing`         | 10%      | Analyzing syllabus & requirements   |
| `generating`        | 30-60%   | Claude AI generating questions      |
| `balancing`         | 75%      | Difficulty distribution check       |
| `creating_answer_key`| 90%     | Building answer key                 |
| `completed`         | 100%     | Question paper ready                |

## API Endpoints

| Method | Path                                    | Description                   |
|--------|-----------------------------------------|-------------------------------|
| POST   | `/api/assignments`                      | Create + queue generation     |
| GET    | `/api/assignments`                      | List all (paginated)          |
| GET    | `/api/assignments/:id`                  | Get assignment details        |
| GET    | `/api/assignments/:id/output`           | Get generated question paper  |
| GET    | `/api/assignments/:id/status`           | Real-time job status          |
| POST   | `/api/assignments/:id/regenerate-section` | Regenerate one section      |
| DELETE | `/api/assignments/:id`                  | Delete assignment             |
| GET    | `/health`                               | Health check (all services)   |
| GET    | `/health/queue`                         | Queue statistics              |

## WebSocket Protocol

Connect: `ws://localhost:4000/ws?assignmentId=<id>`

**Client → Server messages:**
```json
{ "type": "subscribe", "assignmentId": "abc123" }
{ "type": "unsubscribe", "assignmentId": "abc123" }
{ "type": "ping" }
```

**Server → Client messages:**
```json
{
  "type": "progress",
  "data": {
    "jobId": "assessment-abc123",
    "assignmentId": "abc123",
    "status": "generating",
    "progress": 35,
    "message": "Generating question sections..."
  }
}

{
  "type": "completed",
  "data": {
    "status": "completed",
    "progress": 100,
    "result": { ...AssignmentOutput }
  }
}
```

## Setup & Running

### Prerequisites
- Node.js 20+
- MongoDB 7+
- Redis 7+
- Anthropic API key

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY
```

### 3. Start with Docker (recommended)
```bash
# Start MongoDB + Redis
docker-compose up mongodb redis -d

# Start API server
npm run dev
```

### 4. Or start everything with Docker Compose
```bash
ANTHROPIC_API_KEY=your_key docker-compose up --build
```

### Production: Separate Worker Process
```bash
# Terminal 1: API Server
npm start

# Terminal 2: Worker (can scale independently)
npm run worker
```

## Create Assignment — Example Request

```bash
curl -X POST http://localhost:4000/api/assignments \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Chapter 5 Quiz",
    "subject": "Science",
    "grade": "8th",
    "schoolName": "Delhi Public School, Sector-4, Bokaro",
    "timeAllowed": 45,
    "dueDate": "2025-07-01",
    "questionTypes": [
      {
        "type": "multiple_choice",
        "label": "Multiple Choice Questions",
        "numberOfQuestions": 5,
        "marksPerQuestion": 1
      },
      {
        "type": "short_answer",
        "label": "Short Questions",
        "numberOfQuestions": 3,
        "marksPerQuestion": 2
      },
      {
        "type": "numerical",
        "label": "Numerical Problems",
        "numberOfQuestions": 2,
        "marksPerQuestion": 5
      }
    ],
    "additionalInstructions": "Focus on Chapter 5: Chemical Effects of Electric Current (CBSE NCERT)"
  }'
```

### Response:
```json
{
  "success": true,
  "message": "Assignment created and queued for AI generation",
  "data": {
    "assignment": {
      "id": "6891234abc...",
      "title": "Chapter 5 Quiz",
      "subject": "Science",
      "grade": "8th",
      "status": "queued",
      "jobId": "assessment-6891234abc..."
    }
  }
}
```

## Key Design Decisions

### 1. Structured AI Output
The AI is prompted to return strict JSON. The `responseParser.ts` module:
- Strips markdown fences and preamble
- Falls back to bracket-matched extraction
- Normalizes partial/invalid JSON (trailing commas)
- Validates each field with sensible defaults
- Never renders raw LLM text in the API response

### 2. Error Recovery
```
AI API call → ParseError → retry with stricter prompt (3 attempts)
                         → fallback: normalize invalid JSON
```

### 3. Redis Caching Strategy
- Assignment outputs cached 24h (expensive to regenerate)
- Job state cached 2h (for polling fallback)
- List cache 5min (invalidated on create/delete)

### 4. BullMQ Config
- 3 concurrent workers (configurable)
- Exponential backoff on failure (3 attempts)
- Max 10 jobs/minute (respects Anthropic rate limits)
- Job history: 100 completed, 50 failed retained

## Output Structure (AssignmentOutput)

```typescript
{
  schoolName: string;
  subject: string;
  grade: string;
  timeAllowed: number;          // minutes
  maximumMarks: number;
  generalInstructions: string[];
  sections: Array<{
    id: string;
    title: string;              // "Section A"
    instruction: string;        // "Attempt all questions"
    questionType: QuestionType;
    totalMarks: number;
    questions: Array<{
      id: string;
      text: string;
      type: QuestionType;
      difficulty: 'easy' | 'moderate' | 'hard';
      marks: number;
      options?: string[];       // MCQ only
      answer: string;
      hint?: string;
    }>;
  }>;
}
```
