import { Handle, Position } from 'reactflow';

interface OutputNodeData {
  imageUrl: string;
  imageBase64: string;
  currentPrompt: string;
  onChange: (data: any) => void;
}

interface OutputNodeProps {
  data: OutputNodeData;
}

export function OutputNode({ data }: OutputNodeProps) {
  const handleDownload = () => {
    if (data.imageUrl) {
      const link = document.createElement('a');
      link.href = data.imageUrl;
      link.download = `vinci-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div
      className="p-4 border border-orange-200 bg-white shadow-lg rounded-lg hover:shadow-xl transition-all duration-300 font-mono"
      style={{
        width: 280,
        boxShadow:
          '0 4px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(249, 115, 22, 0.1)',
      }}
    >
      {/* Target: receives image from Generator */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-orange-500"
      />
      {/* Source: feeds image as input to another Generator */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-orange-500"
      />

      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-mono uppercase tracking-wide text-black font-bold">
          Output
        </label>
        {data.imageBase64 && (
          <span className="text-xs text-green-600">● connectable</span>
        )}
      </div>

      <div className="w-full h-48 border border-dashed border-gray-300 flex items-center justify-center bg-gray-50 rounded overflow-hidden">
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt="Generated"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-center">
            <div className="w-12 h-12 border border-gray-300 mb-2 mx-auto rounded" />
            <span className="text-xs text-gray-400 font-mono">
              Waiting for generation...
            </span>
          </div>
        )}
      </div>

      {data.currentPrompt && (
        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600 break-words">
          {data.currentPrompt.length > 100
            ? `${data.currentPrompt.slice(0, 100)}...`
            : data.currentPrompt}
        </div>
      )}

      {data.imageUrl && (
        <button
          onClick={handleDownload}
          className="w-full mt-3 px-3 py-2 bg-black text-white text-xs font-mono uppercase tracking-wide hover:bg-gray-800 transition-colors"
        >
          Download
        </button>
      )}

      {data.imageBase64 && (
        <div className="mt-2 text-xs text-gray-400 text-center">
          Drag from → to feed into another Generator
        </div>
      )}
    </div>
  );
}
