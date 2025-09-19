import { useState } from 'react';

interface LandingPageProps {
  onEnter: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="min-h-screen bg-white font-mono relative overflow-hidden">
      {/* Dot pattern background */}
      <div 
        className="fixed inset-0 z-0" 
        style={{
          background: 'rgb(255, 255, 255) radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.15) 1px, transparent 0px) 0% 0% / 20px 20px'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-6xl md:text-8xl font-bold text-black mb-4 tracking-tight">
            VINCI<span className="text-gray-600">UI</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-700 mb-2 tracking-wide">
            NODE-BASED IMAGE GENERATION
          </p>
          <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto leading-relaxed">
            Create stunning images using AI with an intuitive visual workflow. 
            Connect nodes, enhance prompts, and generate art with Gemini's latest models.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 max-w-4xl">
          <div className="text-center p-6 border border-gray-200 bg-white shadow-lg rounded-lg hover:shadow-xl transition-all duration-300" 
               style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)' }}>
            <div className="w-12 h-12 bg-blue-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <div className="text-white text-xl">🎨</div>
            </div>
            <h3 className="text-lg font-bold text-black mb-2 uppercase tracking-wide">Visual Workflow</h3>
            <p className="text-sm text-gray-600">
              Build your image generation pipeline by connecting intuitive nodes
            </p>
          </div>

          <div className="text-center p-6 border border-gray-200 bg-white shadow-lg rounded-lg hover:shadow-xl transition-all duration-300"
               style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)' }}>
            <div className="w-12 h-12 bg-green-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <div className="text-white text-xl">⚡</div>
            </div>
            <h3 className="text-lg font-bold text-black mb-2 uppercase tracking-wide">AI Enhanced</h3>
            <p className="text-sm text-gray-600">
              Powered by Gemini 2.5 Flash for superior image generation and prompt enhancement
            </p>
          </div>

          <div className="text-center p-6 border border-gray-200 bg-white shadow-lg rounded-lg hover:shadow-xl transition-all duration-300"
               style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)' }}>
            <div className="w-12 h-12 bg-purple-500 rounded-lg mx-auto mb-4 flex items-center justify-center">
              <div className="text-white text-xl">🔧</div>
            </div>
            <h3 className="text-lg font-bold text-black mb-2 uppercase tracking-wide">Advanced Tools</h3>
            <p className="text-sm text-gray-600">
              Image stitching, prompt enhancement, and multi-model support
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={onEnter}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`
            px-12 py-4 bg-black text-white border-2 border-black 
            hover:bg-white hover:text-black transition-all duration-300 
            text-lg font-bold uppercase tracking-widest
            transform ${isHovered ? 'scale-105' : 'scale-100'}
            shadow-lg hover:shadow-xl
          `}
          style={{ 
            boxShadow: isHovered 
              ? '0 8px 25px rgba(0,0,0,0.2), 0 0 0 2px rgba(0,0,0,0.1)' 
              : '0 4px 15px rgba(0,0,0,0.1)' 
          }}
        >
          Enter Workshop
        </button>

        {/* Footer */}
        <div className="mt-16 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Built with React Flow • Powered by Gemini AI • Made with precision
          </p>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-10 right-10 w-32 h-32 border border-gray-200 rotate-45 opacity-20" />
      <div className="absolute bottom-10 left-10 w-24 h-24 border border-gray-300 rotate-12 opacity-30" />
    </div>
  );
}
