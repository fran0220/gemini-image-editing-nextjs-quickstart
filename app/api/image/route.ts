import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HistoryItem, HistoryPart } from "@/lib/types";

// Initialize the Google Gen AI client with your API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Define the model ID for Gemini 2.0 Flash experimental
const MODEL_ID = "gemini-2.0-flash-exp";

// Define interface for the formatted history item
interface FormattedHistoryItem {
  role: "user" | "model";
  parts: Array<{
    text?: string;
    inlineData?: { data: string; mimeType: string };
  }>;
}

export async function POST(req: NextRequest) {
  try {
    // Parse JSON request instead of FormData
    const requestData = await req.json();
    const { prompt, images: inputImages, history } = requestData;

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Get the model with the correct configuration
    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: {
        temperature: 1,
        topP: 0.95,
        topK: 40,
        // @ts-expect-error - Gemini API JS is missing this type
        responseModalities: ["Text", "Image"],
      },
    });

    let result;

    try {
      // Convert history to the format expected by Gemini API
      const formattedHistory =
        history && history.length > 0
          ? history
              .map((item: HistoryItem) => {
                return {
                  role: item.role,
                  parts: item.parts
                    .map((part: HistoryPart) => {
                      if (part.text) {
                        return { text: part.text };
                      }
                      if (part.image && item.role === "user") {
                        const imgParts = part.image.split(",");
                        if (imgParts.length > 1) {
                          return {
                            inlineData: {
                              data: imgParts[1],
                              mimeType: part.image.includes("image/png")
                                ? "image/png"
                                : "image/jpeg",
                            },
                          };
                        }
                      }
                      if (part.images && Array.isArray(part.images) && part.images.length > 0 && item.role === "user") {
                        // Handle multiple images in history
                        const imageParts = part.images.map(image => {
                          const imgParts = image.split(",");
                          if (imgParts.length > 1) {
                            return {
                              inlineData: {
                                data: imgParts[1],
                                mimeType: image.includes("image/png")
                                  ? "image/png"
                                  : "image/jpeg",
                              },
                            };
                          }
                          return null;
                        }).filter(p => p !== null);
                        
                        return imageParts;
                      }
                      return { text: "" };
                    })
                    .flat() // Flatten the array to handle multiple images
                    .filter((part) => Object.keys(part).length > 0) // Remove empty parts
                };
              })
              .filter((item: FormattedHistoryItem) => item.parts.length > 0) // Remove items with no parts
          : [];

      // Create a chat session with the formatted history
      const chat = model.startChat({
        history: formattedHistory,
      });

      // Prepare the current message parts
      const messageParts = [];

      // Add the images if provided
      if (inputImages && Array.isArray(inputImages) && inputImages.length > 0) {
        console.log(`Processing ${inputImages.length} images for Gemini API`);

        // Add all images first according to Gemini API format
        inputImages.forEach(inputImage => {
          // Check if the image is a valid data URL
          if (!inputImage.startsWith("data:")) {
            throw new Error("Invalid image data URL format");
          }

          const imgParts = inputImage.split(",");
          if (imgParts.length > 1) {
            messageParts.push({
              inlineData: {
                data: imgParts[1],
                mimeType: inputImage.includes("image/png")
                  ? "image/png"
                  : "image/jpeg",
              },
            });
          }
        });
      }
      
      // Add the text prompt after all images
      messageParts.push({ text: prompt });

      // Send the message to the chat
      console.log("Sending message with", messageParts.length, "parts");
      try {
        result = await chat.sendMessage(messageParts);
      } catch (error) {
        console.error("Error in chat.sendMessage:", error);
        // Check if it's a specific Gemini API error
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("500 Internal Server Error") || 
            errorMessage.includes("An internal error has occurred")) {
          throw new Error(
            "Gemini API returned an internal server error. This may happen when processing multiple images. " +
            "Try with fewer images or a simpler prompt. Original error: " + errorMessage
          );
        }
        throw error;
      }
    } catch (error) {
      console.error("Error generating image:", error);
      return NextResponse.json(
        {
          error: "Failed to generate image",
          details: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }

    const response = result.response;

    let textResponse = null;
    let imageData = null;
    let mimeType = "image/png";

    // Process the response
    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content.parts;
      console.log("Number of parts in response:", parts.length);

      for (const part of parts) {
        if ("inlineData" in part && part.inlineData) {
          // Get the image data
          imageData = part.inlineData.data;
          mimeType = part.inlineData.mimeType || "image/png";
          console.log(
            "Image data received, length:",
            imageData.length,
            "MIME type:",
            mimeType
          );
        } else if ("text" in part && part.text) {
          // Store the text
          textResponse = part.text;
          console.log(
            "Text response received:",
            textResponse.substring(0, 50) + "..."
          );
        }
      }
    }

    // Return just the base64 image and description as JSON
    return NextResponse.json({
      image: imageData ? `data:${mimeType};base64,${imageData}` : null,
      description: textResponse,
    });
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      {
        error: "Failed to generate image",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
