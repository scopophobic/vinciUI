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
    <div className="p-4 border-2 border-orange-200 rounded-lg bg-white shadow-lg w-64 hover:shadow-xl transition-shadow">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-orange-500" />
      
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🎨</span>
        <label className="font-bold text-gray-800">Output</label>
      </div>
      
      <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
        {data.imageUrl ? (
          <img 
            src={data.imageUrl} 
            alt="Generated" 
            className="max-w-full max-h-full object-contain rounded"
          />
        ) : (
          <div className="text-center">
            <span className="text-3xl text-gray-400 block mb-2">🖼️</span>
            <span className="text-sm text-gray-500">
              Generated image will appear here
            </span>
          </div>
        )}
      </div>
      
      {data.imageUrl && (
        <button
          onClick={handleDownload}
          className="w-full mt-3 px-3 py-2 bg-orange-500 text-white rounded-md text-sm hover:bg-orange-600 transition-colors"
        >
          💾 Download
        </button>
      )}
    </div>
  );
}

