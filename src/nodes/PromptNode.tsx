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
    <div className="p-4 border border-blue-200 bg-white shadow-lg rounded-lg w-64 hover:shadow-xl transition-all duration-300 font-mono" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(59, 130, 246, 0.1)' }}>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
      <div className="flex items-center mb-3">
        <label className="text-sm font-mono uppercase tracking-wide text-black">Prompt</label>
      </div>
      <textarea
        className="w-full p-2 border border-gray-200 text-sm resize-none focus:outline-none focus:border-black font-mono"
        rows={4}
        placeholder="Enter prompt..."
        value={data.prompt || ''}
        onChange={(e) => data.onChange({ prompt: e.target.value })}
      />
    </div>
  );
}

