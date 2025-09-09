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
    <div className="p-4 border-2 border-blue-200 rounded-lg bg-white shadow-lg w-64 hover:shadow-xl transition-shadow">
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-blue-500" />
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">📝</span>
        <label className="font-bold text-gray-800">Prompt</label>
      </div>
      <textarea
        className="w-full mt-2 p-3 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows={4}
        placeholder="Describe what you want to generate..."
        value={data.prompt || ''}
        onChange={(e) => data.onChange({ prompt: e.target.value })}
      />
    </div>
  );
}

