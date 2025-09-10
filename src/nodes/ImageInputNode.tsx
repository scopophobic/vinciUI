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
    <div className="p-4 border border-gray-600 bg-black w-72 font-mono">
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-white border border-gray-500" 
      />
      <div className="mb-3">
        <label className="text-white text-xs font-bold tracking-wider uppercase">
          IMAGE INPUT
        </label>
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
        className="w-full h-32 border border-dashed border-gray-700 bg-gray-900 flex flex-col items-center justify-center cursor-pointer hover:border-gray-500 transition-colors"
      >
        {data.imageBase64 ? (
          <img 
            src={`data:image/png;base64,${data.imageBase64}`} 
            alt="Uploaded" 
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <>
            <div className="w-8 h-8 border border-gray-600 mb-2 flex items-center justify-center">
              <span className="text-gray-500 text-xs">IMG</span>
            </div>
            <span className="text-xs text-gray-500 text-center font-mono">
              CLICK TO UPLOAD
            </span>
          </>
        )}
      </div>
    </div>
  );
}

