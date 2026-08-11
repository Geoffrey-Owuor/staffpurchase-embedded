"use client";
import { basePath } from "@/public/assets";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { useState } from "react";

const ImportExcelData = ({ exportAll = false, fromDate, toDate }) => {
  const [isExporting, setIsExporting] = useState(false);

  //A new export handler function
  const handleExport = async () => {
    setIsExporting(true);

    try {
      let apiurl = `${basePath}/api/exportpurchases`;
      if (exportAll) {
        apiurl += `?exportAll=true`;
      } else {
        apiurl += `?exportAll=false`;
      }
      if (fromDate && toDate) {
        apiurl += `&fromDate=${fromDate}&toDate=${toDate}`;
      }
      const response = await fetch(apiurl);
      if (!response.ok) {
        throw new Error("Failed to download the file.");
      }

      // Convert the response to a blob (a file-like object)
      const blob = await response.blob();

      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);

      // Create a temporary link element to trigger the download
      const a = document.createElement("a");
      a.href = url;
      a.download = "purchase_data.xlsx"; // The filename for the downloaded file
      document.body.appendChild(a); // Append the link to the body
      a.click(); // Programmatically click the link to start the download
      a.remove(); // Remove the link from the body
      window.URL.revokeObjectURL(url); // Clean up the temporary URL
    } catch (error) {
      console.error("Export error:", error);
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <button
      onClick={handleExport}
      disabled={isExporting || !fromDate || !toDate}
      className="group relative z-80 flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-400 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800 dark:disabled:text-gray-500"
    >
      {isExporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Exporting</span>
        </>
      ) : (
        <>
          <FileSpreadsheet className="h-4 w-4" />
          <span>Export</span>
          {(!fromDate || !toDate) && (
            <div className="pointer-events-none absolute top-full left-1/2 mt-2 w-56 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-center text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900">
              To export your data, first select a date range and apply your
              filters, then click the export button.
            </div>
          )}
        </>
      )}
    </button>
  );
};

export default ImportExcelData;
