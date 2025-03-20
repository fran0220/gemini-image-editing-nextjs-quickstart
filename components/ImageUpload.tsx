"use client";

import { useCallback, useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "./ui/button";
import { Upload as UploadIcon, Image as ImageIcon, X } from "lucide-react";

interface ImageUploadProps {
  onImageSelect: (imageData: string[]) => void;
  currentImages: string[] | null;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  );
}

export function ImageUpload({ onImageSelect, currentImages }: ImageUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Update the selected files when the current images change
  useEffect(() => {
    if (!currentImages || currentImages.length === 0) {
      setSelectedFiles([]);
    }
  }, [currentImages]);

  // Function to process files and convert them to base64
  const processFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;

    // Store the new files
    setSelectedFiles(prev => [...prev, ...files]);

    // If we already have images, we need to append to them
    const existingImages = currentImages || [];
    const imageDataArray: string[] = [...existingImages];
    
    // Process each new file
    const processFile = (index: number) => {
      if (index >= files.length) {
        // All files processed, update the state
        console.log(`${files.length} images loaded`);
        onImageSelect(imageDataArray);
        return;
      }
      
      const file = files[index];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        if (event.target && event.target.result) {
          const result = event.target.result as string;
          imageDataArray.push(result);
          // Process next file
          processFile(index + 1);
        }
      };
      
      reader.onerror = (error) => {
        console.error("Error reading file:", error);
        // Continue with next file even if this one failed
        processFile(index + 1);
      };
      
      reader.readAsDataURL(file);
    };
    
    // Start processing files
    processFile(0);
  }, [onImageSelect, currentImages]);

  // React-dropzone onDrop handler
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      processFiles(acceptedFiles);
    },
    [processFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"]
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: true
  });

  const handleRemove = (index: number) => {
    if (currentImages) {
      const newImages = [...currentImages];
      newImages.splice(index, 1);
      
      // Update the selected files state to match
      const newFiles = [...selectedFiles];
      if (index < newFiles.length) {
        newFiles.splice(index, 1);
      }
      setSelectedFiles(newFiles);
      
      // Update the parent component
      onImageSelect(newImages);
    }
  };

  const handleRemoveAll = () => {
    setSelectedFiles([]);
    onImageSelect([]);
  };

  return (
    <div className="w-full">
      {!currentImages || currentImages.length === 0 ? (
        <div
          {...getRootProps()}
          className={`min-h-[150px] p-4 rounded-lg
          ${isDragActive ? "bg-secondary/50" : "bg-secondary"}
          transition-colors duration-200 ease-in-out hover:bg-secondary/50
          border-2 border-dashed border-secondary
          cursor-pointer flex items-center justify-center gap-4
        `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-row items-center">
            <UploadIcon className="w-8 h-8 text-primary mr-3 flex-shrink-0" />
            <div className="">
              <p className="text-sm font-medium text-foreground">
                将图片拖放到此处或点击浏览
              </p>
              <p className="text-xs text-muted-foreground">
                每张图片最大文件大小：10MB
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col p-4 rounded-lg bg-secondary">
          <div className="flex w-full items-center mb-4 justify-between">
            <div className="flex items-center">
              <ImageIcon className="w-8 h-8 text-primary mr-3 flex-shrink-0" />
              <div className="flex-grow min-w-0">
                <p className="text-sm font-medium text-foreground">
                  已选择 {currentImages.length} 张图片{currentImages.length > 1 ? '' : ''}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveAll}
              className="flex-shrink-0 ml-2"
            >
              <X className="w-4 h-4 mr-1" />
              移除全部
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {currentImages.map((image, index) => (
              <div key={index} className="relative overflow-hidden rounded-md border border-border">
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => handleRemove(index)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full z-10"
                >
                  <X className="w-3 h-3" />
                  <span className="sr-only">移除图片</span>
                </Button>
                <img
                  src={image}
                  alt={`Selected ${index + 1}`}
                  className="w-full h-40 object-cover"
                />
              </div>
            ))}
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                // Create a file input element and trigger it
                const fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.multiple = true;
                fileInput.accept = 'image/png,image/jpeg,image/jpg';
                fileInput.onchange = (event) => {
                  const target = event.target as HTMLInputElement;
                  if (target.files && target.files.length > 0) {
                    const fileArray = Array.from(target.files);
                    processFiles(fileArray);
                  }
                };
                fileInput.click();
              }}
              className="w-full"
            >
              <UploadIcon className="w-4 h-4 mr-2" />
              添加更多图片
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
