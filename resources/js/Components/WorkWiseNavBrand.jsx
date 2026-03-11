import { useTheme } from '@/Contexts/ThemeContext';

export default function WorkWiseNavBrand() {
    const { theme } = useTheme();
    const isDark = theme === 'dark';
    return (
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12">
                <img
                    src="/image/WorkWise_logo.png"
                    alt="WorkWise Logo"
                    className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                />
            </div>
            <span
                className={`text-2xl md:text-3xl font-black tracking-tighter ${isDark ? 'text-white' : 'text-gray-900'}`}
                style={{ textShadow: isDark ? '0 2px 10px rgba(0,0,0,0.5)' : 'none' }}
            >
                <span className="text-blue-500">W</span>orkWise
            </span>
        </div>
    );
}
