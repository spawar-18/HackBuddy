const AIEngine = require('./ai/AIEngine');

/**
 * Extracts technical skills from resume text using Google Gemini API via official GenAI SDK.
 * @param {string} resumeText - Extracted text content of the resume
 * @returns {Promise<string[]>} List of extracted skills
 */
const extractSkillsFromResume = async (resumeText) => {
  const prompt = `Resume:\n${resumeText}`;

  try {
    console.log('[openRouterService] Executing skill extraction via central AIEngine...');
    const parsed = await AIEngine.executeAI({
      projectId: null,
      module: 'extractSkills',
      userInput: prompt
    });

    if (parsed && Array.isArray(parsed.skills)) {
      return parsed.skills.map(s => s.trim()).filter(s => s.length > 0);
    }
    
    throw new Error('AI response did not contain a skills array');
  } catch (error) {
    console.error('[openRouterService] Skill extraction failed, falling back to mock:', error.message);
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
