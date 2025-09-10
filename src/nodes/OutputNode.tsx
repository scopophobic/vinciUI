import { Handle, Position } from 'reactflow';

interface OutputNodeData {
  imageUrl: string;
  onChange: (data: { imageUrl: string }) => void;
}

interface OutputNodeProps {
  data: OutputNodeData;
}

export function OutputNode({ data }: OutputNodeProps) {
  const handleDownload = () => {
    if (data.imageUrl) {
      const link = document.createElement('a');
      link.href = data.imageUrl;
      link.download = 'generated-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="p-4 border border-gray-300 bg-white shadow-sm w-64 hover:shadow-md transition-shadow font-mono">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-black" />
      
      <div className="flex items-center mb-3">
        <label className="text-sm font-mono uppercase tracking-wide text-black">Output</label>
      </div>
      
      <div className="w-full h-48 border border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
        {data.imageUrl ? (
          <img 
            src={data.imageUrl} 
            alt="Generated" 
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 border border-gray-400 mb-2 mx-auto"></div>
            <span className="text-xs text-gray-500 font-mono">
              Output appears here
            </span>
          </div>
        )}
      </div>
      
      {data.imageUrl && (
        <button
          onClick={handleDownload}
          className="w-full mt-3 px-3 py-2 bg-black text-white text-xs font-mono uppercase tracking-wide hover:bg-gray-800 transition-colors"
        >
          Download
        </button>
      )}
    </div>
  );
}

