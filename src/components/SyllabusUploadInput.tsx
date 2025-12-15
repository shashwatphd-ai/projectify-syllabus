import { Upload as UploadIcon, FileText, Loader2 } from "lucide-react"
import { Label } from "@/components/ui/label"

type SyllabusUploadInputProps = {
    processFile: (file: File) => void,
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
    uploading: boolean
    file: File | null
    storedFileName: string | null
    storedFileSize: number | null
    storagePath: string | null
}

export function SyllabusUploadInput({
    processFile,
    handleFileChange,
    uploading,
    file,
    storedFileName,
    storedFileSize,
    storagePath,
}: SyllabusUploadInputProps) {
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();

        const droppedFile = e.dataTransfer.files?.[0];
        if (droppedFile) {
            processFile(droppedFile);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    return (
        <div className="space-y-2">
            <Label>Syllabus PDF</Label>
            <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                />
                <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center gap-2"
                >
                    {uploading ? (
                        <>
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            <p className="font-medium">Uploading file...</p>
                        </>
                    ) : file || storagePath ? (
                        <>
                            <FileText className="h-12 w-12 text-primary" />
                            <p className="font-medium">{file?.name || storedFileName || 'File uploaded'}</p>
                            <p className="text-sm text-muted-foreground">
                                {((file?.size || storedFileSize || 0) / 1024 / 1024).toFixed(2)} MB
                            </p>
                        </>
                    ) : (
                        <>
                            <UploadIcon className="h-12 w-12 text-muted-foreground" />
                            <p className="font-medium">Click to upload or drag and drop</p>
                            <p className="text-sm text-muted-foreground">
                                PDF files only, max 10MB
                            </p>
                        </>
                    )}
                </label>
            </div>
        </div>)
}