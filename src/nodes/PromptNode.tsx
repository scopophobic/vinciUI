import { Handle, Position } from 'reactflow';

interface PromptNodeData {
  prompt: string;
  onChange: (data: { prompt: string }) => void;
}

interface PromptNodeProps {
  data: PromptNodeData;
}

export function PromptNode({ data }: PromptNodeProps) {
  return (
    <div className="p-4 border border-gray-600 bg-black w-72 font-mono">
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-white border border-gray-500" 
      />
      <div className="mb-3">
        <label className="text-white text-xs font-bold tracking-wider uppercase">
          PROMPT
        </label>
      </div>
      <textarea
        className="w-full p-3 bg-gray-900 border border-gray-700 text-white text-sm resize-none focus:outline-none focus:border-gray-500 font-mono placeholder-gray-500"
        rows={4}
        placeholder="Enter your prompt..."
        value={data.prompt || ''}
        onChange={(e) => data.onChange({ prompt: e.target.value })}
      />
    </div>
  );
}

