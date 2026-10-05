# 🎯 AI Preparation Hub

**A fully static AI Interview Preparation app — no server, no database, no login required.**  
All progress and drill scores are saved in your browser's `localStorage`.

## Live Demo
> Deploy to GitHub Pages and your URL will be:  
> `https://<your-username>.github.io/<repo-name>/`

## Features
- **7 Chapters, 31 Sections, 61 Topics, 166 Drill Questions**
- Beginner → Expert learning path (Ch1 Foundations → Ch7 Advanced)
- Collapsible chapter sidebar with `X.Y` section numbering
- Example → Quick Answer → Deep Dive → Drill per topic
- Self-rating system (1–5) with `localStorage` persistence
- Dashboard: readiness ring, score trend, activity heatmap, weak spots
- Search across all topics, examples, and drill questions
- Psychology-optimised dark design (Inter font, amber+indigo palette)
- 100% static — works on GitHub Pages, Netlify, Vercel, or any CDN

## Deploy to GitHub Pages

1. Create a new GitHub repo (e.g. `ai-preparation`)
2. Push this folder contents to the repo root:
   ```bash
   git init
   git add .
   git commit -m "initial"
   git remote add origin https://github.com/<you>/<repo>.git
   git push -u origin main
   ```
3. Go to **Settings → Pages → Source → Deploy from branch → main / root**
4. Visit `https://<you>.github.io/<repo>/`

## File Structure
```
ai-preparation/
├── index.html          # Study page (chapters + topics)
├── questions.html      # Drill questions with self-rating
├── dashboard.html      # Progress dashboard
├── css/
│   └── app.css         # Psychology-optimised design system
└── js/
    ├── common.js       # Shared utilities + localStorage store
    └── data.js         # All 31 sections (generated from topics.js)
```

## Chapter Map
| Chapter | Title | Sections |
|---------|-------|----------|
| Ch1 | Foundations | Traditional ML, AI/ML Fundamentals, NLP/RNN/LSTM, Transformers |
| Ch2 | LLM Core | LLM Fundamentals, LLM Models Guide, Prompt Engineering, Fine-Tuning |
| Ch3 | Retrieval & RAG | Vector Databases, RAG, GraphRAG, Agentic RAG |
| Ch4 | Agents | Agents, Agent Frameworks, MCP/A2A, Bedrock Agent Core, Google ADK |
| Ch5 | Evaluation & Safety | Evaluation, Observability, AI Security, MLOps/LLMOps |
| Ch6 | Infrastructure | Python Async, FastAPI+Redis+PG, SQL, Databricks, AWS/Bedrock, Kubernetes |
| Ch7 | Advanced & System Design | Enterprise AI Design, Advanced AI Topics, Your Projects |
