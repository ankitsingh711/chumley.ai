import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { uploadApi } from '../../services/upload.service';
import { Button } from './Button';

interface ImageUploadProps {
    value?: string;
    onChange: (url: string) => void;
    label?: string;
}

export function ImageUpload({ value, onChange, label = "Upload Image" }: ImageUploadProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Reset
        setError(null);
        setLoading(true);

        // Create local preview immediately
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);

        try {
            // Validate size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                throw new Error("File size exceeds 5MB limit");
            }

            const url = await uploadApi.uploadFile(file);
            onChange(url);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to upload image');
            setPreviewUrl(null); // Clear preview on error
        } finally {
            setLoading(false);
            // Reset input so same file can be selected again
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemove = () => {
        onChange('');
        setPreviewUrl(null);
    };

    const displayUrl = previewUrl || value;

    return (
        <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-700">{label}</label>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
            />

            {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                    <X className="h-4 w-4" />
                    {error}
                </div>
            )}

            {displayUrl ? (
                <div className="relative inline-block group">
                    <div className="relative overflow-hidden rounded-xl border-2 border-gray-100 shadow-sm h-32 w-32 bg-gray-50">
                        <img
                            src={displayUrl}
                            alt="Uploaded"
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                            onError={(e) => {
                                // Fallback for broken images
                                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=Image&background=random`;
                            }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                    </div>

                    <button
                        type="button"
                        onClick={handleRemove}
                        className="absolute -top-2 -right-2 bg-white text-red-500 border border-gray-100 rounded-full p-1.5 hover:bg-red-50 hover:scale-110 transition-all shadow-md z-10"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    {loading && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl backdrop-blur-[1px] z-20">
                            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                        </div>
                    )}
                </div>
            ) : (
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="h-32 w-full max-w-sm flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-xl hover:bg-primary-50 hover:border-primary-400 hover:text-primary-600 transition-all group"
                >
                    {loading ? (
                        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                    ) : (
                        <>
                            <div className="p-3 bg-gray-50 rounded-full group-hover:bg-white group-hover:shadow-sm transition-all">
                                <Upload className="h-6 w-6 text-gray-400 group-hover:text-primary-500" />
                            </div>
                            <div className="text-center">
                                <span className="text-sm font-semibold text-gray-600 group-hover:text-primary-700">Click to upload</span>
                                <p className="text-xs text-gray-400 mt-1">SVG, PNG, JPG (max 5MB)</p>
                            </div>
                        </>
                    )}
                </Button>
            )}
        </div>
    );
}
