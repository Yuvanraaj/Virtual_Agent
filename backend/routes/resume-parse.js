const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
// const Tesseract = require('tesseract.js');
const fetch = require('node-fetch');
require('dotenv').config();

let mammoth;
try {
  mammoth = require('mammoth');
} catch {
  mammoth = null;
}

const router = express.Router();
const upload = multer({ dest: 'uploads/' });
let pdfParse = null;
try {
  pdfParse = require('pdf-parse');
} catch (e) {
  pdfParse = null;
}

/* --------------------------- 🧠 Local Heuristic Analyzer -------------------------- */
async function analyzeLocally(sampleText) {
  const text = (sampleText || '').replace(/\r/g, ' ').replace(/\n+/g, ' ').trim();
  const lc = text.toLowerCase();

  // Basic Info
  const email = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)?.[0] || null;
  const phone = text.match(/(\+\d{1,3}[\s-]?)?(\(?\d{2,4}\)?[\s-]?\d{3,4}[\s-]?\d{3,4})/)?.[0] || null;

  // Skills extraction
  const skillsList = [
    'python','javascript','java','c++','c#','sql','mongodb','postgres','mysql',
    'docker','kubernetes','aws','azure','gcp','react','vue','angular','node','express',
    'typescript','graphql','rest api','html','css','tailwind','tensorflow','pytorch',
    'machine learning','data science','nlp','spark','hadoop','git','linux','bash','jenkins','terraform'
  ];
  const foundSkills = {};
  skillsList.forEach(s => {
    const re = new RegExp(`\\b${s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i');
    if (re.test(lc)) foundSkills[s] = (foundSkills[s] || 0) + 1;
  });
  const topSkills = Object.keys(foundSkills).sort((a, b) => foundSkills[b] - foundSkills[a]).slice(0, 12);

  const years = parseInt(lc.match(/(\d{1,2})\+?\s+(years|yrs)/)?.[1] || '0', 10);
  const projectsCount = (lc.match(/project(s)?/g) || []).length;

  const strengths = [
    ...topSkills.slice(0, 6).map(s => `Experienced with ${s}`),
    ...(years >= 3 ? [`${years}+ years of experience`] : []),
    ...(projectsCount ? [`${projectsCount} projects mentioned`] : [])
  ];

  const weaknesses = [];
  if (!topSkills.length) weaknesses.push('Few technical skills detected');
  if (!projectsCount) weaknesses.push('No explicit projects described');
  if (!years) weaknesses.push('Years of experience unclear');

  const suggestions = [];
  if (!projectsCount) suggestions.push('Add project details with measurable outcomes.');
  if (!topSkills.includes('aws') && !topSkills.includes('azure') && !topSkills.includes('gcp'))
    suggestions.push('Upskill in cloud platforms (AWS/Azure/GCP).');

  const score = Math.max(20, Math.min(95, 50 + topSkills.length * 3 + Math.min(20, projectsCount * 3) + Math.min(10, years)));

  return {
    name: null,
    email,
    phone,
    education: [],
    experience: [],
    skills: topSkills,
    projects: [],
    strengths,
    weaknesses,
    suggestions,
    score,
    overall_feedback: strengths.length
      ? `Candidate shows strengths in ${strengths.slice(0, 3).join(', ')}.`
      : 'Candidate should add measurable achievements and skills.'
  };
}

/* ------------------------- 🖼️ PDF OCR Conversion Helper -------------------------- */
function pdfToPngs(pdfPath, numPages = 5) {
  const outDir = path.join(path.dirname(pdfPath), `pdf_images_${Date.now()}`);
  fs.mkdirSync(outDir, { recursive: true });
  const cmd = `pdftoppm -png -f 1 -l ${numPages} "${pdfPath}" "${path.join(outDir, 'page')}"`;
  execSync(cmd, { stdio: 'ignore' });
  return { outDir, files: fs.readdirSync(outDir).filter(f => f.endsWith('.png')).map(f => path.join(outDir, f)) };
}

/* ------------------------------ 🔍 OCR using Tesseract ---------------------------- */
// async function ocrImages(images) {
//   let text = '';
//   for (const img of images) {
//     try {
//       const { data } = await Tesseract.recognize(img, 'eng');
//       text += '\n' + data.text;
//     } catch (err) {
//       console.error('OCR error:', err.message);
//     }
//   }
//   return text.trim();
// }

/* ----------------------------- 🚀 Main Parse Route ------------------------------- */
router.post('/', upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

  const filePath = path.resolve(req.file.path);
  const ext = path.extname(req.file.originalname).toLowerCase();
  let text = '';
  const tempDirs = [];

  try {
    // 📄 Step 1: Extract text
    if (ext === '.pdf') {
      // Use Python script with pdfplumber/pypdf for PDF extraction (preferred)
      console.log('[PARSE] PDF detected — attempting Python extractor');
      try {
        const { spawnSync } = require('child_process');
        const py = spawnSync('python', [
          path.join(__dirname, '../tools/pdf_extract.py'),
          filePath
        ], { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
        if (py.error) throw py.error;
        text = (py.stdout || '').trim();
        console.log('[PARSE] Python extractor returned', String(text ? text.length : 0), 'chars');
      } catch (err) {
        console.warn('[PARSE] Python PDF extract failed:', err?.message || err);
        text = '';
      }

      // If python extractor didn't return useful text, try Node pdf-parse as a fallback
      if ((!text || text.length < 50) && pdfParse) {
        try {
          console.log('[PARSE] Falling back to Node pdf-parse');
          const dataBuffer = fs.readFileSync(filePath);
          const parsed = await pdfParse(dataBuffer);
          text = (parsed && parsed.text) ? parsed.text.trim() : '';
          console.log('[PARSE] pdf-parse returned', String(text ? text.length : 0), 'chars');
        } catch (e) {
          console.warn('[PARSE] pdf-parse fallback failed:', e?.message || e);
        }
      }
    } else if (ext === '.doc' || ext === '.docx') {
      if (!mammoth) return res.status(500).json({ error: 'DOC/DOCX not supported. Install mammoth.' });
      const result = await mammoth.extractRawText({ path: filePath });
      text = result.value.trim();
    } else {
      return res.status(400).json({ error: 'Only PDF, DOC, and DOCX files are supported.' });
    }

    if (!text || text.length < 50) {
      const fallback = await analyzeLocally(text);
      return res.json({ success: true, feedback: fallback, fallback: true, message: 'Could not extract usable text. Returned local heuristic result.' });
    }

    // Use OpenAI to produce a strict JSON analysis following the schema.
    const systemPrompt = `
You are a professional resume analyst and career coach.
Given a resume's full text, return ONLY a valid JSON strictly following this schema:
{
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "education": [ { "degree": string, "institution": string, "year": string | null } ],
  "experience": [ { "title": string, "company": string, "start": string | null, "end": string | null, "description": string } ],
  "skills": [ "string" ],
  "projects": [ { "name": string, "description": string, "technologies": [ "string" ] } ],
  "strengths": [ "string" ],
  "weaknesses": [ "string" ],
  "suggestions": [ "string" ],
  "score": number,
  "overall_feedback": string
}
If data is missing, use null or [].
Do not include any explanation outside JSON.
`;

    try {
      const openaiResp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Resume text:\n${text}` }
          ],
          temperature: 0.1,
          max_tokens: 1500
        })
      });

      if (!openaiResp.ok) throw new Error(`OpenAI error ${openaiResp.status}`);

      const responseJson = await openaiResp.json();
      const raw = responseJson.choices?.[0]?.message?.content?.trim();
      if (!raw) throw new Error('Empty OpenAI response');

      // Try to parse JSON strictly, with a tolerant fallback
      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        const start = raw.indexOf('{');
        const end = raw.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          try {
            parsed = JSON.parse(raw.substring(start, end + 1));
          } catch (e2) {
            parsed = null;
          }
        }
      }

      if (!parsed) {
        console.warn('[PARSE] OpenAI returned non-JSON output; falling back to local heuristic');
        const fallback = await analyzeLocally(text);
        return res.json({ success: true, feedback: fallback, fallback: true, message: 'Failed to parse OpenAI JSON. Fallback used.' });
      }

      const normalized = {
        name: parsed.name ?? null,
        email: parsed.email ?? null,
        phone: parsed.phone ?? null,
        education: Array.isArray(parsed.education) ? parsed.education : [],
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        score: typeof parsed.score === 'number' ? parsed.score : null,
        overall_feedback: parsed.overall_feedback ?? null
      };

      return res.json({ success: true, feedback: normalized, fallback: false });
    } catch (err) {
      console.error('OpenAI parser error:', err.message || err);
      const fallback = await analyzeLocally(text);
      return res.json({ success: true, feedback: fallback, fallback: true, message: 'OpenAI failed — local fallback used.' });
    }
  } catch (err) {
    console.error('Parser error:', err);
    const fallback = await analyzeLocally('');
    res.status(500).json({ error: 'Server error', details: err.message, fallback });
  } finally {
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
    for (const d of tempDirs) { try { fs.rmSync(d, { recursive: true, force: true }); } catch {} }
  }
});

module.exports = router;
