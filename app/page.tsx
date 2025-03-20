"use client";
import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { ImagePromptInput } from "@/components/ImagePromptInput";
import { ImageResultDisplay } from "@/components/ImageResultDisplay";
import { ImageIcon, Wand2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HistoryItem } from "@/lib/types";

export default function Home() {
  const [images, setImages] = useState<string[] | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const handleImageSelect = (imageData: string[]) => {
    setImages(imageData.length > 0 ? imageData : null);
    // 清除生成的图像，当新图像上传时
    setGeneratedImage(null);
  };

  const handlePromptSubmit = async (prompt: string) => {
    try {
      setLoading(true);
      setError(null);

      // 如果我们有一个生成的图像，使用它进行编辑，否则使用上传的图像
      const imagesToEdit = generatedImage 
        ? [generatedImage]  // 使用生成的图像进行编辑
        : images;           // 使用上传的图像进行初始生成

      // 准备请求数据作为 JSON
      const requestData = {
        prompt,
        images: imagesToEdit,
        history: history.length > 0 ? history : undefined,
      };

      const response = await fetch("/api/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "图像生成失败");
      }

      const data = await response.json();

      if (data.image) {
        // 更新生成的图像和描述
        setGeneratedImage(data.image);
        setDescription(data.description || null);

        // 更新历史记录 - 添加用户消息
        const userMessage: HistoryItem = {
          role: "user",
          parts: [
            { text: prompt },
            ...(imagesToEdit && imagesToEdit.length > 0 ? [{ images: imagesToEdit }] : []),
          ],
        };

        // 添加 AI 响应
        const aiResponse: HistoryItem = {
          role: "model",
          parts: [
            ...(data.description ? [{ text: data.description }] : []),
            ...(data.image ? [{ image: data.image }] : []),
          ],
        };

        // 更新历史记录，包含两条消息
        setHistory((prevHistory) => [...prevHistory, userMessage, aiResponse]);
      } else {
        setError("API 未返回图像");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "发生错误");
      console.error("请求处理错误:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setImages(null);
    setGeneratedImage(null);
    setDescription(null);
    setLoading(false);
    setError(null);
    setHistory([]);
  };

  // 确定是否处于编辑模式
  const isEditing = !!generatedImage;

  // 获取要在上传组件中显示的图像
  const currentImages = isEditing ? null : images;

  // 获取要显示的最新图像（始终是生成的图像）
  const displayImage = generatedImage;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-8">
      <Card className="w-full max-w-4xl border-0 bg-card shadow-none">
        <CardHeader className="flex flex-col items-center justify-center space-y-2">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Wand2 className="w-8 h-8 text-primary" />
            图像创建与编辑
          </CardTitle>
          <span className="text-sm font-mono text-muted-foreground">
            你可以上传图片进行编辑，也可以输入文字直接生成😊
          </span>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 w-full">
          {error && (
            <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg">
              {error}
            </div>
          )}

          {!displayImage && !loading ? (
            <>
              <ImageUpload
                onImageSelect={handleImageSelect}
                currentImages={currentImages}
              />
              <ImagePromptInput
                onSubmit={handlePromptSubmit}
                isEditing={isEditing}
                isLoading={loading}
              />
            </>
          ) : loading ? (
            <div
              role="status"
              className="flex items-center mx-auto justify-center h-56 max-w-sm bg-gray-300 rounded-lg animate-pulse dark:bg-secondary"
            >
              <ImageIcon className="w-10 h-10 text-gray-200 dark:text-muted-foreground" />
              <span className="pl-4 font-mono font-xs text-muted-foreground">
                处理中...
              </span>
            </div>
          ) : (
            <>
              <ImageResultDisplay
                imageUrl={displayImage || ""}
                description={description}
                onReset={handleReset}
                conversationHistory={history}
              />
              <ImagePromptInput
                onSubmit={handlePromptSubmit}
                isEditing={true}
                isLoading={loading}
              />
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
