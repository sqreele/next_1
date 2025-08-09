"use client";

import React, { useState, useCallback, useEffect, ChangeEventHandler } from "react";
import Image from "next/image";
import { Upload, X, AlertCircle } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import { Alert, AlertDescription } from "@/app/components/ui/alert";
import { cn } from "@/app/lib/utils";

export interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // Max size in MB
  error?: string | undefined;
  touched?: boolean | undefined;
  disabled?: boolean;
  accept?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  maxFiles = 5,
  maxSize = 5,
  error,
  touched,
  disabled = false,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [fileProgress, setFileProgress] = useState<{ [key: string]: number }>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateFiles = useCallback(
    (files: File[]): string | null => {
      if (files.length + selectedFiles.length > maxFiles) {
        return `Maximum ${maxFiles} files allowed`;
      }
      // Validate type
      const invalidTypes = files.filter((file) => !file.type.startsWith("image/"));
      if (invalidTypes.length > 0) {
        return `Only image files are allowed (${invalidTypes.map(f => f.name).join(', ')})`;
      }
      // Validate size
      const oversizedFiles = files.filter((file) => file.size > maxSize * 1024 * 1024);
      if (oversizedFiles.length > 0) {
        return `File(s) too large: ${oversizedFiles.map(f => f.name).join(', ')} (Max ${maxSize}MB)`;
      }
      return null;
    },
    [maxFiles, maxSize, selectedFiles.length]
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      if (disabled) return;
      const currentError = validateFiles(files);
      setValidationError(currentError);

      if (!currentError) {
        const newFiles = [...selectedFiles, ...files].slice(0, maxFiles);
        setSelectedFiles(newFiles);
        onFileSelect(newFiles);

        // Simulate progress
        const newProgress = { ...fileProgress };
        files.forEach((file) => {
          newProgress[file.name] = 0;
        });
        setFileProgress(newProgress);

        // Simulate upload progress
        files.forEach((file) => {
          let progress = 0;
          const interval = setInterval(() => {
            progress += 10;
            setFileProgress((prev) => ({
              ...prev,
              [file.name]: progress,
            }));
            if (progress >= 100) {
              clearInterval(interval);
            }
          }, 200);
        });
      }
    },
    [disabled, validateFiles, selectedFiles, maxFiles, onFileSelect, fileProgress]
  );

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const files = Array.from(e.target.files || []);
      handleFiles(files);
      e.target.value = ""; // Reset input
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (index: number) => {
      if (disabled) return;
      setSelectedFiles((prev) => {
        const newFiles = prev.filter((_, i) => i !== index);
        onFileSelect(newFiles);
        return newFiles;
      });
      setValidationError(null);
    },
    [onFileSelect, disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    },
    [handleFiles]
  );

  const getFilePreview = useCallback(
    (file: File) => {
      return URL.createObjectURL(file);
    },
    []
  );

  useEffect(() => {
    // Cleanup object URLs to prevent memory leaks
    return () => {
      selectedFiles.forEach((file) => {
        URL.revokeObjectURL(getFilePreview(file));
      });
    };
  }, [selectedFiles, getFilePreview]);

  return (
    <div className="space-y-4">
      {/* Display External (Formik) Error OR Internal Validation Error */}
      {(touched && error) || validationError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || validationError}</AlertDescription>
        </Alert>
      ) : null}

      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center",
          isDragging ? "border-primary bg-primary/10" : "border-muted",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <label
          className={cn(
            "flex flex-col items-center gap-2",
            disabled ? "pointer-events-none" : ""
          )}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Drag and drop images or click to upload
          </p>
          <p className="text-xs text-muted-foreground">
            (Max {maxFiles} files, {maxSize}MB each)
          </p>
          <input
            type="file"
            className="hidden"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            disabled={disabled}
          />
        </label>
      </div>

      {/* File Previews */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          {selectedFiles.map((file, index) => (
            <div
              key={`${file.name}-${index}-${file.lastModified}`}
              className="relative flex items-center gap-3 p-3 border rounded-lg group bg-background"
            >
              {/* Image Preview */}
              <div className="relative w-16 h-16 flex-shrink-0">
                <Image
                  src={getFilePreview(file)}
                  alt={`Preview ${index}`}
                  fill
                  className="object-cover rounded"
                  sizes="64px"
                />
              </div>
              {/* File Info & Progress */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / (1024 * 1024)).toFixed(2)}MB
                </p>
                <Progress
                  value={fileProgress[file.name] || (file ? 100 : 0)}
                  className="h-1 mt-1"
                />
              </div>
              {/* Remove Button */}
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={() => removeFile(index)}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;