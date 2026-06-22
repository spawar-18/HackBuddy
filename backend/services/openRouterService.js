const { OpenAI } = require('openai');

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY || 'dummy_key_if_not_present',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000', // Optional, required by some OpenRouter models
    'X-Title': 'HackBuddy',
  }
});

/**
 * Extracts technical skills from resume text using OpenRouter AI
 * @param {string} resumeText - Extracted text content of the resume
 * @returns {Promise<string[]>} List of extracted skills
 */
const extractSkillsFromResume = async (resumeText) => {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn('WARNING: OPENROUTER_API_KEY is not defined. Using mock skill extraction.');
    return mockSkillExtraction(resumeText);
  }

  const prompt = `Analyze the following resume.
Extract ONLY technical skills.
Include only:
Programming Languages
Frameworks
Libraries
Databases
Cloud Platforms
DevOps Tools
AI/ML Technologies
Tools and Technologies

Exclude:
Communication Skills
Leadership
Teamwork
Soft Skills
Languages spoken

Return ONLY valid JSON.

Format:
{
  "skills": [
    "React",
    "Node.js",
    "MongoDB"
  ]
}

Resume:
${resumeText}`;

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
    });

    const responseText = response.choices[0]?.message?.content || '';
    
    // Clean up potential markdown formatting (e.g. ```json ... ```)
    const cleanText = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleanText);
    
    if (parsed && Array.isArray(parsed.skills)) {
      return parsed.skills;
    }
    
    throw new Error('AI response did not contain a skills array');
  } catch (error) {
    console.error('OpenRouter API call failed:', error);
    // If it's a JSON parse error, log the response text for debugging
    throw error;
  }
};

// Fallback mock skill extractor if API key is not configured (e.g., local testing)
const mockSkillExtraction = (text) => {
  const commonSkills = [
    'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Tailwind CSS',
    'Node.js', 'Express.js', 'Spring Boot', 'Django', 'Flask', 'MongoDB', 'MySQL',
    'PostgreSQL', 'Firebase', 'Python', 'Machine Learning', 'Deep Learning', 
    'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision', 'Docker', 'Kubernetes',
    'AWS', 'CI/CD', 'UI/UX', 'Figma', 'Canva', 'GraphQL', 'Redis', 'Git'
  ];
  
  const found = [];
  const upperText = text.toUpperCase();
  
  commonSkills.forEach(skill => {
    // Look for exact word match
    const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(upperText)) {
      found.push(skill);
    }
  });

  return found.length > 0 ? found : ['React', 'Node.js', 'MongoDB'];
};

module.exports = {
  extractSkillsFromResume
};
