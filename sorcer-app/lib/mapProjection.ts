import { geoAlbersUsa } from "d3-geo";

export const MAP_W = 960;
export const MAP_H = 600;

export function createMapProjection() {
  return geoAlbersUsa()
    .scale(1070)
    .translate([MAP_W / 2, MAP_H / 2 - 25]);
}
