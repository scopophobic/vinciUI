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
    <div className="p-4 border-2 border-purple-200 rounded-lg bg-white shadow-lg w-64 hover:shadow-xl transition-shadow">
      <Handle type="target" position={Position.Left} id="prompt" style={{ top: '30%' }} className="w-3 h-3 bg-blue-500" />
      <Handle type="target" position={Position.Left} id="image" style={{ top: '70%' }} className="w-3 h-3 bg-green-500" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-500" />
      
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">⚡</span>
        <label className="font-bold text-gray-800">Gemini Generator</label>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
          <span>Prompt Input</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span>Image Input (Optional)</span>
        </div>
        
        {data.isGenerating && (
          <div className="flex items-center gap-2 text-purple-600">
            <div className="animate-spin w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
            <span className="text-sm font-medium">Generating...</span>
          </div>
        )}
        
        <div className="text-xs text-gray-500 mt-2">
          Connect inputs and click Generate to create an image
        </div>
      </div>
    </div>
  );
}

