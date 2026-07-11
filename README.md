<div align="center">
  <img src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f6a8/512.gif" alt="🚨" width="60" height="60">
  <h1>Stadium Ops Copilot</h1>
  <p><strong>Real-time, AI-driven tactical command center for high-density venue operations.</strong></p>
  <p>Built for the <strong>Prompt Wars</strong> Challenge.</p>
  
  [![Live Demo](https://img.shields.io/badge/Live_Demo-Play_Now-00E5FF?style=for-the-badge)](https://muralimadhava96-ui.github.io/ops-copilot/)
  [![Tech Stack](https://img.shields.io/badge/Tech-Vanilla_JS_|_FastAPI_|_Gemini-white?style=for-the-badge)](#)
</div>

<br/>

## 🎯 The Problem

Modern stadium operations rely on fragmented legacy systems. When 80,000 fans are moving through a venue, operators are bombarded with raw data (density metrics, IoT sensors, social media sentiment) but lack a unified layer for **tactical synthesis**. 

In high-stress scenarios (like a gate surge or a medical emergency), cognitive overload leads to delayed responses, misallocated resources, and dangerous crowd crushes.

## 🚀 The Solution

**Stadium Ops Copilot** is a real-time, AI-driven command center. It ingests simulated IoT crowd density data and leverages **Google Gemini 2.0 Flash** to synthesize the data into actionable tactical recommendations for the Ops Commander.

### ✨ Key Innovations (Why This Wins)

#### 1. AI Transparency & "Glass Box" Reasoning
We don't just output a "magic" command. The AI engine explicitly generates:
- **Confidence Scores** (e.g., `CONF: 89%`) so commanders know when the model is certain vs. guessing.
- **Explicit Trade-offs**: When manual dispatch is initiated, the system dynamically calculates the impact (e.g., *"⚠ Warning: Leaves Zone C with 0 available Medical Teams"*).
- **Rejected Alternatives**: We show the commander *what else* the AI considered, allowing for rapid human-in-the-loop pivots.

#### 2. Ruthless Operational Safety (Fail-Safes)
Generative AI in the physical world requires physical safety constraints.
- **The 3-Second Abort**: The "Drag to Broadcast" slider initiates a critical PA announcement. Instead of firing instantly, it triggers a high-visibility, screen-reader accessible 3-second abort countdown.
- **Immutable Audit Trails**: Every manual override, whether a broadcast cancellation or a forced dispatch, is logged to the Action Feed with a strict `[Operator ID]` and timestamp, ensuring full post-incident accountability.
- **Graceful Degradation**: If the backend AI server goes offline, the UI seamlessly falls back to a locally mocked static mode so the operator is never staring at a broken screen.

#### 3. Granular Situational Awareness
Instead of highlighting an entire 20,000-person zone, the UI parses event descriptions and dynamically targets specific vector SVG nodes (e.g., pulsing exactly on **Gate G3**).

#### 4. Engineering Rigor
- **API Security**: Destructive REST endpoints are locked down with mandatory API Key headers.
- **Stateless AI with Context**: The Gemini Engine is fed a rolling window of recent decisions, preventing it from double-allocating staff that were moved 30 seconds prior.

## 💻 Tech Stack

- **Frontend:** Pure HTML5, Vanilla JavaScript, Tailwind CSS (via CDN). No heavy frameworks, ensuring 0ms hydration overhead for critical operations.
- **Backend:** Python 3, FastAPI, Uvicorn, WebSockets.
- **AI Brain:** `google-genai` SDK powered by **Gemini 2.0 Flash** for ultra-low latency tactical inference.
- **Deployment:** GitHub Pages (Frontend) + Localhost simulation engine.

## 🏁 How to Run Locally

If you want to run the full AI-simulation engine with Python locally:

```bash
# 1. Clone the repo
git clone https://github.com/muralimadhava96-ui/ops-copilot.git
cd ops-copilot

# 2. Setup Python environment
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Add your Gemini API Key
export GEMINI_API_KEY="your-api-key-here"

# 4. Run the tactical server
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Then visit `http://localhost:8000` in your browser.

> **Note:** You can also test the UI immediately in static mode without running the backend by visiting the [Live Demo](https://muralimadhava96-ui.github.io/ops-copilot/).

---
*Developed with passion and urgency using Advanced Agentic Coding.*
