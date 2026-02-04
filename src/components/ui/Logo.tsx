export function Logo({ className = "h-8 w-8" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path
                d="M16 2L4 9V23L16 30L28 23V9L16 2Z"
                className="fill-primary-600"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M16 12L10 16L16 20L22 16L16 12Z"
                fill="currentColor"
                className="text-white"
            />
        </svg>
    );
}

export function LogoIcon({ className = "h-2/3 w-2/3" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path
                d="M12 2L3 7V17L12 22L21 17V7L12 2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path
                d="M12 8L8 11L12 14L16 11L12 8Z"
                fill="currentColor"
            />
        </svg>
    );
}

export function LogoWithText({ classNameIcon = "h-8 w-8", classNameText = "text-lg", showText = true }: { classNameIcon?: string; classNameText?: string; showText?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center rounded-lg bg-primary-600 text-white ${classNameIcon}`}>
                <LogoIcon />
            </div>
            {showText && <span className={`font-bold text-gray-900 ${classNameText} leading-none`}>Chumley AI</span>}
        </div>
    );
}
