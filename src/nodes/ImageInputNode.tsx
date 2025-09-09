import { Handle, Position } from 'reactflow';
import { useRef } from 'react';

interface ImageInputNodeData {
  imageBase64: string;
  onChange: (data: { imageBase64: string }) => void;
}

interface ImageInputNodeProps {
  data: ImageInputNodeData;
}

export function ImageInputNode({ data }: ImageInputNodeProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        // Remove the data:image/...;base64, prefix to get just the base64 string
        const base64Data = base64.split(',')[1];
        data.onChange({ imageBase64: base64Data });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="p-4 border-2 border-green-200 rounded-lg bg-white shadow-lg w-64 hover:shadow-xl transition-shadow">
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-green-500" />
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🖼️</span>
        <label className="font-bold text-gray-800">Image Input</label>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      
      <div 
        onClick={handleClick}
        className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
      >
        {data.imageBase64 ? (
          <img 
            src={`data:image/png;base64,${data.imageBase64}`} 
            alt="Uploaded" 
            className="max-w-full max-h-full object-contain rounded"
          />
        ) : (
          <>
            <span className="text-3xl text-gray-400 mb-2">📁</span>
            <span className="text-sm text-gray-500 text-center">
              Click to upload an image
            </span>
          </>
        )}
      </div>
    </div>
  );
}

