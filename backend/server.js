const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const FormData = require('form-data');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ─── Multer storage for video uploads ─────────────────────────────────────────
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, 'recording-' + Date.now() + path.extname(file.originalname))
});
const uploadVideo = multer({ storage: videoStorage });

// ─── Multer storage for resume uploads ───────────────────────────────────────
const resumeStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './uploads';
        if (!fs.existsSync(dir)) fs.mkdirSync(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, 'resume-' + Date.now() + path.extname(file.originalname))
});
const uploadResume = multer({ storage: resumeStorage });

// ─── Fallback Question Banks ──────────────────────────────────────────────────
const FALLBACK_QUESTIONS = {
    technical: {
        easy:   ["What is the difference between let, var, and const?","What is a REST API?","Explain what HTML and CSS are.","What is a loop and when would you use one?","What is version control?"],
        medium: ["Explain closures in JavaScript.","What is the event loop in Node.js?","What is the difference between SQL and NoSQL?","Explain REST vs GraphQL.","What are React hooks?"],
        hard:   ["Design a distributed rate limiter.","Explain CAP theorem.","How would you optimize a slow database query?","What are microservices vs monolith tradeoffs?","Explain ACID properties."]
    },
    hr: {
        easy:   ["Tell me about yourself.","Why are you looking for a new job?","What are your hobbies?","How do you handle feedback?","Are you a team player?"],
        medium: ["Why do you want to work here?","What are your strengths and weaknesses?","Describe a challenge you overcame.","Where do you see yourself in 5 years?","How do you prioritize work?"],
        hard:   ["Tell me about a time you disagreed with your manager.","Describe a situation where you failed.","How would you handle a toxic team?","Tell me about a time you influenced without authority.","Describe managing competing priorities under pressure."]
    },
    behavioral: {
        easy:   ["Describe a time you worked in a team.","Tell me about a goal you achieved.","How do you handle stress?","What motivates you?","Describe helping a colleague."],
        medium: ["Tell me about a time you showed leadership.","Describe a conflict with a coworker.","Give an example of creative problem solving.","Tell me about your proudest project.","Describe learning something quickly."],
        hard:   ["Tell me about a decision with incomplete information.","Describe pivoting strategy mid-project.","Tell me about managing a failing project.","Describe driving organizational change.","Tell me about your most difficult stakeholder."]
    },
    managerial: {
        easy:   ["How do you motivate your team?","What is your leadership style?","How do you handle underperforming team members?","How do you delegate tasks?","How do you handle team conflicts?"],
        medium: ["Describe a time you led a team through a difficult project.","How do you balance technical and people responsibilities?","Tell me about a time you gave difficult feedback.","How do you measure team performance?","Describe your approach to mentoring."],
        hard:   ["How would you turn around an underperforming team?","Tell me about a time you had to let someone go.","How do you handle senior stakeholders pushing back on your decisions?","Describe a time you scaled a team rapidly.","How do you align your team with company strategy?"]
    }
};

// ─── GET /questions — Standard question generation ───────────────────────────
app.get('/questions', async (req, res) => {
    const { role = 'Software Developer', category = 'technical', difficulty = 'medium', round = '' } = req.query;
    
    // For multi-round, category is determined by round
    const resolvedCategory = round ? round : category;
    const prompt = round
        ? `Generate 3-4 realistic ${difficulty} difficulty ${round} interview questions for a "${role}" position. These are for the ${round} round of the interview.`
        : `Generate 5 ${difficulty} difficulty ${category} interview questions for a "${role}" position.`;

    if (!process.env.GROQ_API_KEY) {
        const bank = FALLBACK_QUESTIONS[resolvedCategory]?.[difficulty.toLowerCase()] || FALLBACK_QUESTIONS.technical.medium;
        const count = round ? (round === 'technical' ? 4 : 3) : 5;
        return res.json({ questions: bank.slice(0, count) });
    }

    try {
        const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.1-8b-instant',
            messages: [
                { role: 'system', content: 'You are an expert interview coach. Reply STRICTLY with JSON: {"questions": ["Q1","Q2","Q3"]}' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: "json_object" }
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' } });

        const data = JSON.parse(groqRes.data.choices[0].message.content);
        const questions = Array.isArray(data.questions) && data.questions.length > 0
            ? data.questions
            : FALLBACK_QUESTIONS[resolvedCategory]?.[difficulty] || FALLBACK_QUESTIONS.technical.medium;
        res.json({ questions });
    } catch (err) {
        console.error('Groq /questions error:', err.message);
        const bank = FALLBACK_QUESTIONS[resolvedCategory]?.[difficulty.toLowerCase()] || FALLBACK_QUESTIONS.technical.medium;
        res.json({ questions: bank.slice(0, 5) });
    }
});

// ─── POST /questions-from-resume — Resume + JD personalized questions ─────────
app.post('/questions-from-resume', uploadResume.single('resume'), async (req, res) => {
    console.log('--- Personalized Question Generation ---');
    const { jd = '', difficulty = 'medium' } = req.body;

    let resumeText = req.body.resumeText || '';

    // Extract text from uploaded PDF if provided
    if (req.file) {
        try {
            const pdfBuffer = fs.readFileSync(req.file.path);
            const pdfData = await pdfParse(pdfBuffer);
            resumeText = pdfData.text.trim();
            console.log('Resume text extracted, length:', resumeText.length);
        } catch (e) {
            console.error('PDF parse error:', e.message);
        } finally {
            if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        }
    }

    if (!resumeText && !jd) {
        return res.status(400).json({ error: 'Please provide either a resume or job description.' });
    }

    if (!process.env.GROQ_API_KEY) {
        return res.json({ questions: FALLBACK_QUESTIONS.technical.medium });
    }

    try {
        const contextParts = [];
        if (resumeText) contextParts.push(`CANDIDATE RESUME:\n${resumeText.slice(0, 3000)}`);
        if (jd) contextParts.push(`JOB DESCRIPTION:\n${jd.slice(0, 2000)}`);

        const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.1-8b-instant',
            messages: [
                {
                    role: 'system',
                    content: `You are an expert technical interviewer. Given the candidate's resume and/or job description, generate 5 highly personalized ${difficulty} interview questions that:
1. Target the specific skills and technologies mentioned in the resume
2. Probe gaps between the candidate's experience and the job requirements
3. Reference specific projects or experiences from the resume when relevant
Reply STRICTLY with JSON: {"questions": ["Q1","Q2","Q3","Q4","Q5"]}`
                },
                { role: 'user', content: contextParts.join('\n\n') }
            ],
            response_format: { type: "json_object" }
        }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' } });

        const data = JSON.parse(groqRes.data.choices[0].message.content);
        const questions = Array.isArray(data.questions) && data.questions.length > 0
            ? data.questions
            : FALLBACK_QUESTIONS.technical.medium;

        console.log('Personalized questions generated:', questions.length);
        res.json({ questions, personalized: true });
    } catch (err) {
        console.error('Groq personalized questions error:', err.message);
        res.json({ questions: FALLBACK_QUESTIONS.technical.medium, personalized: false });
    }
});

// ─── POST /analyze — Video analysis ──────────────────────────────────────────
app.post('/analyze', uploadVideo.single('video'), async (req, res) => {
    console.log('--- Analysis Request ---');
    if (!req.file) return res.status(400).json({ error: 'No video file provided' });

    const question = req.body.question || '';

    try {
        // 1. Python service
        const formData = new FormData();
        formData.append('video', fs.createReadStream(req.file.path));
        const pyRes = await axios.post('http://127.0.0.1:5001/process_video', formData, {
            headers: formData.getHeaders(), maxContentLength: Infinity, maxBodyLength: Infinity
        });
        const { text, voiceScore, faceScore, faceFeedback, confidenceScore } = pyRes.data;

        // 2. Groq content analysis
        let contentScore = 5, strengths = [], improvements = [], feedback = '',
            followUpQuestion = '', modelAnswer = '';

        if (text && text.trim().length > 0 && process.env.GROQ_API_KEY) {
            try {
                const ctx = question
                    ? `Interview question: "${question}"\nCandidate answer: "${text}"`
                    : `Candidate answer: "${text}"`;

                const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                    model: 'llama-3.1-8b-instant',
                    messages: [
                        {
                            role: 'system',
                            content: `You are an expert interview coach. Analyze the candidate's answer.
Reply STRICTLY with JSON:
{
  "contentScore": <1-10>,
  "strengths": ["...","..."],
  "improvements": ["...","..."],
  "feedback": "one sentence overall feedback",
  "followUpQuestion": "one realistic follow-up the interviewer might ask",
  "modelAnswer": "concise 2-3 sentence ideal answer to the original question"
}`
                        },
                        { role: 'user', content: ctx }
                    ],
                    response_format: { type: "json_object" }
                }, { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' } });

                const d = JSON.parse(groqRes.data.choices[0].message.content);
                contentScore     = d.contentScore     || 5;
                strengths        = d.strengths        || [];
                improvements     = d.improvements     || [];
                feedback         = d.feedback         || '';
                followUpQuestion = d.followUpQuestion || '';
                modelAnswer      = d.modelAnswer      || '';
            } catch (e) {
                console.error('Groq analyze error:', e.message);
                feedback = `Transcribed: "${text}". Groq failed.`;
            }
        } else if (!text || text.trim().length === 0) {
            feedback = 'No speech detected.';
            contentScore = 1;
        }

        res.json({ text, contentScore, voiceScore, faceScore, faceFeedback, confidenceScore, feedback, strengths, improvements, followUpQuestion, modelAnswer });

    } catch (error) {
        console.error('Analysis error:', error.message);
        res.status(500).json({ error: 'Failed to process video' });
    } finally {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    }
});

app.listen(port, () => console.log(`Backend running on http://localhost:${port}`));
