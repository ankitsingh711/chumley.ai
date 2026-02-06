import { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { X, Upload, FileText, Loader2 } from 'lucide-react';
import { Select } from '../ui/Select';
import { DatePicker } from '../ui/DatePicker';
import { uploadApi } from '../../services/upload.service';
import { suppliersApi } from '../../services/suppliers.service';

interface AddDocumentModalProps {
    isOpen: boolean;
    onClose: () => void;
    supplierId: string;
    onSuccess: () => void;
}

export function AddDocumentModal({ isOpen, onClose, supplierId, onSuccess }: AddDocumentModalProps) {
    const [loading, setLoading] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        type: 'Contract',
        expiryDate: '', // YYYY-MM-DD string
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            if (!formData.title) {
                // Auto-fill title from filename
                const name = selectedFile.name.split('.').slice(0, -1).join('.');
                setFormData(prev => ({ ...prev, title: name }));
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        try {
            // 1. Upload File
            const url = await uploadApi.uploadImage(file);

            // 2. Create Document Record
            await suppliersApi.addDocument(supplierId, {
                title: formData.title,
                type: formData.type,
                url: url,
                expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined,
            });

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Failed to upload document:', error);
            // Ideally show toast error
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900">Upload Document</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="h-4 w-4 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* File Upload Area */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors ${file ? 'border-primary-200 bg-primary-50' : 'border-gray-200 hover:border-primary-400 hover:bg-gray-50'
                            }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".pdf,.doc,.docx,.jpg,.png"
                        />

                        {file ? (
                            <div className="text-center">
                                <div className="h-10 w-10 mx-auto bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center mb-2">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium text-gray-900 truncate max-w-[200px] mx-auto">{file.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="h-10 w-10 mx-auto bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center mb-2">
                                    <Upload className="h-5 w-5" />
                                </div>
                                <p className="text-sm font-medium text-gray-700">Click to upload</p>
                                <p className="text-xs text-gray-500 mt-1">PDF, DOC, Images (max 5MB)</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                className="w-full h-10 px-3 rounded-lg border border-gray-200 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all text-sm"
                                placeholder="e.g. Liability Insurance 2024"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                                <Select
                                    value={formData.type}
                                    onChange={(val) => setFormData(prev => ({ ...prev, type: val || 'Contract' }))}
                                    options={[
                                        { value: 'Tax', label: 'Tax Document' },
                                        { value: 'Insurance', label: 'Insurance' },
                                        { value: 'Contract', label: 'Contract' },
                                        { value: 'Certification', label: 'Certification' },
                                        { value: 'Other', label: 'Other' },
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date <span className="text-gray-400 font-normal">(Optional)</span></label>
                                <DatePicker
                                    value={formData.expiryDate}
                                    onChange={(date) => setFormData(prev => ({ ...prev, expiryDate: date }))}
                                    placeholder="Select date"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={!file || !formData.title || loading}>
                            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : 'Upload Document'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
