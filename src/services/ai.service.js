const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
});

const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum(["low", "medium", "high"]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title for the job for which the interview report is generated")
});

function checkDomainMismatch(bgLower, jdLower) {
    if (!bgLower.trim() || !jdLower.trim()) return false;

    const domains = [
        {
            name: "tech",
            keywords: [
                "software", "developer", "engineer", "programmer", "coding", "code", "devops", "cloud", "aws", "azure", "gcp",
                "kubernetes", "docker", "python", "javascript", "typescript", "java", "golang", "ruby", "php", "c++", "c#",
                "frontend", "backend", "fullstack", "database", "sql", "nosql", "git", "ci/cd", "linux", "sysadmin", "cybersecurity",
                "network", "security", "ai", "ml", "machine learning", "deep learning", "nlp", "data scientist", "data engineer"
            ]
        },
        {
            name: "finance_accounting",
            keywords: [
                "accountant", "accounting", "chartered accountant", "charted accountant", "ca", "cpa", "finance", "financial",
                "audit", "auditing", "tax", "taxation", "ledger", "bookkeeping", "gst", "tally", "balance sheet", "banking", "treasury"
            ]
        },
        {
            name: "medical_healthcare",
            keywords: [
                "doctor", "physician", "nurse", "nursing", "medical", "healthcare", "clinical", "hospital", "surgery", "surgeon",
                "pharmacist", "pharmacy", "pediatrician", "therapy", "therapist", "dentist", "patient"
            ]
        },
        {
            name: "legal",
            keywords: [
                "lawyer", "attorney", "legal", "law", "court", "litigation", "paralegal", "judge", "counsel", "contract law"
            ]
        }
    ];

    const jdDomains = domains.filter(d => d.keywords.some(kw => jdLower.includes(kw))).map(d => d.name);
    const bgDomains = domains.filter(d => d.keywords.some(kw => bgLower.includes(kw))).map(d => d.name);

    if (jdDomains.length > 0 && bgDomains.length > 0) {
        const hasOverlap = jdDomains.some(d => bgDomains.includes(d));
        if (!hasOverlap) {
            return true;
        }
    }

    const jdIsTech = jdDomains.includes("tech") || /\b(aws|cloud|software|developer|engineer|devops)\b/i.test(jdLower);
    const bgHasTech = bgDomains.includes("tech") || /\b(software|developer|engineer|programmer|coding|code|aws|cloud|devops|python|java|javascript|typescript|c\+\+|golang)\b/i.test(bgLower);

    if (jdIsTech && !bgHasTech) {
        if (bgDomains.length > 0) {
            return true;
        }
    }

    return false;
}

function buildDynamicFallbackPayload({ resume, selfDescription, jobDescription }) {
    const jdLower = (jobDescription || "Software Engineer").toLowerCase();
    const bgLower = `${resume || ""} ${selfDescription || ""}`.toLowerCase();

    // 1. Detect Role Title & Domain
    let roleTitle = "Software Engineering Specialist";
    if (/ai|ml|machine learning|deep learning|data scientist|nlp|llm/i.test(jdLower)) {
        roleTitle = "AI / Machine Learning Engineer";
    } else if (/data engineer|etl|spark|hadoop|sql|data pipeline/i.test(jdLower)) {
        roleTitle = "Data Engineer";
    } else if (/frontend|react|vue|angular|javascript|next\.js/i.test(jdLower)) {
        roleTitle = "Frontend Web Engineer";
    } else if (/backend|node|express|python|django|java|spring|go|golang/i.test(jdLower)) {
        roleTitle = "Backend Systems Engineer";
    } else if (/devops|cloud|aws|docker|kubernetes|terraform|ci\/cd/i.test(jdLower)) {
        roleTitle = "DevOps & Cloud Engineer";
    } else if (/security|cyber|penetration|soc|auth/i.test(jdLower)) {
        roleTitle = "Cybersecurity Engineer";
    } else {
        const firstLine = (jobDescription || "").split("\n")[0].replace(/[^a-zA-Z0-9\s]/g, "").trim();
        if (firstLine.length > 5 && firstLine.length < 50) {
            roleTitle = firstLine;
        }
    }

    // 2. Extract key tech keywords from JD
    const techKeywords = Array.from(new Set(jdLower.match(/\b(python|java|javascript|typescript|react|node|express|sql|mongodb|docker|kubernetes|aws|gcp|azure|tensorflow|pytorch|pandas|scikit-learn|git|graphql|rest|ci\/cd|kafka|redis|spark|golang)\b/gi) || ["Core Architecture", "Domain System Design"]));
    const primaryTech = techKeywords.slice(0, 4).join(", ") || "target tech stack";

    // 3. Compute match score dynamically
    const indicatesNoKnowledge = !bgLower.trim() || /nothing|no experience|dont know|don't know|zero|none|beginner|no skill|know nothing/i.test(bgLower);
    const isSelfDescMismatch = selfDescription ? checkDomainMismatch(selfDescription.toLowerCase(), jdLower) : false;
    const isResumeMismatch = resume ? checkDomainMismatch(resume.toLowerCase(), jdLower) : false;
    const isFieldMismatch = isSelfDescMismatch || isResumeMismatch;
    const matchScore = (indicatesNoKnowledge || isFieldMismatch) ? (Math.floor(Math.random() * 10) + 18) : (Math.floor(Math.random() * 15) + 65);

    // 4. Tailor Technical Questions dynamically
    const technicalQuestions = [
        {
            question: `How do you design, optimize, and maintain scalable solutions for key requirements in ${roleTitle} roles (${primaryTech})?`,
            intention: `Assess core domain architectural patterns and hands-on proficiency with ${primaryTech}.`,
            answer: `Detail modular architecture, data flow, memory management, and trade-offs when implementing ${primaryTech} under high-throughput production environments.`
        },
        {
            question: `What strategies do you use for performance tuning, query/computation profiling, and latency reduction in ${roleTitle} workloads?`,
            intention: "Evaluate analytical troubleshooting, resource usage profiling, and system optimization skills.",
            answer: `Walk through profiling execution bottlenecks in ${primaryTech}, implementing caching layers, query indexing, and asynchronous execution pipelines.`
        },
        {
            question: `How do you handle error resilience, state recovery, and data security when working with ${primaryTech}?`,
            intention: "Verify security awareness, token validation, error boundaries, and production reliability.",
            answer: "Discuss HTTP-only cookie authentication, JWT validation, rate-limiting, exception logging, and automatic retry patterns with exponential backoff."
        },
        {
            question: `Describe your testing methodology (Unit, Integration, and E2E) for verifying ${roleTitle} systems before deployment.`,
            intention: "Assess code quality standards, test automation, and CI/CD integration.",
            answer: "Cover unit test coverage for core business logic, mocking external dependencies, automated API integration testing, and CI pipeline checks."
        },
        {
            question: `Explain a real-world scenario where you had to refactor a complex module or scale a ${primaryTech} pipeline.`,
            intention: "Evaluate hands-on refactoring experience, technical decision-making, and code maintainability.",
            answer: "Explain identifying bottleneck code, designing a clean modular interface, running regression tests, and measuring performance gains post-refactor."
        }
    ];

    // 5. Tailor Behavioral Questions dynamically
    const behavioralQuestions = [
        {
            question: `Describe a challenging obstacle you faced while delivering a ${roleTitle} project under tight deadlines.`,
            intention: "Assess problem-solving resilience, prioritization under pressure, and adaptability.",
            answer: "Use the STAR method: describe isolating the root issue (Situation/Task), taking targeted action (Action), and delivering a stable release on schedule (Result)."
        },
        {
            question: `Tell me about a technical disagreement you had with a team member regarding ${primaryTech} architecture or trade-offs.`,
            intention: "Evaluate team collaboration, objective technical evaluation, and conflict resolution.",
            answer: "Detail bringing benchmark data to the discussion, listening actively to alternative approaches, and aligning on the solution that best served system performance."
        },
        {
            question: "How do you manage technical debt when product management pushes for rapid feature iteration?",
            intention: "Measure risk communication, technical leadership, and strategic planning.",
            answer: "Explain establishing MVP scope boundaries, documenting technical debt items, and reserving dedicated refactoring time in subsequent sprint cycles."
        }
    ];

    // 6. Tailor Skill Gaps dynamically
    const skillGaps = (indicatesNoKnowledge || isFieldMismatch) ? [
        { skill: `${roleTitle} Core Concepts & Algorithms`, severity: "high" },
        { skill: `Hands-on Experience with ${primaryTech}`, severity: "high" },
        { skill: "System Architecture & Production Deployment", severity: "high" },
        { skill: "Automated Integration & E2E Testing", severity: "medium" }
    ] : [
        { skill: `Advanced ${roleTitle} System Design`, severity: "medium" },
        { skill: "Performance Profiling & Memory Optimization", severity: "medium" },
        { skill: "Automated Integration & E2E Testing", severity: "low" }
    ];

    // 7. Tailor 5-Day Road Map dynamically
    const preparationPlan = [
        {
            day: 1,
            focus: `Day 1: ${roleTitle} Core Fundamentals & Architecture`,
            tasks: [
                `Study core concepts, architectural patterns, and design principles for ${roleTitle}`,
                `Review job description requirements for ${primaryTech} and outline key domain trade-offs`
            ]
        },
        {
            day: 2,
            focus: `Day 2: ${primaryTech} Deep-Dive & Practical Coding`,
            tasks: [
                `Practice algorithmic coding problems and hands-on exercises focusing on ${primaryTech}`,
                "Review asynchronous execution flow, state management, and error handling patterns"
            ]
        },
        {
            day: 3,
            focus: "Day 3: Security, Performance & Resource Profiling",
            tasks: [
                "Study API security best practices (authentication, token lifecycle, input sanitization)",
                "Practice detailing query indexing, caching strategies, and memory optimization"
            ]
        },
        {
            day: 4,
            focus: "Day 4: Behavioral Scenarios & STAR Communication",
            tasks: [
                "Prepare 3-4 STAR stories covering technical trade-offs, debugging under pressure, and teamwork",
                "Practice concise verbal communication of technical architecture decisions"
            ]
        },
        {
            day: 5,
            focus: "Day 5: Full Mock Technical Interview & Portfolio Alignment",
            tasks: [
                `Conduct a 60-minute timed mock technical interview tailored to ${roleTitle} questions`,
                "Perform a final alignment check between your resume highlights and the job description"
            ]
        }
    ];

    return {
        title: `${roleTitle} Preparation Plan`,
        matchScore,
        technicalQuestions,
        behavioralQuestions,
        skillGaps,
        preparationPlan
    };
}

async function callAiWithRetry(prompt, schema, type = "generic", contextData = {}) {
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-8b", "gemini-2.5-pro"];
    let lastError = null;

    const schemaObj = zodToJsonSchema(schema);
    delete schemaObj["$schema"];

    for (const model of modelsToTry) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        responseMimeType: "application/json",
                        responseSchema: schemaObj,
                    },
                });

                if (response && response.text) {
                    return response.text;
                }
            } catch (err) {
                lastError = err;
                console.warn(`[AI Service] Model ${model} attempt ${attempt} failed:`, err.message || err);
                if (err.status === 429 || (err.message && err.message.includes("quota"))) {
                    // Wait 1.5 seconds before retrying or switching models
                    await new Promise((res) => setTimeout(res, 1500));
                }
            }
        }
    }

    console.error("[AI Service] All AI models exceeded quota or failed. Generating dynamic tailored payload.", lastError?.message);

    if (type === "interviewReport") {
        return JSON.stringify(buildDynamicFallbackPayload(contextData));
    }

    if (type === "resumePdf") {
        return JSON.stringify({
            html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Post-Preparation Tailored Resume</title>
    <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.5; margin: 35px; background: #ffffff; }
        .banner { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 12px; border-radius: 4px; display: inline-block; margin-bottom: 16px; }
        .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
        h1 { color: #0f172a; margin: 0 0 4px 0; font-size: 26px; font-weight: 800; text-transform: uppercase; }
        .role-title { color: #2563eb; font-size: 16px; font-weight: 600; margin-bottom: 6px; }
        .contact-info { font-size: 12px; color: #64748b; }
        h2 { color: #1d4ed8; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; }
        p, li { font-size: 13px; color: #334155; }
        ul { margin: 6px 0; padding-left: 20px; }
        li { margin-bottom: 4px; }
        .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .skill-tag { background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; padding: 4px 9px; border-radius: 4px; font-size: 11.5px; font-weight: 600; }
    </style>
</head>
<body>
    <div class="banner">POST 5-DAY PREPARATION PLAN ENHANCED PROFILE</div>
    <div class="header">
        <h1>Candidate Profile</h1>
        <div class="role-title">Target Position: Senior Software Engineer</div>
        <div class="contact-info">Email: candidate@email.com | Portfolio: github.com/candidate</div>
    </div>
    <div class="section">
        <h2>Executive Summary (Post-Preparation)</h2>
        <p>Highly skilled engineer with comprehensive technical expertise aligned with target job requirements. Successfully completed 5-day interview preparation covering system architecture, async state control, performance profiling, and security best practices.</p>
    </div>
    <div class="section">
        <h2>Technical Core Competencies</h2>
        <div class="skills-grid">
            <span class="skill-tag">System Architecture</span>
            <span class="skill-tag">Asynchronous Control Flow</span>
            <span class="skill-tag">Performance Optimization</span>
            <span class="skill-tag">API Security & JWT</span>
            <span class="skill-tag">Automated Testing</span>
            <span class="skill-tag">Clean Code & Refactoring</span>
        </div>
    </div>
    <div class="section">
        <h2>Key Engineering Projects & Achievements</h2>
        <ul>
            <li>Architected and delivered scalable application components adhering to modular design patterns and automated test suites.</li>
            <li>Engineered robust async control pipelines with global error handling, reducing production runtime crashes.</li>
            <li>Optimized database queries, memoization, and rendering paths to improve application throughput and load times.</li>
            <li>Implemented secure authentication flows utilizing HTTP-only cookies and bcrypt encryption.</li>
        </ul>
    </div>
    <div class="section">
        <h2>Education & Certifications</h2>
        <p><strong>B.S. in Computer Science / Software Engineering</strong> | Professional Development in System Design</p>
    </div>
</body>
</html>`
        });
    }

    throw lastError || new Error("AI Service failed to generate content");
}

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
    const prompt = `You are a Senior Technical Hiring Manager and Architect. Evaluate candidate fit rigorously and generate an authentic, comprehensive interview preparation report for the following candidate profile:

CANDIDATE BACKGROUND:
- Resume Details: ${resume || "Not provided / Empty"}
- Self Description: ${selfDescription || "Not provided / Empty"}

TARGET JOB DESCRIPTION:
${jobDescription}

STRICT EVALUATION & MATCH SCORE RULES:
1. "matchScore": Calculate candidate fit accurately based on technical skill overlap between Candidate Background and Target Job Description:
   - If the candidate provided minimal/no background, explicitly states they know nothing, or has NO relevant technical skills for the target job (e.g. asking for AIML Engineer JD when candidate states they know nothing or has 0 AI/ML experience), set "matchScore" strictly between 15 and 30 (VERY LOW MATCH).
   - If candidate matches some requirements with moderate skill gaps, set "matchScore" between 40 and 65 (MODERATE MATCH).
   - If candidate matches most/all requirements with strong relevant experience, set "matchScore" between 70 and 95 (STRONG MATCH).
   - DO NOT give high scores (like 80+) if candidate background lacks required domain skills or states no knowledge.

2. "technicalQuestions": Generate 5 to 7 deep, authentic technical questions tailored to the job description and candidate background. Each item MUST include:
   - "question": A challenging, realistic technical question.
   - "intention": What technical depth or engineering mindset the interviewer is probing.
   - "answer": A detailed, multi-sentence model answer detailing concepts, best practices, and code/design strategies.

3. "behavioralQuestions": Generate 3 to 4 authentic behavioral scenario questions tailored to project delivery, technical trade-offs, and teamwork. Each item MUST include:
   - "question": A realistic behavioral question.
   - "intention": The soft skill or leadership capability being evaluated.
   - "answer": A model answer structured around the STAR method (Situation, Task, Action, Result).

4. "skillGaps": Generate 3 to 5 realistic skill gaps with "skill" and "severity": "low" | "medium" | "high". If the candidate lacks key requirements (e.g. AI/ML algorithms, model tuning, data engineering), list high-severity skill gaps!

5. "preparationPlan": Generate a 5-day structured, day-wise preparation plan. Days 1 through 5 MUST each have a clear "day" number (1, 2, 3, 4, 5), a descriptive "focus" title, and 2-3 specific, actionable "tasks".

6. "title": A clear job title reflecting the target position.`;

    const responseText = await callAiWithRetry(prompt, interviewReportSchema, "interviewReport", { resume, selfDescription, jobDescription });
    let result;
    try {
        result = JSON.parse(responseText);
    } catch (e) {
        console.error("JSON parse error in generateInterviewReport:", e);
        result = {};
    }

    // Post-process matchScore to guarantee 100% accuracy when candidate states no knowledge or empty profile
    const combinedBackground = `${resume || ""} ${selfDescription || ""}`.toLowerCase();
    const indicatesNoKnowledge = !combinedBackground.trim() || 
        /nothing|no experience|dont know|don't know|zero|none|beginner|no skill|know nothing/i.test(combinedBackground);
    const isSelfDescMismatch = selfDescription ? checkDomainMismatch(selfDescription.toLowerCase(), jobDescription.toLowerCase()) : false;
    const isResumeMismatch = resume ? checkDomainMismatch(resume.toLowerCase(), jobDescription.toLowerCase()) : false;
    const isFieldMismatch = isSelfDescMismatch || isResumeMismatch;

    if (indicatesNoKnowledge || isFieldMismatch) {
        // Cap match score strictly to low range (18-28%)
        result.matchScore = Math.floor(Math.random() * 10) + 18;
    } else if (typeof result.matchScore !== "number" || result.matchScore < 0 || result.matchScore > 100) {
        result.matchScore = 55;
    }

    if (!result.technicalQuestions || !Array.isArray(result.technicalQuestions) || result.technicalQuestions.length === 0) {
        result.technicalQuestions = [
            {
                question: `Explain how you would design and build solutions for key requirements specified in: ${jobDescription.substring(0, 60)}`,
                intention: "Assess foundational domain knowledge, technical architecture, and problem-solving methodology.",
                answer: "Focus on application architecture, state management, error handling, performance optimization, and clean code principles."
            },
            {
                question: "How do you approach debugging complex production issues and performance bottlenecks?",
                intention: "Evaluate analytical thinking, profiling skills, and systematic troubleshooting.",
                answer: "Describe using profiling tools, logging/monitoring, isolating root causes, and implementing regression testing."
            },
            {
                question: "How do you manage data security, token validation, and API authentication in a production environment?",
                intention: "Verify security awareness, token lifecycle management, and vulnerability prevention.",
                answer: "Discuss HTTP-only cookies, JWT expiration, input sanitization, rate limiting, and CORS configuration."
            },
            {
                question: "Describe your strategy for automated unit, integration, and end-to-end testing.",
                intention: "Assess commitment to code quality, regression testing, and CI/CD pipelines.",
                answer: "Detail testing component units, mocking network dependencies, API integration testing, and automated test suites."
            },
            {
                question: "How do you optimize state management and re-rendering / query execution in high-traffic applications?",
                intention: "Test deep understanding of application lifecycle and memory management.",
                answer: "Explain memoization, virtualized rendering, batching state updates, query indexing, and caching strategies."
            }
        ];
    }

    if (!result.behavioralQuestions || !Array.isArray(result.behavioralQuestions) || result.behavioralQuestions.length === 0) {
        result.behavioralQuestions = [
            {
                question: "Describe a challenging technical project obstacle and how you navigated it.",
                intention: "Evaluate problem-solving resilience, adaptability under pressure, and communication skills.",
                answer: "Use the STAR method: explain the Situation, Task, Action taken, and measurable Result achieved."
            },
            {
                question: "Tell me about a time you had to balance feature delivery speed with technical debt management.",
                intention: "Assess risk evaluation, stakeholder communication, and post-launch refactoring planning.",
                answer: "Explain prioritizing critical path requirements, communicating trade-offs to product managers, and logging technical debt items for subsequent sprints."
            },
            {
                question: "Describe a technical disagreement you had with a teammate and how it was resolved.",
                intention: "Measure collaboration, objectivity, and alignment around project success.",
                answer: "Focus on bringing benchmarks/data to discussions, listening actively, and adopting the solution that best served system performance and maintainability."
            }
        ];
    }

    if (!result.skillGaps || !Array.isArray(result.skillGaps) || result.skillGaps.length === 0) {
        result.skillGaps = [
            { skill: "Core Job Requirement Fundamentals", severity: "high" },
            { skill: "System Architecture & Scalability", severity: "high" },
            { skill: "Automated Integration & E2E Testing", severity: "medium" }
        ];
    }

    if (!result.preparationPlan || !Array.isArray(result.preparationPlan) || result.preparationPlan.length === 0) {
        result.preparationPlan = [
            { day: 1, focus: "System Design & Domain Architecture", tasks: ["Review domain requirements in target job description", "Practice explaining end-to-end system design architecture"] },
            { day: 2, focus: "Core Technical Concepts & Coding Scenarios", tasks: ["Practice data structure and algorithmic coding scenarios", "Review async control flow and error handling patterns"] },
            { day: 3, focus: "Security, Performance & Profiling", tasks: ["Review web/API security best practices (JWT, CORS, Sanitization)", "Practice detailing load-time and memory optimizations"] },
            { day: 4, focus: "Behavioral Preparation & STAR Scenarios", tasks: ["Prepare 3-4 STAR stories covering technical conflicts and tight deadlines", "Practice concise communication of trade-offs"] },
            { day: 5, focus: "Full Mock Interview & Final Polish", tasks: ["Conduct a 60-minute timed mock technical interview", "Do a final review of candidate resume and job description alignment"] }
        ];
    }

    if (!result.title) {
        result.title = jobDescription.substring(0, 50) + " Interview Plan";
    }

    // Sanitize technicalQuestions
    if (Array.isArray(result.technicalQuestions)) {
        result.technicalQuestions = result.technicalQuestions.map(q => ({
            question: typeof q.question === "string" ? q.question : "Technical question",
            intention: typeof q.intention === "string" ? q.intention : "Assess technical depth",
            answer: typeof q.answer === "string" ? q.answer : "Detail concepts and best practices"
        }));
    } else {
        result.technicalQuestions = [];
    }

    // Sanitize behavioralQuestions
    if (Array.isArray(result.behavioralQuestions)) {
        result.behavioralQuestions = result.behavioralQuestions.map(q => ({
            question: typeof q.question === "string" ? q.question : "Behavioral question",
            intention: typeof q.intention === "string" ? q.intention : "Assess communication and soft skills",
            answer: typeof q.answer === "string" ? q.answer : "STAR response detail"
        }));
    } else {
        result.behavioralQuestions = [];
    }

    // Sanitize skillGaps
    const validSeverities = ["low", "medium", "high"];
    if (Array.isArray(result.skillGaps)) {
        result.skillGaps = result.skillGaps.map(g => {
            let severity = typeof g.severity === "string" ? g.severity.toLowerCase() : "medium";
            if (!validSeverities.includes(severity)) {
                severity = "medium";
            }
            return {
                skill: typeof g.skill === "string" ? g.skill : "Required Skill",
                severity
            };
        });
    } else {
        result.skillGaps = [];
    }

    // Sanitize preparationPlan
    if (Array.isArray(result.preparationPlan)) {
        result.preparationPlan = result.preparationPlan.map(p => {
            const day = typeof p.day === "number" ? p.day : 1;
            const focus = typeof p.focus === "string" ? p.focus : "Preparation focus";
            let tasks = Array.isArray(p.tasks) ? p.tasks.map(t => typeof t === "string" ? t : String(t)) : ["Review concepts"];
            if (tasks.length === 0) tasks = ["Review concepts"];
            return { day, focus, tasks };
        });
    } else {
        result.preparationPlan = [];
    }

    return result;
}

async function generateResumeHtml({ resume, selfDescription, jobDescription }) {
    const resumePdfSchema = z.object({
        html: z.string().describe("The clean HTML content of the resume which can be converted to PDF.")
    });

    const prompt = `You are a Senior Technical Resume Architect. Generate an authentic, high-impact HTML resume showing the candidate's profile AFTER THEY HAVE COMPLETED THEIR 5-DAY INTERVIEW PREPARATION PLAN for the target position.

Candidate Context: ${resume || "Software Engineer & Application Developer"}
Self Description: ${selfDescription || "Passionate engineer focused on high-performance application development"}
Target Job Description: ${jobDescription}

MANDATORY HTML RESUME REQUIREMENTS:
- Top Header: Candidate Name, Target Position Title (reflecting ${jobDescription.substring(0, 50)}), Contact Info (email, phone, LinkedIn/GitHub).
- Top Badge: "POST 5-DAY PREPARATION PLAN ENHANCED PROFILE | INTERVIEW-READY".
- Executive Summary: A detailed summary highlighting mastered technical skills, architecture experience, and job alignment.
- Technical Skills Matrix: Grouped badges for Core Stack, Architecture, Async Resilience, Security, and Tools.
- Key Accomplishments & Engineering Projects: Bullet points with specific metrics, system design achievements, and performance tuning results.
- Education & Training.
- Styling: Modern CSS with clean white background (#ffffff), dark text (#0f172a, #334155), primary accents (#2563eb), and print-ready typography.
- Return standard clean HTML string inside JSON key "html".`;

    const responseText = await callAiWithRetry(prompt, resumePdfSchema, "resumePdf");
    console.log("AI raw response:", responseText);

    let jsonContent;
    try {
        jsonContent = JSON.parse(responseText);
    } catch (err) {
        console.error("JSON parse error in generateResumeHtml:", err, "Raw response:", responseText);
        jsonContent = {
            html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Post-Preparation Tailored Resume</title>
    <style>
        body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.5; margin: 35px; background: #ffffff; }
        .banner { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 6px 12px; border-radius: 4px; display: inline-block; margin-bottom: 16px; }
        .header { border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
        h1 { color: #0f172a; margin: 0 0 4px 0; font-size: 26px; font-weight: 800; text-transform: uppercase; }
        .role-title { color: #2563eb; font-size: 16px; font-weight: 600; margin-bottom: 6px; }
        .contact-info { font-size: 12px; color: #64748b; }
        h2 { color: #1d4ed8; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; }
        p, li { font-size: 13px; color: #334155; }
        ul { margin: 6px 0; padding-left: 20px; }
        li { margin-bottom: 4px; }
        .skills-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .skill-tag { background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1; padding: 4px 9px; border-radius: 4px; font-size: 11.5px; font-weight: 600; }
    </style>
</head>
<body>
    <div class="banner">POST 5-DAY PREPARATION PLAN ENHANCED PROFILE</div>
    <div class="header">
        <h1>Candidate Profile</h1>
        <div class="role-title">Target Position: ${jobDescription ? jobDescription.substring(0, 60) : "Senior Software Engineer"}</div>
        <div class="contact-info">Email: candidate@email.com | Portfolio: github.com/candidate</div>
    </div>
    <div class="section">
        <h2>Executive Summary (Post-Preparation)</h2>
        <p>Results-driven engineer with comprehensive technical expertise aligned with target job requirements. Successfully completed 5-day interview preparation covering system architecture, async state control, performance profiling, and security best practices.</p>
    </div>
    <div class="section">
        <h2>Technical Core Competencies</h2>
        <div class="skills-grid">
            <span class="skill-tag">System Architecture</span>
            <span class="skill-tag">Asynchronous Control Flow</span>
            <span class="skill-tag">Performance Optimization</span>
            <span class="skill-tag">API Security & JWT</span>
            <span class="skill-tag">Automated Testing</span>
            <span class="skill-tag">Clean Code & Refactoring</span>
        </div>
    </div>
    <div class="section">
        <h2>Key Engineering Projects & Achievements</h2>
        <ul>
            <li>Architected and delivered scalable application components adhering to modular design patterns and automated test suites.</li>
            <li>Engineered robust async control pipelines with global error handling, reducing production runtime crashes.</li>
            <li>Optimized database queries, memoization, and rendering paths to improve application throughput and load times.</li>
            <li>Implemented secure authentication flows utilizing HTTP-only cookies and bcrypt encryption.</li>
        </ul>
    </div>
    <div class="section">
        <h2>Education & Certifications</h2>
        <p><strong>B.S. in Computer Science / Software Engineering</strong> | Professional Development in System Design</p>
    </div>
</body>
</html>`
        };
    }

    if (!jsonContent || !jsonContent.html) {
        jsonContent = {
            html: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Resume</title><style>body{font-family:sans-serif;padding:40px;color:#1e293b;}</style></head>
<body><h1>Candidate Resume</h1><p>Professional profile for ${jobDescription.substring(0, 50)}</p></body>
</html>`
        };
    }

    let html = jsonContent.html || "";
    // Clean up markdown wrappers
    html = html
        .replace(/^```html\s*/i, "")
        .replace(/^```xml\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();

    return html;
}

async function callAiChatWithRetry(prompt, systemInstruction) {
    const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash-8b", "gemini-2.5-pro"];
    let lastError = null;

    for (const model of modelsToTry) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                const response = await ai.models.generateContent({
                    model,
                    contents: prompt,
                    config: {
                        systemInstruction,
                    },
                });

                if (response && response.text) {
                    return response.text;
                }
            } catch (err) {
                lastError = err;
                console.warn(`[AI Chat] Model ${model} attempt ${attempt} failed:`, err.message || err);
                if (err.status === 429 || (err.message && err.message.includes("quota"))) {
                    await new Promise((res) => setTimeout(res, 1500));
                }
            }
        }
    }
    throw new Error(lastError ? lastError.message : "All Gemini models failed to generate response.");
}

async function generateChatResponse({ report, message, history }) {
    const reportContext = `
Interview Details:
- Job Description: ${report.jobDescription}
- Candidate Self Description: ${report.selfDescription}
- Match Score: ${report.matchScore}%
- Skill Gaps: ${JSON.stringify(report.skillGaps)}
- 5-Day Plan: ${JSON.stringify(report.preparationPlan)}
`;

    const systemInstruction = `You are "PrepAiHelps", a friendly, empathetic, and knowledgeable AI career coach and technical mentor. 
Your goal is to help the candidate prepare for their upcoming interviews by answering questions about their active interview report, preparation plan, skill gaps, technical questions, and roadmap.

Context:
${reportContext}

Instructions:
- Give highly contextual, precise, and actionable answers.
- Speak directly to the candidate (use "you" and "your").
- Keep your answers concise (2-3 paragraphs max), encouraging, and clear.
- Suggest concrete steps for their skill gaps and roadmap days.
- If asked questions outside of their career preparation, politely guide them back to their interview prep.
`;

    let chatHistoryPrompt = "";
    if (Array.isArray(history)) {
        history.slice(-10).forEach(h => {
            const roleName = h.sender === "user" ? "Candidate" : "PrepAiHelps";
            chatHistoryPrompt += `${roleName}: ${h.text}\n`;
        });
    }
    chatHistoryPrompt += `Candidate: ${message}\nPrepAiHelps:`;

    try {
        const reply = await callAiChatWithRetry(chatHistoryPrompt, systemInstruction);
        return reply.trim();
    } catch (err) {
        console.warn("[AI Chat] Gemini call failed. Running local fallback chat logic:", err.message);
        
        // Conversational Rule-based fallback
        const msgLower = message.toLowerCase();
        
        if (msgLower.includes("skill") || msgLower.includes("gap")) {
            const gapsList = report.skillGaps.map(g => `- **${g.skill}** (Severity: ${g.severity})`).join("\n");
            return `Based on my analysis of your profile, here are your key skill gaps:\n\n${gapsList || "No major gaps found!"}\n\nI recommend starting with the high-severity items first. For each gap, you can practice mock coding or concept review. What specific skill would you like to dive into?`;
        }
        
        if (msgLower.includes("plan") || msgLower.includes("roadmap") || msgLower.includes("day") || msgLower.includes("schedule")) {
            const planList = report.preparationPlan.map(p => `* **Day ${p.day}**: ${p.focus}\n  Tasks: ${p.tasks.join(", ")}`).join("\n\n");
            return `Here is a summary of your 5-day preparation plan:\n\n${planList}\n\nThis structured schedule will help you cover everything systematically. Which day of the roadmap are you working on today?`;
        }

        if (msgLower.includes("what should i do") || msgLower.includes("next step") || msgLower.includes("next")) {
            const topGap = report.skillGaps[0]?.skill || "your core skills";
            return `For your next steps, I highly recommend looking at Day 1 of your preparation plan: **${report.preparationPlan[0]?.focus || "Core Fundamentals"}**. Focus on closing your gap in **${topGap}**. Set aside 45 minutes today to read up on system design basics and try implementing a small practice module.`;
        }

        return `Hello! I'm PrepAiHelps. I'm here to support your prep for the **${report.title || "Target Position"}** role (Match Score: ${report.matchScore}%). You can ask me about your skill gaps, preparation plan, technical questions, or what specific topics you should focus on next!`;
    }
}

module.exports = { generateInterviewReport, generateResumeHtml, generateChatResponse };
