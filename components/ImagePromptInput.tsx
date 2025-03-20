"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { Input } from "./ui/input";

interface ImagePromptInputProps {
  onSubmit: (prompt: string) => void;
  isEditing: boolean;
  isLoading: boolean;
}

export function ImagePromptInput({
  onSubmit,
  isEditing,
  isLoading,
}: ImagePromptInputProps) {
  const [prompt, setPrompt] = useState("");

  const handleSubmit = () => {
    if (prompt.trim()) {
      onSubmit(prompt.trim());
      setPrompt("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg">
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">
          {isEditing
            ? "描述您想如何编辑图像"
            : "描述您想要生成的图像"}
        </p>
      </div>

      <Input
        id="prompt"
        className="border-secondary resize-none"
        placeholder={
          isEditing
            ? "示例：将背景改为蓝色，添加一道彩虹..."
            : "示例：一个3D渲染的猪，带着翅膀和礼帽，飞越未来主义城市..."
        }
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <Button
        type="submit"
        disabled={!prompt.trim() || isLoading}
        className="w-full bg-primary hover:bg-primary/90"
      >
        <Wand2 className="w-4 h-4 mr-2" />
        {isEditing ? "编辑图像" : "生成图像"}
      </Button>
    </form>
  );
}
