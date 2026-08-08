import { useNavigate } from 'react-router-dom';

// Reusable MedSupply logo mark + optional text lockup.
// Clicking the logo navigates to the landing page ('/') by default,
// unless a custom onClick handler is provided.
export default function Logo({
  size = 32,
  showText = false,
  variant = 'default', // 'light' | 'dark' | 'default'
  textSize = 'text-base',
  className = '',
  onClick,
}) {
  const navigate = useNavigate();

  const textColor = variant === 'light'
    ? 'text-white'
    : variant === 'dark'
      ? 'text-slate-900'
      : 'text-slate-800';

  const subColor = variant === 'light' ? 'text-slate-400' : 'text-slate-500';

  const handleClick = (e) => {
    if (onClick) {
      onClick(e);
      return;
    }
    // Default: go to landing page
    navigate('/');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Go to Home"
      aria-label="MedSupply Home"
      className={`flex items-center gap-2.5 cursor-pointer transition-opacity hover:opacity-85 focus:outline-none ${className}`}
      style={{ background: 'transparent', border: 'none', padding: 0 }}
    >
      {/* Logo mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        <defs>
          <linearGradient id="medLogoGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2563EB" />
            <stop offset="1" stopColor="#0D9488" />
          </linearGradient>
        </defs>
        {/* Shield/hexagon background */}
        <path
          d="M32 2 L58 13 V40 C58 51 47 60 32 62 C17 60 6 51 6 40 V13 Z"
          fill="url(#medLogoGrad)"
        />
        {/* Medical cross */}
        <rect x="27" y="15" width="10" height="34" rx="4.5" fill="#FFFFFF" />
        <rect x="15" y="27" width="34" height="10" rx="4.5" fill="#FFFFFF" />
        {/* Pill accent */}
        <g transform="rotate(45 46 17)">
          <rect x="42" y="11" width="9" height="13" rx="4.5" fill="#FCD34D" />
          <rect x="42" y="11" width="4.5" height="13" rx="2.25" fill="#F59E0B" />
        </g>
      </svg>

      {/* Text lockup */}
      {showText && (
        <div className="leading-tight text-left">
          <div className={`font-bold ${textSize} ${textColor}`}>MedSupply</div>
          <div className={`text-[10px] font-medium uppercase tracking-widest ${subColor}`}>Rwanda</div>
        </div>
      )}
    </button>
  );
}
