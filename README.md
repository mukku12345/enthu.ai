# EnthuAI QA Call Intelligence

A MERN demo for sales contact-center QA teams. Analysts can upload calls, the backend queues processing work, and managers get a dashboard with transcript, speaker separation, summaries, scorecards, emotion arcs, flags, and natural-language search.

## Stack

- MongoDB + Mongoose for call records and processing state
- Express for REST APIs and upload handling
- Local disk or Amazon S3 for call recording storage
- React + Vite for the manager dashboard
- Recharts for agent/customer emotion arc visualization
- AssemblyAI integration for real audio transcription and speaker diarization when `ASSEMBLYAI_API_KEY` is set
- A modular processing service with a demo fallback when no transcription provider key is configured

The app uses `server/.env` for MongoDB Atlas, queue concurrency, optional S3 storage, and Slack failure notifications. If MongoDB is unavailable, it falls back to an in-memory store so local review still works.

## Run

```bash
npm run install:all
npm start
```

Client: http://localhost:3000

Server: http://localhost:5000

## Environment

Create `server/.env` when needed:

```bash
PORT=5000
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<database>?appName=<app>
MONGO_DB_NAME=enthuai_qa
PROCESSING_CONCURRENCY=2
ASSEMBLYAI_API_KEY=

STORAGE_DRIVER=local
# STORAGE_DRIVER=s3
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_S3_PREFIX=call-recordings
AWS_S3_PUBLIC_BASE_URL=
AWS_S3_ENDPOINT=
AWS_S3_FORCE_PATH_STYLE=false

SLACK_WEBHOOK_URL=
```

Set `STORAGE_DRIVER=s3` when you want uploaded recordings to go to S3. `AWS_S3_ENDPOINT` and `AWS_S3_FORCE_PATH_STYLE` are optional and mostly useful for S3-compatible storage such as MinIO.

`SLACK_WEBHOOK_URL` is optional. When set, processing failures are posted with call context.

## What Is Covered

- Upload recorded calls without blocking the UI
- Store call metadata in MongoDB Atlas
- Store audio locally or in S3 through one storage service
- Queue processing with configurable concurrency
- Generate real transcript and speaker turns through AssemblyAI when configured
- Fall back to demo transcript, summary, scorecard, flags, and emotion timeline when no provider key is present
- Natural-language style search over generated semantic text
- Notify failures through Slack webhook when configured

For higher scale, replace the in-process queue in `server/src/services/jobQueue.js` with BullMQ/SQS/Kafka workers and move provider-specific transcription/LLM/vector logic behind `server/src/services/processor.js`.
