import haversineDistance from "haversine-distance";
import ExcelJS, { type Worksheet } from "exceljs";
import { Glob } from "bun";
import { compact, isEmpty, round, snakeCase } from "lodash";

interface Place {
  name: string;
  coordinate: {
    lat: number;
    lng: number;
  } | null;
}

interface InputExcel {
  fileName: string;
  listUMKM: Place[];
}

function extractLatLng(url: string): { lat: number; lng: number } | null {
  const regex = /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/;
  const match = String(url).match(regex);
  if (match) {
    return {
      lat: parseFloat(match[1]),
      lng: parseFloat(match[2]),
    };
  }
  return null;
}

async function getListKC() {
  const kcWB = new ExcelJS.Workbook();
  await kcWB.xlsx.readFile("./data/LIST_KC.xlsx");
  const kcWS = kcWB.getWorksheet(1);

  const LIST_KC: Place[] = [];

  kcWS?.eachRow((r, rNum) => {
    if (rNum != 1 && !isEmpty(r.getCell(1).value)) {
      const coordinate = (r.getCell(2).value as string).split(" ");
      LIST_KC.push({
        name: r.getCell(1).value as string,
        coordinate: {
          lat: Number.parseFloat(coordinate[0]),
          lng: Number.parseFloat(coordinate[1]),
        },
      });
    }
  });

  return LIST_KC;
}

async function getListUMKM() {
  const glob = new Glob("lokasi/*.xlsx");
  const LIST_EXCEL_DATA: InputExcel[] = [];

  for await (const file of glob.scan(".")) {
    const key = snakeCase(file.replace("lokasi/", ""));
    const kcWB = new ExcelJS.Workbook();
    await kcWB.xlsx.readFile(file);
    const kcWS = kcWB.getWorksheet(1);

    const LIST_PLACES: Place[] = [];

    kcWS?.eachRow((r, rNum) => {
      if (rNum != 1 && !isEmpty(r.getCell(1).value)) {
        const coordinate = extractLatLng(r.getCell(1).value as string);
        LIST_PLACES.push({
          name: r.getCell(2).value as string,
          coordinate,
        });
      }
    });

    LIST_EXCEL_DATA.push({
      fileName: key,
      listUMKM: LIST_PLACES,
    });
  }
  return LIST_EXCEL_DATA;
}

async function main() {
  const LIST_KC = await getListKC();
  const LIST_EXCEL_DATA = await getListUMKM();

  const LIST_EXCEL = LIST_EXCEL_DATA.map((excel) => {
    const LIST_UMKM = excel.listUMKM
      .filter((umkm) => !!umkm.coordinate)
      .map((umkm) => {
        return {
          name: umkm.name,
          listKCTerdekat: compact(
            LIST_KC.map((kc) => {
              const range = round(
                haversineDistance(kc.coordinate!, umkm.coordinate!) / 1000,
                2
              );
              if (range <= 10)
                return {
                  name: kc.name,
                  range,
                };
              return null;
            })
          ),
        };
      });

    return { listUMKM: LIST_UMKM, fileName: excel.fileName };
  });

  const wb = new ExcelJS.Workbook();
  for (const excel of LIST_EXCEL) {
    const ws = wb.addWorksheet(excel.fileName);
    ws.columns = [
      { header: "Nama UMKM", key: "col1" },
      { header: "Nama KC", key: "col2" },
      { header: "Jarak (KM)", key: "col3" },
    ];

    excel.listUMKM.forEach((o) => {
      o.listKCTerdekat.forEach((kc) => {
        ws.addRow([o.name, kc.name, kc.range]);
      });
    });
  }

  wb.xlsx.writeFile("./result/all.xlsx");
}

main().then();
