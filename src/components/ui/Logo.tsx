export function Logo({ className = "h-8 w-8" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path
                d="M26 10L16 4.5L6 10V22L16 27.5L26 22"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary-600"
            />
            <circle cx="16" cy="16" r="4" className="fill-primary-600" />
            <path
                d="M16 4.5V10"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                className="text-primary-600/50"
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
                d="M20 7.5L12 3L4 7.5V16.5L12 21L20 16.5"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="3" fill="currentColor" />
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
