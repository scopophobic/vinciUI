import { Handle, Position } from 'reactflow';

interface GeneratorNodeData {
  isGenerating: boolean;
  onChange: (data: { isGenerating: boolean }) => void;
}

interface GeneratorNodeProps {
  data: GeneratorNodeData;
}

export function GeneratorNode({ data }: GeneratorNodeProps) {
  return (
    <div className="p-4 border border-purple-200 bg-white shadow-lg rounded-lg w-64 hover:shadow-xl transition-all duration-300 font-mono" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(168, 85, 247, 0.1)' }}>
      <Handle type="target" position={Position.Left} id="prompt" style={{ top: '30%' }} className="w-3 h-3 bg-blue-500" />
      <Handle type="target" position={Position.Left} id="image" style={{ top: '70%' }} className="w-3 h-3 bg-green-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500" />
      
      <div className="flex items-center mb-3">
        <label className="text-sm font-mono uppercase tracking-wide text-black">Generator</label>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-600 font-mono">
          <div className="w-2 h-2 bg-black"></div>
          <span>Prompt</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-600 font-mono">
          <div className="w-2 h-2 bg-black"></div>
          <span>Image (Optional)</span>
        </div>
        
        {data.isGenerating && (
          <div className="flex items-center gap-2 text-black">
            <div className="animate-spin w-3 h-3 border border-black border-t-transparent"></div>
            <span className="text-xs font-mono">Processing...</span>
          </div>
        )}
        
        <div className="text-xs text-gray-400 mt-2 font-mono">
          Connect inputs and generate
        </div>
      </div>
    </div>
  );
}

