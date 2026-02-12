export function Logo({ className = "h-8 w-8" }: { className?: string }) {
    return (
        <div className={className}>
            <LogoIcon className="h-full w-full" />
        </div>
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
                d="M4 6C4 4.89543 4.89543 4 6 4H10L14 8V20C14 21.1046 13.1046 22 12 22H6C4.89543 22 4 21.1046 4 20V6Z"
                className="fill-accent-400"
            />
            <path
                d="M14 8L18 12L14 16V8Z"
                className="fill-accent-400"
            />
            {/* Abstract chip lines/details in blue */}
            <path
                d="M7 8H11M7 12H11M7 16H11"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary-600"
            />
        </svg>
    );
}

export function LogoWithText({ classNameIcon = "h-8 w-8", classNameText = "text-lg", showText = true }: { classNameIcon?: string; classNameText?: string; showText?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`flex items-center justify-center ${classNameIcon}`}>
                <LogoIcon />
            </div>
            {showText && <span className={`font-bold text-primary-600 ${classNameText} leading-none tracking-tight`}>aspect</span>}
        </div>
    );
}
