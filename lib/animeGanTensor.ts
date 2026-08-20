/**
 * Pure tensor conversion for the AnimeGANv2 generator. Kept DOM-free and
 * separate from the worker/session plumbing so the pixel math is unit-testable
 * — the same split that lets the rest of this repo verify logic without a camera.
 *
 * Model signature (verified empirically against the ONNX file):
 *   input  "generator_input:0"            float32 NHWC [1, H, W, 3], range [-1, 1]
 *   output "generator/G_MODEL/out_layer/Tanh:0" float32 NHWC [1, H, W, 3], range [-1, 1]
 * H and W are dynamic — the model accepts non-square, non-power-of-two sizes.
 */

/** RGBA bytes (canvas ImageData order) → NHWC float32 normalized to [-1, 1]. Alpha is dropped. */
export function rgbaToTensor(rgba: Uint8ClampedArray, width: number, height: number): Float32Array {
  const tensor = new Float32Array(width * height * 3);
  for (let px = 0, t = 0; px < rgba.length; px += 4, t += 3) {
    tensor[t] = rgba[px]! / 127.5 - 1;
    tensor[t + 1] = rgba[px + 1]! / 127.5 - 1;
    tensor[t + 2] = rgba[px + 2]! / 127.5 - 1;
  }
  return tensor;
}

/** NHWC float32 in [-1, 1] → RGBA bytes with opaque alpha. Values outside the range are clamped. */
export function tensorToRgba(tensor: Float32Array, width: number, height: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let t = 0, px = 0; t < tensor.length; t += 3, px += 4) {
    rgba[px] = toByte(tensor[t]!);
    rgba[px + 1] = toByte(tensor[t + 1]!);
    rgba[px + 2] = toByte(tensor[t + 2]!);
    rgba[px + 3] = 255;
  }
  return rgba;
}

function toByte(value: number): number {
  const scaled = (value + 1) * 127.5;
  return scaled < 0 ? 0 : scaled > 255 ? 255 : scaled;
}
