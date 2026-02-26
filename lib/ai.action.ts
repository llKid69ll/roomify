import puter from "@heyputer/puter.js";
import {ROOMIFY_RENDER_PROMPT} from "./constants";

export const fetchAsDataUrl = async (url: string): Promise<string> => {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const blob = await response.blob();

    // Infer MIME type from URL extension if blob.type is empty
    let mimeType = blob.type;

    if (!mimeType || mimeType === "application/octet-stream") {
        if (url.endsWith(".png")) mimeType = "image/png";
        else if (url.endsWith(".webp")) mimeType = "image/webp";
        else mimeType = "image/jpeg"; // fallback default
    }

    const arrayBuffer = await blob.arrayBuffer();
    const base64 = btoa(
        new Uint8Array(arrayBuffer)
            .reduce((data, byte) => data + String.fromCharCode(byte), "")
    );

    return `data:${mimeType};base64,${base64}`;
};

export const generate3DView = async ({ sourceImage }: Generate3DViewParams) => {
    let dataUrl = sourceImage;

// If it's a hosted URL, convert it to base64
    if (!sourceImage.startsWith("data:")) {
        dataUrl = await fetchAsDataUrl(sourceImage);
    }

    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    const mimeType = match ? match[1] : null;
    const base64Data = dataUrl.split(",")[1];

    if (!mimeType || !base64Data) {
        console.error("Bad Data URL:", dataUrl.slice(0, 60));
        throw new Error("Invalid source image payload");
    }

    const response = await puter.ai.txt2img(ROOMIFY_RENDER_PROMPT, {
        provider: "gemini",
        model: "gemini-2.5-flash-image-preview",
        input_image: base64Data,
        input_image_mime_type: mimeType,
        ratio: { w: 1024, h: 1024 },
    });

    const rawImageUrl = (response as HTMLImageElement).src ?? null;

    if (!rawImageUrl) return { renderedImage: null, renderedPath: undefined };

    const renderedImage = rawImageUrl.startsWith('data:')
        ? rawImageUrl : await fetchAsDataUrl(rawImageUrl);

    return { renderedImage, renderedPath: undefined };
}