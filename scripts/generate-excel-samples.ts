import fs from "node:fs/promises";
import path from "node:path";

import {
  buildMasterWorkbook,
  buildSingleCheckInWorkbook,
} from "../lib/excel/check-in-workbooks";

async function main() {
  const outputDir = path.join(process.cwd(), "outputs", "hot-load-check-in");
  await fs.mkdir(outputDir, { recursive: true });

  const singleBuffer = await buildSingleCheckInWorkbook({
    fields: {
      date: "2026-04-22",
      ticketNumber: "9731",
      vendor: "Test Metal",
      material: "Steel",
      quantity: "28,000.50",
      truckNumber: "1286",
      arrivalTime: "13:15",
      departureTime: "15:45",
      comments: "Paperwork confirmed and scale note added for operator review.",
      vehicleNumber: "347",
      radTicket: "RAD-55",
      harscoEmployee: "Matt Jones",
    },
    submittedAt: "2026-04-22T18:30:00.000Z",
    reviewStatus: "reviewed",
    manuallyEditedFields: ["comments", "vehicleNumber"],
    exportGeneratedAt: "2026-04-22T18:45:00.000Z",
  });
  const singlePath = path.join(outputDir, "hot-load-check-in-single-truck-sample.xlsx");
  await fs.writeFile(singlePath, singleBuffer);

  const masterBuffer = await buildMasterWorkbook([
    {
      fields: {
        date: "2026-04-22",
        ticketNumber: "9731",
        vendor: "Test Metal",
        material: "Steel",
        quantity: "28000",
        truckNumber: "1286",
        arrivalTime: "13:50",
        departureTime: "15:29",
        comments: "Paperwork confirmed and scale note added for operator review.",
        vehicleNumber: "347",
        radTicket: "RAD-55",
        harscoEmployee: "Matt Jones",
      },
      submissionStatus: "succeeded",
      exportStatus: "succeeded",
      emailStatus: "succeeded",
      submittedAt: "2026-04-22T18:30:00.000Z",
    },
    {
      fields: {
        date: "2026-04-23",
        ticketNumber: "9732",
        vendor: "River Recycling",
        material: "Iron",
        quantity: "31500",
        truckNumber: "1290",
        arrivalTime: "09:15",
        departureTime: "11:45",
        comments: "Email retry required after initial SMTP failure.",
        vehicleNumber: "351",
        radTicket: "RAD-56",
        harscoEmployee: "Matt Jones",
      },
      submissionStatus: "failed",
      exportStatus: "succeeded",
      emailStatus: "failed",
      submittedAt: "2026-04-23T16:10:00.000Z",
    },
  ]);
  const masterPath = path.join(outputDir, "hot-load-check-in-master-sample.xlsx");
  await fs.writeFile(masterPath, masterBuffer);
  console.log(JSON.stringify({ singlePath, masterPath }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
