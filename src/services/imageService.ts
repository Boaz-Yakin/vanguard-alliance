import imageCompression from "browser-image-compression";

/**
 * Vanguard Alliance: Strategic Asset Optimizer (Image Service)
 * 
 * "Resources are the lifeblood of the alliance. We do not waste a single byte." 
 * - Strategist Jegal
 */

export interface OptimizationOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  fileType?: string;
}

const DEFAULT_OPTIONS: OptimizationOptions = {
  maxSizeMB: 0.5, // 500KB limit for standard product images
  maxWidthOrHeight: 1200,
  useWebWorker: true,
  fileType: "image/webp", // Forced WebP for maximum compression
};

export const ImageService = {
  /**
   * Strategically compresses and converts an image before upload to Supabase.
   * @param file The original File object from <input type="file">
   * @returns A compressed Blob/File ready for storage
   */
  async optimizeForUpload(file: File, options: Partial<OptimizationOptions> = {}): Promise<File> {
    const combinedOptions = { ...DEFAULT_OPTIONS, ...options };

    try {
      console.log(`[VANGUARD] Commencing strategic optimization: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      
      const compressedFile = await imageCompression(file, combinedOptions as any);
      
      console.log(`[VANGUARD] Optimization complete: ${compressedFile.name} (${(compressedFile.size / 1024 / 1024).toFixed(2)} MB)`);
      
      // Ensure the name extension matches webp if we forced it
      const finalName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
      return new File([compressedFile], finalName, { type: "image/webp" });
      
    } catch (error) {
      console.error("[VANGUARD] Resource optimization failed. Retaining original asset as fallback.", error);
      return file;
    }
  },

  /**
   * Generates a unique, strategic filename to prevent collisions in Supabase Storage.
   */
  generateStrategicFileName(originalName: string, prefix: string = "prod"): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const cleanName = originalName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `${prefix}_${timestamp}_${random}_${cleanName}.webp`;
  }
};
