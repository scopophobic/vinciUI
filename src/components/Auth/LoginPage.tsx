import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = () => {
    setIsLoading(true);
    login();
  };

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
            Sign in to start creating stunning AI-generated images with our intuitive visual workflow.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-8 w-full max-w-md"
             style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.05)' }}>
          
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-black mb-2 uppercase tracking-wide">
              Welcome Back
            </h2>
            <p className="text-sm text-gray-600">
              Sign in to access your creative workspace
            </p>
          </div>

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className={`
              w-full flex items-center justify-center gap-3 px-6 py-3 
              border border-gray-300 bg-white text-gray-700 
              hover:bg-gray-50 hover:border-gray-400 
              transition-all duration-200 font-mono text-sm
              ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}
            `}
          >
            {isLoading ? (
              <div className="animate-spin w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            <span className="uppercase tracking-wide">
              {isLoading ? 'Signing in...' : 'Continue with Google'}
            </span>
          </button>

          {/* Features */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center mb-4 uppercase tracking-wide">
              What you get:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>2 free image generations daily</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <span>5 prompt enhancements daily</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <span>Advanced node-based workflow</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
                <span>Image stitching & enhancement tools</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide">
            Secure authentication • Privacy protected • No spam
          </p>
        </div>
      </div>
    </div>
  );
}
