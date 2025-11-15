const OpenAI = require('openai');

class AIOrganizer {
  constructor(apiKey) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY
    });
  }

  /**
   * Analyze files and suggest organization structure
   */
  async suggestOrganization(files, userQuery) {
    const fileList = files.map(f => ({
      name: f.name,
      type: f.extension,
      size: f.size,
      modified: f.modified
    }));

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a file organization assistant. Analyze the given files and suggest an optimal folder structure. 
                     Consider file types, names, dates, and potential projects. 
                     Respond with a JSON structure showing the suggested organization.`
          },
          {
            role: "user",
            content: `User request: "${userQuery}"\n\nFiles to organize:\n${JSON.stringify(fileList, null, 2)}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('AI Error:', error);
      return this.fallbackOrganization(files);
    }
  }

  /**
   * Detect potential projects based on file patterns
   */
  async detectProjects(files) {
    const fileNames = files.map(f => f.name).join('\n');

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Analyze these file names and identify potential projects or logical groupings. 
                     Look for patterns, common prefixes, related content, etc.
                     Return a JSON object with project names as keys and file patterns as values.`
          },
          {
            role: "user",
            content: fileNames
          }
        ],
        temperature: 0.5,
        max_tokens: 800
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Project detection error:', error);
      return {};
    }
  }

  /**
   * Generate smart rename suggestions
   */
  async suggestRenames(files) {
    const problematicFiles = files.filter(f => 
      f.name.includes(' ') || 
      f.name.match(/[^a-zA-Z0-9._-]/) ||
      f.name.length > 50
    );

    if (problematicFiles.length === 0) {
      return [];
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: `Suggest better file names that are:
                     1. Clean (no spaces, use hyphens or underscores)
                     2. Descriptive but concise
                     3. Follow naming conventions (lowercase, consistent separators)
                     Return a JSON array with {original: "old_name", suggested: "new_name", reason: "explanation"}`
          },
          {
            role: "user",
            content: JSON.stringify(problematicFiles.map(f => f.name))
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      });

      return JSON.parse(completion.choices[0].message.content);
    } catch (error) {
      console.error('Rename suggestion error:', error);
      return [];
    }
  }

  /**
   * Analyze file content similarity for better grouping
   */
  async findSimilarFiles(files, targetFile) {
    // This would ideally analyze actual file content
    // For now, we'll use metadata similarity
    
    const target = files.find(f => f.path === targetFile.path);
    if (!target) return [];

    const similar = files.filter(f => {
      if (f.path === target.path) return false;
      
      // Check extension similarity
      if (f.extension === target.extension) return true;
      
      // Check name similarity
      const targetWords = target.name.toLowerCase().split(/[^a-z0-9]+/);
      const fileWords = f.name.toLowerCase().split(/[^a-z0-9]+/);
      const commonWords = targetWords.filter(w => fileWords.includes(w));
      
      return commonWords.length >= 2;
    });

    return similar;
  }

  /**
   * Fallback organization when AI is unavailable
   */
  fallbackOrganization(files) {
    const organized = {
      'Documents': [],
      'Images': [],
      'Videos': [],
      'Audio': [],
      'Archives': [],
      'Code': [],
      'Other': []
    };

    const typeMap = {
      '.txt,.doc,.docx,.pdf,.md': 'Documents',
      '.jpg,.jpeg,.png,.gif,.svg,.webp': 'Images',
      '.mp4,.avi,.mov,.mkv,.webm': 'Videos',
      '.mp3,.wav,.flac,.aac,.ogg': 'Audio',
      '.zip,.rar,.7z,.tar,.gz': 'Archives',
      '.js,.py,.java,.cpp,.html,.css,.json': 'Code'
    };

    files.forEach(file => {
      if (file.isDirectory) return;
      
      let category = 'Other';
      for (const [extensions, cat] of Object.entries(typeMap)) {
        if (extensions.includes(file.extension)) {
          category = cat;
          break;
        }
      }
      
      organized[category].push(file);
    });

    // Remove empty categories
    Object.keys(organized).forEach(key => {
      if (organized[key].length === 0) {
        delete organized[key];
      }
    });

    return organized;
  }

  /**
   * Generate organization report
   */
  async generateReport(files, organizationPlan) {
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    const fileTypes = {};
    
    files.forEach(f => {
      if (!f.isDirectory) {
        const ext = f.extension || 'no-extension';
        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
      }
    });

    return {
      summary: {
        totalFiles: files.filter(f => !f.isDirectory).length,
        totalFolders: files.filter(f => f.isDirectory).length,
        totalSize: totalSize,
        fileTypes: fileTypes
      },
      plan: organizationPlan,
      estimatedTime: Math.ceil(files.length / 100) + ' minutes',
      recommendations: [
        'Back up important files before reorganizing',
        'Review the suggested structure before applying',
        'Consider archiving old files separately'
      ]
    };
  }
}

module.exports = AIOrganizer;
