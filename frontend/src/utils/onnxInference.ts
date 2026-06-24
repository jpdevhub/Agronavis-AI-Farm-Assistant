import {
  formatClassName,
  extractCropType,
  getSymptoms,
  getTreatments,
  CLASS_NAMES
} from './diseaseData';

export interface LocalDiagnosisResult {
  predicted_disease_name: string;
  confidence_score: number;
  is_healthy: boolean;
  crop_type?: string;
  symptoms: string[];
  recommended_action: string[];
}

let session: any = null;
let sessionPromise: Promise<any> | null = null;

/**
 * Lazy loads and returns the ONNX runtime session.
 * Configures the WebAssembly binary runtime paths to point locally to /wasm/
 * to ensure that the app can run fully offline inside the service worker cache.
 * Uses a cached promise to prevent race conditions during concurrent startup calls.
 */
async function getInferenceSession(): Promise<any> {
  if (session) {
    return session;
  }
  if (sessionPromise) {
    return sessionPromise;
  }

  if (typeof window === 'undefined') {
    throw new Error('ONNX Runtime Web is only supported in browser environments.');
  }

  sessionPromise = (async () => {
    try {
      const ort = await import('onnxruntime-web');
      
      // Crucial: Set WASM path locally for PWA offline support
      ort.env.wasm.wasmPaths = '/wasm/';
      
      // Load model from public folder
      const activeSession = await ort.InferenceSession.create('/model/plant_disease_resnet18.onnx', {
        executionProviders: ['wasm']
      });
      session = activeSession;
      console.log('[LocalInference] ONNX Inference Session loaded successfully.');
      return session;
    } catch (error) {
      sessionPromise = null; // Clear cached promise on failure to allow retry
      console.error('[LocalInference] Failed to load ONNX session:', error);
      throw new Error('Could not initialize the local disease scanner model.');
    }
  })();

  return sessionPromise;
}

/**
 * Converts a browser File object to an HTMLImageElement
 */
function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resizes the input image element to 224x224 using an offscreen canvas
 */
function resizeImageToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 224;
  canvas.height = 224;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D canvas context for resizing');
  }

  // Draw image scaled to 224x224
  ctx.drawImage(img, 0, 0, 224, 224);
  return canvas;
}

/**
 * Extracts raw RGBA pixels from canvas, normalizes using ImageNet stats,
 * and converts to a planar CHW Float32Array format expected by the model.
 */
function preprocessCanvasToFlatArray(canvas: HTMLCanvasElement): Float32Array {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D canvas context for pixel extraction');
  }

  const imgData = ctx.getImageData(0, 0, 224, 224);
  const data = imgData.data; // Uint8ClampedArray: R,G,B,A,R,G,B,A...

  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];
  
  // Allocate space for 3 channels * 224 width * 224 height
  const floatArray = new Float32Array(3 * 224 * 224);

  // Convert interleaved RGBA to planar RGB and normalize
  for (let i = 0; i < 224 * 224; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];

    // Compute standard ImageNet normalization: (x / 255.0 - mean) / std
    floatArray[i] = (r / 255.0 - mean[0]) / std[0]; // Red plane
    floatArray[224 * 224 + i] = (g / 255.0 - mean[1]) / std[1]; // Green plane
    floatArray[2 * 224 * 224 + i] = (b / 255.0 - mean[2]) / std[2]; // Blue plane
  }

  return floatArray;
}

/**
 * Performs client-side machine learning inference on an uploaded plant image file.
 * Returns a standardized DiagnosisResult locally with zero network requests.
 */
export async function runLocalONNXInference(file: File): Promise<LocalDiagnosisResult> {
  try {
    const ort = await import('onnxruntime-web');
    const activeSession = await getInferenceSession();

    // 1. Process image file
    const img = await fileToImage(file);
    const canvas = resizeImageToCanvas(img);
    const floatArray = preprocessCanvasToFlatArray(canvas);

    // 2. Create multi-dimensional ONNX tensor [1, 3, 224, 224]
    const inputTensor = new ort.Tensor('float32', floatArray, [1, 3, 224, 224]);

    // 3. Execute inference using WASM execution provider with dynamic input/output names
    const inputName = activeSession.inputNames[0] || 'input';
    const outputName = activeSession.outputNames[0] || 'output';

    const feeds = { [inputName]: inputTensor };
    const results = await activeSession.run(feeds);

    // 4. Retrieve logits output tensor dynamically
    const outputTensor = results[outputName];
    if (!outputTensor || !outputTensor.data) {
      throw new Error('Model inference returned an empty output tensor.');
    }
    const output = outputTensor.data as Float32Array;

    // Assert that logits output size matches the local CLASS_NAMES database size
    if (output.length !== CLASS_NAMES.length) {
      throw new Error(
        `ONNX model output shape mismatch: got logits length of ${output.length}, ` +
        `but expected ${CLASS_NAMES.length} classes based on local database.`
      );
    }

    // 5. Postprocess: Argmax + numerically stable Softmax
    let maxLogit = -Infinity;
    let maxIdx = 0;

    for (let i = 0; i < output.length; i++) {
      if (output[i] > maxLogit) {
        maxLogit = output[i];
        maxIdx = i;
      }
    }

    let sumExp = 0.0;
    const exps = new Float32Array(output.length);
    for (let i = 0; i < output.length; i++) {
      exps[i] = Math.exp(output[i] - maxLogit);
      sumExp += exps[i];
    }

    const confidence = (exps[maxIdx] / sumExp) * 100.0;

    // 6. Map predictions to local classes
    const className = CLASS_NAMES[maxIdx];
    if (!className) {
      throw new Error(`Inference returned class index ${maxIdx} which is out of bounds.`);
    }

    const isHealthy = className.startsWith('healthy_');

    return {
      predicted_disease_name: formatClassName(className),
      confidence_score: parseFloat(confidence.toFixed(2)),
      is_healthy: isHealthy,
      crop_type: extractCropType(className),
      symptoms: getSymptoms(className),
      recommended_action: getTreatments(className)
    };
  } catch (error) {
    console.error('[LocalInference] Error during on-device inference:', error);
    throw error;
  }
}
