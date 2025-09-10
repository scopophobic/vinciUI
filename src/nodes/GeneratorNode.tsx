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
    <div className="p-4 border border-gray-600 bg-black w-72 font-mono">
      <Handle 
        type="target" 
        position={Position.Left} 
        id="prompt" 
        style={{ top: '30%' }} 
        className="w-3 h-3 bg-white border border-gray-500" 
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        id="image" 
        style={{ top: '70%' }} 
        className="w-3 h-3 bg-white border border-gray-500" 
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-white border border-gray-500" 
      />
      
      <div className="mb-3">
        <label className="text-white text-xs font-bold tracking-wider uppercase">
          GENERATOR
        </label>
      </div>
      
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-2 h-2 bg-white"></div>
          <span>PROMPT INPUT</span>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="w-2 h-2 bg-white"></div>
          <span>IMAGE INPUT (OPTIONAL)</span>
        </div>
        
        {data.isGenerating && (
          <div className="flex items-center gap-2 text-white">
            <div className="animate-spin w-3 h-3 border border-white border-t-transparent"></div>
            <span className="text-xs font-mono">GENERATING...</span>
          </div>
        )}
        
        <div className="text-xs text-gray-600 mt-2 font-mono">
          CONNECT INPUTS AND GENERATE
        </div>
      </div>
    </div>
  );
}

