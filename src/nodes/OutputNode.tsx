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
    <div className="p-4 border border-gray-600 bg-black w-72 font-mono">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-white border border-gray-500" 
      />
      
      <div className="mb-3">
        <label className="text-white text-xs font-bold tracking-wider uppercase">
          OUTPUT
        </label>
      </div>
      
      <div className="w-full h-48 border border-dashed border-gray-700 bg-gray-900 flex items-center justify-center">
        {data.imageUrl ? (
          <img 
            src={data.imageUrl} 
            alt="Generated" 
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 border border-gray-600 mb-3 flex items-center justify-center mx-auto">
              <span className="text-gray-500 text-xs">OUT</span>
            </div>
            <span className="text-xs text-gray-500 font-mono">
              GENERATED IMAGE WILL APPEAR HERE
            </span>
          </div>
        )}
      </div>
      
      {data.imageUrl && (
        <button
          onClick={handleDownload}
          className="w-full mt-3 px-3 py-2 border border-gray-600 text-white hover:bg-gray-900 transition-colors text-xs font-mono tracking-wide"
        >
          DOWNLOAD
        </button>
      )}
    </div>
  );
}

