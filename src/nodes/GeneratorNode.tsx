import { Handle, Position } from 'reactflow';
import { useState } from 'react';
import { wordDiff } from '../utils/wordDiff';

const MODELS = [
  {
    id: 'gemini-2.5-flash-image-preview',
    label: 'Gemini 2.5 Flash',
    multiImage: true,
  },
  {
    id: 'gemini-2.0-flash-preview-image-generation',
    label: 'Gemini 2.0 Flash (Legacy)',
    multiImage: false,
  },
];

interface RefineQuestion {
  question: string;
  options: string[];
  answer: string;
}

interface PromptVersion {
  id: string;
  prompt: string;
  refinedPrompt?: string;
  parentId: string | null;
  timestamp: number;
  source: 'manual' | 'auto-refine' | 'ai-qna';
}

interface GeneratorNodeData {
  isGenerating: boolean;
  selectedModel: string;
  seed: number | null;
  lockSeed: boolean;
  autoRefine: boolean;
  refinedPrompt: string;
  showRefineDialog: boolean;
  refineQuestions: RefineQuestion[];
  isRefining: boolean;
  lastPrompt: string;
  promptHistory: PromptVersion[];
  onChange: (data: any) => void;
  onGenerate: () => void;
  onRefine: (mode: string, extra?: any) => void;
}

interface GeneratorNodeProps {
  data: GeneratorNodeData;
}

export function GeneratorNode({ data }: GeneratorNodeProps) {
  const [showHistory, setShowHistory] = useState(false);

  const randomizeSeed = () => {
    data.onChange({ seed: Math.floor(Math.random() * 2147483647) });
  };

  const handleRefineClick = () => {
    data.onRefine('questions');
  };

  const handleApplyRefinement = () => {
    const answers = data.refineQuestions.map((q) => ({
      question: q.question,
      answer: q.answer,
    }));
    data.onRefine('apply', { answers, originalPrompt: data.lastPrompt || '' });
  };

  const handleQuestionAnswer = (index: number, answer: string) => {
    const updated = [...data.refineQuestions];
    updated[index] = { ...updated[index], answer };
    data.onChange({ refineQuestions: updated });
  };

  return (
    <div
      className="p-4 border border-purple-200 bg-white shadow-lg rounded-lg hover:shadow-xl transition-all duration-300 font-mono"
      style={{
        width: 300,
        boxShadow:
          '0 4px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(168, 85, 247, 0.1)',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        style={{ top: '20%' }}
        className="w-3 h-3 bg-blue-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        style={{ top: '40%' }}
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />

      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-mono uppercase tracking-wide text-black font-bold">
          Generator
        </label>
        {data.isGenerating && (
          <div className="animate-spin w-3 h-3 border border-purple-500 border-t-transparent rounded-full" />
        )}
      </div>

      <div className="space-y-3">
        {/* Input labels */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
            <span>Prompt</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Image (optional, multi OK)</span>
          </div>
        </div>

        {/* Model selector */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Model</label>
          <select
            value={data.selectedModel}
            onChange={(e) => data.onChange({ selectedModel: e.target.value })}
            className="w-full px-2 py-1.5 text-xs border border-gray-200 bg-white focus:outline-none focus:border-purple-400 font-mono"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Seed control */}
        <div>
          <label className="text-xs text-gray-500 block mb-1">Seed</label>
          <div className="flex gap-1">
            <input
              type="number"
              value={data.seed ?? ''}
              onChange={(e) => {
                const val = e.target.value;
                data.onChange({
                  seed: val === '' ? null : parseInt(val, 10),
                });
              }}
              placeholder="Random"
              className="flex-1 px-2 py-1.5 text-xs border border-gray-200 font-mono focus:outline-none focus:border-purple-400 min-w-0"
            />
            <button
              onClick={() => data.onChange({ lockSeed: !data.lockSeed })}
              className={`px-2 py-1.5 text-xs border transition-colors ${
                data.lockSeed
                  ? 'bg-purple-500 text-white border-purple-500'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-purple-400'
              }`}
              title={data.lockSeed ? 'Seed locked' : 'Seed unlocked'}
            >
              {data.lockSeed ? '🔒' : '🔓'}
            </button>
            <button
              onClick={randomizeSeed}
              className="px-2 py-1.5 text-xs bg-white text-gray-500 border border-gray-200 hover:border-purple-400 transition-colors"
              title="Randomize seed"
            >
              🎲
            </button>
          </div>
        </div>

        {/* Auto-refine toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={data.autoRefine}
            onChange={(e) => data.onChange({ autoRefine: e.target.checked })}
            className="w-3.5 h-3.5 accent-purple-500"
          />
          <span className="text-xs text-gray-600">Auto-refine prompt</span>
        </label>

        {/* Refined prompt preview */}
        {data.refinedPrompt && (
          <div className="p-2 bg-purple-50 border border-purple-200 rounded text-xs">
            <div className="text-purple-600 mb-1 font-bold">Refined:</div>
            <div className="text-gray-700 break-words">
              {data.refinedPrompt.length > 120
                ? `${data.refinedPrompt.slice(0, 120)}...`
                : data.refinedPrompt}
            </div>
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={() => data.onGenerate()}
          disabled={data.isGenerating}
          className="w-full px-3 py-2.5 bg-black text-white text-xs font-mono uppercase tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {data.isGenerating ? 'Generating...' : 'Generate'}
        </button>

        {/* Refine with AI button */}
        <button
          onClick={handleRefineClick}
          disabled={data.isRefining || data.isGenerating}
          className="w-full px-3 py-2 bg-white text-purple-600 text-xs font-mono uppercase tracking-wide border border-purple-300 hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {data.isRefining ? 'Loading...' : 'Refine with AI'}
        </button>

        {/* Refine Q&A Dialog */}
        {data.showRefineDialog && data.refineQuestions.length > 0 && (
          <div className="p-3 bg-purple-50 border border-purple-200 rounded space-y-3">
            <div className="text-xs font-bold text-purple-700 uppercase tracking-wide">
              AI Refinement
            </div>
            {data.refineQuestions.map((q, i) => (
              <div key={i} className="space-y-1.5">
                <div className="text-xs text-gray-700">{q.question}</div>
                <div className="flex flex-wrap gap-1">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => handleQuestionAnswer(i, opt)}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        q.answer === opt
                          ? 'bg-purple-500 text-white border-purple-500'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-purple-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {i === data.refineQuestions.length - 1 && (
                  <input
                    type="text"
                    placeholder="Or type your own..."
                    value={
                      q.options.includes(q.answer) ? '' : q.answer
                    }
                    onChange={(e) =>
                      handleQuestionAnswer(i, e.target.value)
                    }
                    className="w-full px-2 py-1 text-xs border border-gray-200 font-mono focus:outline-none focus:border-purple-400"
                  />
                )}
              </div>
            ))}
            <div className="flex gap-2">
              <button
                onClick={handleApplyRefinement}
                disabled={data.isRefining}
                className="flex-1 px-3 py-2 bg-purple-500 text-white text-xs font-mono uppercase tracking-wide hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                Apply
              </button>
              <button
                onClick={() =>
                  data.onChange({
                    showRefineDialog: false,
                    refineQuestions: [],
                  })
                }
                className="px-3 py-2 bg-gray-400 text-white text-xs font-mono uppercase tracking-wide hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Prompt History with Word-Level Diffs */}
        {data.promptHistory && data.promptHistory.length > 0 && (
          <div>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="text-xs text-gray-500 hover:text-purple-600 transition-colors"
            >
              {showHistory ? '\u25BC' : '\u25B6'} Iterations ({data.promptHistory.length})
            </button>
            {showHistory && (
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {[...data.promptHistory].reverse().map((v, i) => {
                  const idx = data.promptHistory.length - 1 - i;
                  const prev = idx > 0 ? data.promptHistory[idx - 1] : null;
                  const curText = v.refinedPrompt || v.prompt;
                  const prevText = prev ? (prev.refinedPrompt || prev.prompt) : '';
                  const diff = prevText ? wordDiff(prevText, curText) : null;
                  return (
                    <div
                      key={v.id}
                      className="p-2 bg-gray-50 border border-gray-200 rounded text-xs"
                    >
                      <div className="flex justify-between text-gray-400 mb-1">
                        <span className="font-bold">v{data.promptHistory.length - i}</span>
                        <span className="text-purple-500">{v.source}</span>
                      </div>
                      <div className="leading-relaxed break-words">
                        {diff ? (
                          diff.slice(0, 30).map((p, j) => (
                            <span
                              key={j}
                              className={
                                p.kind === 'added'
                                  ? 'bg-green-100 text-green-800'
                                  : p.kind === 'removed'
                                  ? 'bg-red-100 text-red-800 line-through'
                                  : 'text-gray-700'
                              }
                            >
                              {p.text}{' '}
                            </span>
                          ))
                        ) : (
                          <span className="text-gray-700">
                            {curText.slice(0, 100)}{curText.length > 100 ? '...' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
