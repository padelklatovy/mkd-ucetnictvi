import { BulkImportUploader } from "@/components/dokumenty/bulk-import-uploader";

export default function HromadneNahraniPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold text-slate-900 mb-1">Hromadné nahrání dokladů</h1>
      <p className="text-sm text-slate-500 mb-6">
        Vyberte balík vyfocených účtenek nebo PDF – appka pro každý soubor založí doklad, vytěží
        z něj údaje přes AI a rovnou je uloží. Nic ručně nevyplňujete, jen pak proletíte seznam a
        zkontrolujete doklady označené &bdquo;ke kontrole&ldquo; nebo &bdquo;chybí doklad&ldquo;.
      </p>
      <BulkImportUploader direction="prijaty" />
    </div>
  );
}
