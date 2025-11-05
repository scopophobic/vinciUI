import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export function UserProfile() {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  if (!user) return null;

  const usagePercentage = (user.usage.imagesGenerated / user.usage.dailyLimit) * 100;
  const enhancementLimit = user.tier === 'free' 
    ? 5 
    : user.tier === 'tester' 
      ? 100 
      : user.tier === 'developer' 
        ? 1000 
        : 200;

  useEffect(() => {
    function positionPanel() {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const panelWidth = Math.min(384, Math.max(320, Math.floor(window.innerWidth * 0.9))); // 80-96 tailwind widths
      const horizontalMargin = 8;
      let left = rect.left;
      if (left + panelWidth + horizontalMargin > window.innerWidth) {
        left = window.innerWidth - panelWidth - horizontalMargin;
      }
      left = Math.max(horizontalMargin, left);
      const top = rect.bottom + 8; // 8px gap
      setPanelStyle({
        top,
        left,
        width: panelWidth,
        maxWidth: '90vw'
      });
    }

    positionPanel();
    window.addEventListener('resize', positionPanel);
    window.addEventListener('scroll', positionPanel, true);
    return () => {
      window.removeEventListener('resize', positionPanel);
      window.removeEventListener('scroll', positionPanel, true);
    };
  }, [showDropdown]);
  const enhancementPercentage = (user.usage.promptsEnhanced / enhancementLimit) * 100;

  const avatarSrc = user.picture && user.picture.trim()
    ? user.picture
    : `/profile.png`;

  return (
    <div className="relative">
      <button
        ref={anchorRef}
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 p-2 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all duration-200"
      >
        <img 
          src={avatarSrc}
          alt={user.name || 'User'}
          className="w-8 h-8 rounded-full"
          loading="lazy"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/profile.png'; }}
        />
        <div className="text-left">
          <div className="text-sm font-mono text-black">{user.name}</div>
          <div className={`text-xs uppercase tracking-wide ${
            user.tier === 'developer' ? 'text-purple-600 font-bold' : 
            user.tier === 'premium' ? 'text-blue-600' : 
            user.tier === 'tester' ? 'text-amber-600' : 'text-gray-500'
          }`}>
            {user.tier} {user.tier === 'developer' ? '🔧' : user.tier === 'premium' ? '⭐' : user.tier === 'tester' ? '🧪' : ''} tier
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
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]"
          style={panelStyle}
        >
          {/* User Info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <img 
                src={avatarSrc}
                alt={user.name || 'User'}
                className="w-12 h-12 rounded-full"
                loading="lazy"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/profile.png'; }}
              />
              <div>
                <div className="font-mono text-black font-bold">{user.name}</div>
                <div className="text-sm text-gray-600">{user.email}</div>
                <div className={`text-xs uppercase tracking-wide mt-1 ${
                  user.tier === 'developer' ? 'text-purple-600 font-bold' : 
                  user.tier === 'premium' ? 'text-blue-600' : 
                  user.tier === 'tester' ? 'text-amber-600' : 'text-gray-500'
                }`}>
                  {user.tier} {user.tier === 'developer' ? '🔧' : user.tier === 'premium' ? '⭐' : user.tier === 'tester' ? '🧪' : ''} tier
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
              {user.tier === 'free' ? (
                <span>Credits do not reset (free tier)</span>
              ) : (
                <span>Resets at: {new Date(user.usage.resetTime).toLocaleTimeString()}</span>
              )}
            </div>
          </div>

          {/* Developer Privileges */}
          {user.tier === 'developer' && (
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
              <div className="text-sm font-mono text-black mb-2 uppercase tracking-wide">
                🔧 Developer Privileges
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>1000 daily generations</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>No cooldown periods</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Content moderation bypass</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Extended prompt length (2000 chars)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <span>Full API access for testing</span>
                </div>
              </div>
            </div>
          )}

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
