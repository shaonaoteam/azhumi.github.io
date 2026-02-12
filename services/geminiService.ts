
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  }

  async enhanceNotes(rawNotes: string, petName: string): Promise<string> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `你是一名专业的宠物美容师。请将以下这段粗略的宠物洗护笔记转换成一段温馨、专业且对宠主友好的总结。
        
宠物名字: ${petName}
原始笔记: ${rawNotes}

要求：
1. 语言亲切专业。
2. 包含对宠物状态的赞美（如果笔记中没有负面内容）。
3. 给出1-2条洗护建议或注意事项。
4. 长度控制在150字以内。
只返回优化后的文本。`,
      });

      return response.text || rawNotes;
    } catch (error) {
      console.error("AI Error:", error);
      return rawNotes;
    }
  }
}

export const geminiService = new GeminiService();
