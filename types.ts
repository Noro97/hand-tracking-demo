/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface Point {
  x: number;
  y: number;
}

declare global {
  interface Window {
    Hands: any;
    Camera: any;
    drawConnectors: any;
    drawLandmarks: any;
    HAND_CONNECTIONS: any;
  }
}
