import { Handle, Position } from 'reactflow';
import { useRef, useEffect, useState } from 'react';

interface ImageStitchNodeData {
  images: string[];
  stitchedImage: string;
  layout: 'horizontal' | 'vertical' | 'grid';
  nodeId: string;
  onChange: (data: any) => void;
  getConnectedImages?: () => string[];
}

interface ImageStitchNodeProps {
  data: ImageStitchNodeData;
}

export function ImageStitchNode({ data }: ImageStitchNodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageCount, setImageCount] = useState(2);

  // Use connected images from data
  const collectConnectedImages = () => {
    return (data.images || []).filter(img => img && img.trim() !== '');
  };

  const stitchImages = async () => {
    console.log('Starting stitch process...');
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('Canvas not found');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Canvas context not found');
      return;
    }

    const connectedImages = collectConnectedImages();
    console.log('All connected images:', connectedImages);
    const validImages = connectedImages.filter(img => img && img.trim() !== '');
    console.log('Valid images after filtering:', validImages.length);
    
    if (validImages.length === 0) {
      console.warn('No valid images to stitch');
      alert('No valid images found. Make sure images are uploaded and connected.');
      return;
    }

    try {
      // Load all images
      const imageElements = await Promise.all(
        validImages.map(imageBase64 => {
          return new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = `data:image/png;base64,${imageBase64}`;
          });
        })
      );

      // Calculate canvas size based on layout
      let canvasWidth = 512;
      let canvasHeight = 512;

      if (data.layout === 'horizontal') {
        canvasWidth = 256 * imageElements.length;
        canvasHeight = 256;
      } else if (data.layout === 'vertical') {
        canvasWidth = 256;
        canvasHeight = 256 * imageElements.length;
      } else { // grid
        const cols = Math.ceil(Math.sqrt(imageElements.length));
        const rows = Math.ceil(imageElements.length / cols);
        canvasWidth = 256 * cols;
        canvasHeight = 256 * rows;
      }

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw images based on layout
      imageElements.forEach((img, index) => {
        let x = 0;
        let y = 0;

        if (data.layout === 'horizontal') {
          x = index * 256;
          y = 0;
        } else if (data.layout === 'vertical') {
          x = 0;
          y = index * 256;
        } else { // grid
          const cols = Math.ceil(Math.sqrt(imageElements.length));
          x = (index % cols) * 256;
          y = Math.floor(index / cols) * 256;
        }

        ctx.drawImage(img, x, y, 256, 256);
      });

      // Export stitched image
      const stitchedBase64 = canvas.toDataURL('image/png').split(',')[1];
      data.onChange({ stitchedImage: stitchedBase64 });

    } catch (error) {
      console.error('Error stitching images:', error);
    }
  };

  // Remove auto-stitching on image changes
  // useEffect(() => {
  //   if (data.images && data.images.length > 0) {
  //     stitchImages();
  //   }
  // }, [data.images, data.layout]);

  return (
    <div className="p-4 border border-cyan-200 bg-white shadow-lg rounded-lg w-80 hover:shadow-xl transition-all duration-300 font-mono" style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(6, 182, 212, 0.1)' }}>
      {/* Input handles for multiple images */}
      {Array.from({ length: imageCount }, (_, i) => (
        <Handle
          key={i}
          type="target"
          position={Position.Left}
          id={`image-${i}`}
          style={{ top: `${20 + (i * 60 / imageCount)}%` }}
          className="w-3 h-3 bg-green-500"
        />
      ))}
      
      {/* Output handle */}
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-cyan-500" />
      
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-mono uppercase tracking-wide text-black">Image Stitch</label>
        <button
          onClick={() => setImageCount(Math.min(imageCount + 1, 6))}
          className="w-6 h-6 bg-cyan-500 text-white text-xs rounded hover:bg-cyan-600"
        >
          +
        </button>
      </div>
      
        <div className="space-y-3">

        <div className="flex gap-2">
          {(['horizontal', 'vertical', 'grid'] as const).map(layout => (
            <button
              key={layout}
              onClick={() => data.onChange({ ...data, layout })}
              className={`px-2 py-1 text-xs font-mono border rounded ${
                data.layout === layout 
                  ? 'bg-cyan-500 text-white border-cyan-500' 
                  : 'bg-white text-gray-600 border-gray-300 hover:border-cyan-400'
              }`}
            >
              {layout}
            </button>
          ))}
        </div>

        <canvas
          ref={canvasRef}
          className="w-full h-32 border border-gray-200 object-contain bg-gray-50"
          style={{ imageRendering: 'pixelated' }}
        />

        <div className="flex gap-2">
          <button
            onClick={() => {
              console.log('Stitch button clicked');
              console.log('Connected images:', collectConnectedImages());
              console.log('Data images:', data.images);
              stitchImages();
            }}
            disabled={collectConnectedImages().length === 0}
            className="flex-1 px-3 py-2 bg-cyan-500 text-white text-xs font-mono uppercase tracking-wide hover:bg-cyan-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Stitch Images ({collectConnectedImages().length})
          </button>
          <button
            onClick={() => data.onChange({ ...data, stitchedImage: '', images: [] })}
            className="px-3 py-2 bg-gray-400 text-white text-xs font-mono uppercase tracking-wide hover:bg-gray-500 transition-colors"
          >
            Clear
          </button>
        </div>

        <div className="text-xs text-gray-400 font-mono">
          Upload {imageCount} images • Layout: {data.layout}
          {collectConnectedImages().length > 0 && (
            <div className="text-green-600 mt-1">
              ✓ {collectConnectedImages().length} image(s) ready
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
