import { Handle, Position } from 'reactflow';
import { useState } from 'react';

interface PromptEnhancerNodeData {
  inputPrompt: string;
  enhancedPrompt: string;
  isEnhancing: boolean;
  enhancementStyle: 'detailed' | 'artistic' | 'photorealistic' | 'cinematic';
  referenceImage?: string;
  onChange: (data: any) => void;
}

interface PromptEnhancerNodeProps {
  data: PromptEnhancerNodeData;
}

export function PromptEnhancerNode({ data }: PromptEnhancerNodeProps) {
  const [autoEnhance, setAutoEnhance] = useState(true);

  const enhancePrompt = async (inputPrompt: string) => {
    if (!inputPrompt || inputPrompt.trim() === '') return;

    data.onChange({ ...data, isEnhancing: true });

    try {
      // Get API key
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        // Fallback: Local enhancement rules
        const enhanced = localEnhancePrompt(inputPrompt, data.enhancementStyle);
        data.onChange({ enhancedPrompt: enhanced, isEnhancing: false });
        return;
      }

      // Use Gemini to enhance the prompt
      const enhancementInstruction = getEnhancementInstruction(data.enhancementStyle);
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

      const parts: any[] = [{
        text: `${enhancementInstruction}\n\nOriginal prompt: "${inputPrompt}"\n\nEnhanced prompt:`
      }];

      // Add reference image if available
      if (data.referenceImage) {
        parts.push({
          inlineData: {
            mimeType: "image/png",
            data: data.referenceImage
          }
        });
        parts[0].text += '\n\nAnalyze the provided reference image and incorporate relevant visual details into the enhancement.';
      }

      const payload = {
        contents: [{
          parts: parts
        }],
        generationConfig: {
          temperature: 0.7,
          candidateCount: 1,
        }
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        const enhanced = result?.candidates?.[0]?.content?.parts?.[0]?.text || inputPrompt;
        data.onChange({ enhancedPrompt: enhanced.trim(), isEnhancing: false });
      } else {
        throw new Error('API enhancement failed');
      }

    } catch (error) {
      console.log('Using local enhancement fallback');
      const enhanced = localEnhancePrompt(inputPrompt, data.enhancementStyle);
      data.onChange({ enhancedPrompt: enhanced, isEnhancing: false });
    }
  };

  const getEnhancementInstruction = (style: string) => {
    const instructions = {
      detailed: "Enhance this image prompt with specific visual details. Keep it under 200 words. Add key details about lighting, colors, and composition while preserving the main concept.",
      artistic: "Transform this into an artistic image prompt. Keep it under 200 words. Add art style, color palette, and mood. Focus on the most important artistic elements.",
      photorealistic: "Enhance this for photorealistic generation. Keep it under 200 words. Add key camera and lighting details, materials, and professional photography terms.",
      cinematic: "Make this cinematic. Keep it under 200 words. Add essential film lighting, camera angles, and dramatic composition details."
    };
    return instructions[style as keyof typeof instructions] || instructions.detailed;
  };

  const localEnhancePrompt = (prompt: string, style: string) => {
    const enhancements = {
      detailed: ", highly detailed, sharp focus, vibrant colors, perfect lighting",
      artistic: ", digital art, beautiful composition, dramatic lighting, masterpiece",
      photorealistic: ", photorealistic, professional photography, perfect lighting, ultra-realistic",
      cinematic: ", cinematic lighting, dramatic composition, movie scene"
    };
    
    return prompt + (enhancements[style as keyof typeof enhancements] || enhancements.detailed);
  };

  const handlePromptChange = (newPrompt: string) => {
    data.onChange({ ...data, inputPrompt: newPrompt });
  };

  return (
    <div className="p-4 border border-indigo-200 bg-white shadow-lg rounded-lg w-80 hover:shadow-xl transition-all duration-300 font-mono" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(99, 102, 241, 0.1)' }}>
      <Handle type="target" position={Position.Left} id="prompt" style={{ top: '30%' }} className="w-3 h-3 bg-blue-500" />
      <Handle type="target" position={Position.Left} id="image" style={{ top: '70%' }} className="w-3 h-3 bg-green-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500" />
      
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-mono uppercase tracking-wide text-black">Prompt Enhancer</label>
        {data.isEnhancing && (
          <div className="animate-spin w-3 h-3 border border-indigo-500 border-t-transparent rounded-full"></div>
        )}
      </div>
      
        <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-600 font-mono">
          <div className="w-2 h-2 bg-blue-500"></div>
          <span>Prompt Input</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-600 font-mono">
          <div className="w-2 h-2 bg-green-500"></div>
          <span>Reference Image</span>
          {data.referenceImage && <span className="text-green-600">✓</span>}
        </div>

        <div className="grid grid-cols-2 gap-1">
          {(['detailed', 'artistic', 'photorealistic', 'cinematic'] as const).map(style => (
            <button
              key={style}
              onClick={() => data.onChange({ ...data, enhancementStyle: style })}
              className={`px-2 py-1 text-xs font-mono border rounded ${
                data.enhancementStyle === style 
                  ? 'bg-indigo-500 text-white border-indigo-500' 
                  : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
              }`}
            >
              {style}
            </button>
          ))}
        </div>

        <textarea
          className="w-full p-2 border border-gray-200 text-xs resize-none focus:outline-none focus:border-indigo-500 font-mono"
          rows={3}
          placeholder="Enter basic prompt..."
          value={data.inputPrompt || ''}
          onChange={(e) => handlePromptChange(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={() => enhancePrompt(data.inputPrompt)}
            disabled={data.isEnhancing || !data.inputPrompt}
            className="flex-1 px-3 py-2 bg-indigo-500 text-white text-xs font-mono uppercase tracking-wide hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {data.isEnhancing ? 'Enhancing...' : 'Enhance'}
          </button>
          <button
            onClick={() => data.onChange({ ...data, enhancedPrompt: '', inputPrompt: '' })}
            className="px-3 py-2 bg-gray-400 text-white text-xs font-mono uppercase tracking-wide hover:bg-gray-500 transition-colors"
          >
            Clear
          </button>
        </div>

        {data.enhancedPrompt && (
          <div className="p-2 bg-indigo-50 border border-indigo-200 rounded text-xs font-mono">
            <div className="text-indigo-700 mb-1">Enhanced:</div>
            <div className="text-gray-700">
              {data.enhancedPrompt.length > 100 
                ? `${data.enhancedPrompt.slice(0, 100)}...` 
                : data.enhancedPrompt
              }
            </div>
            {data.enhancedPrompt.length > 100 && (
              <div className="text-indigo-500 text-xs mt-1">
                ({data.enhancedPrompt.length} chars - truncated for display)
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
