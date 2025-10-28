import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export function UserProfile() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!user) return null;

  const usagePercentage = (user.usage.imagesGenerated / user.usage.dailyLimit) * 100;
  const enhancementLimit = user.tier === 'free' ? 5 : 200;
  const enhancementPercentage = (user.usage.promptsEnhanced / enhancementLimit) * 100;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200"
      >
        <img 
          src={user.picture} 
          alt={user.name}
          className="w-8 h-8 rounded-full"
        />
        <div className="text-left">
          <div className="text-sm font-mono text-black">{user.name}</div>
          <div className="text-xs text-gray-500 uppercase tracking-wide">
            {user.tier} tier
          </div>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <img 
                src={user.picture} 
                alt={user.name}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <div className="font-mono text-black font-bold">{user.name}</div>
                <div className="text-sm text-gray-600">{user.email}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wide mt-1">
                  {user.tier} tier
                </div>
              </div>
            </div>
          </div>

          {/* Usage Stats */}
          <div className="p-4 border-b border-gray-200">
            <div className="text-sm font-mono text-black mb-3 uppercase tracking-wide">
              Daily Usage
            </div>
            
            {/* Image Generation Usage */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Image Generations</span>
                <span>{user.usage.imagesGenerated} / {user.usage.dailyLimit}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Enhancement Usage */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Prompt Enhancements</span>
                <span>{user.usage.promptsEnhanced} / {enhancementLimit}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(enhancementPercentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Reset Time */}
            <div className="text-xs text-gray-500">
              Resets at: {new Date(user.usage.resetTime).toLocaleTimeString()}
            </div>
          </div>

          {/* Upgrade Notice (for free users) */}
          {user.tier === 'free' && (
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
              <div className="text-sm font-mono text-black mb-2 uppercase tracking-wide">
                Upgrade to Premium
              </div>
              <div className="text-xs text-gray-600 mb-3">
                Get 100 daily generations, no cooldowns, and priority support
              </div>
              <button className="w-full px-3 py-2 bg-black text-white text-xs font-mono uppercase tracking-wide hover:bg-gray-800 transition-colors">
                Coming Soon
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="p-4">
            <button
              onClick={logout}
              className="w-full px-3 py-2 text-red-600 hover:bg-red-50 text-sm font-mono uppercase tracking-wide transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
