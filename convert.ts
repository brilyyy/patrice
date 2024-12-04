import listTokoObatDiTangerang from "./data/listTokoObatDiTangerang.json";
import * as fs from "fs";

function extractLatLng(url: string): { lat: number; lng: number } | null {
  const regex = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/; // Matches !3d[latitude]!4d[longitude]
  const match = url.match(regex);
  if (match) {
    return {
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2]),
    };
  }
  return null; // Return null if no match is found
}
function find() {
  const data = listTokoObatDiTangerang.map((o) => {
    return {
      name: o.qBF1Pd,
      coordinate: extractLatLng(o.hfpxzchref),
    };
  });

  fs.writeFileSync(
    "./data/listTokoObatDiTangerang-conv.json",
    JSON.stringify(data)
  );
}

find();
