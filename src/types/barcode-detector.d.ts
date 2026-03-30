type BarcodeDetectorFormat =
  | "aztec"
  | "code_128"
  | "code_39"
  | "code_93"
  | "codabar"
  | "data_matrix"
  | "ean_13"
  | "ean_8"
  | "itf"
  | "pdf417"
  | "qr_code"
  | "upc_a"
  | "upc_e";

type DetectedBarcode = {
  boundingBox?: DOMRectReadOnly;
  cornerPoints?: ReadonlyArray<{ x: number; y: number }>;
  format?: BarcodeDetectorFormat;
  rawValue?: string;
};

type BarcodeDetectorOptions = {
  formats?: BarcodeDetectorFormat[];
};

interface BarcodeDetector {
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new(options?: BarcodeDetectorOptions): BarcodeDetector;
  getSupportedFormats?: () => Promise<BarcodeDetectorFormat[]>;
}

interface Window {
  BarcodeDetector?: BarcodeDetectorConstructor;
}
