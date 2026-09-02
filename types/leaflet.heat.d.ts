import type * as L from "leaflet";

declare module "leaflet" {
  /** provided by the leaflet.heat plugin (side-effect import) */
  function heatLayer(
    latlngs: Array<[number, number, number?]>,
    options?: {
      minOpacity?: number;
      maxZoom?: number;
      max?: number;
      radius?: number;
      blur?: number;
      gradient?: Record<number, string>;
    }
  ): L.Layer;
}

declare module "leaflet.heat";
