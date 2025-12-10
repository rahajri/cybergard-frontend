'use client';

import ImportCSVWorkflow from '@/app/import-csv/components/ImportCSVWorkflow';

// Import CSS dédié pour cette page
import "@/app/styles/import-referentiels.css";

export default function ImportReferentielsPage() {
  return (
    <div className="import-page">
      <ImportCSVWorkflow />
    </div>
  );
}