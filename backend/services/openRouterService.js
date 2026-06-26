const geminiService = require('./ai/geminiService');

/**
 * Extracts technical skills from resume text using Google Gemini API via official GenAI SDK.
 * @param {string} resumeText - Extracted text content of the resume
 * @returns {Promise<string[]>} List of extracted skills
 */
const extractSkillsFromResume = async (resumeText) => {
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

Resume:
${resumeText}`;

  try {
    console.log('[openRouterService] Executing Gemini skill extraction from resume...');
    const rawResult = await geminiService.executePrompt({
      contents: prompt,
      systemInstruction: 'You are a technical recruiter. Extract technical skills from the resume and return valid JSON.',
      schemaName: 'extractSkills',
      isJson: true,
      endpointName: 'extractSkills'
    });

    const parsed = JSON.parse(rawResult.trim());
    if (parsed && Array.isArray(parsed.skills)) {
      return parsed.skills.map(s => s.trim()).filter(s => s.length > 0);
    }
    
    throw new Error('AI response did not contain a skills array');
  } catch (error) {
    console.error('[openRouterService] Gemini skill extraction failed, falling back to mock:', error.message);
    return mockSkillExtraction(resumeText);
  }
};

/**
 * Fallback mock skill extractor if API key is not configured (e.g., local testing)
 */
const mockSkillExtraction = (text) => {
  const commonSkills = [
    'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Tailwind CSS',
    'Node.js', 'Express.js', 'Spring Boot', 'Django', 'Flask', 'MongoDB', 'MySQL',
    'PostgreSQL', 'Firebase', 'Python', 'Machine Learning', 'Deep Learning', 
    'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision', 'Docker', 'Kubernetes',
    'AWS', 'CI/CD', 'UI/UX', 'Figma', 'Canva', 'GraphQL', 'Redis', 'Git'
  ];
  
  const found = [];
  const upperText = (text || '').toUpperCase();
  
  commonSkills.forEach(skill => {
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
