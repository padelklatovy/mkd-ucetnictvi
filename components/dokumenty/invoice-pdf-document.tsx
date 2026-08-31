import { Document, Page, Text, View, Image, StyleSheet, Font } from "@react-pdf/renderer";
import path from "path";
import type { Tables } from "@/lib/types/database.types";
import { calcLineTotal, type InvoiceLineItem } from "@/lib/utils/invoice";

// Vychozi font (Helvetica) v react-pdf neumi ceskou diakritiku (ř, č, š, ě, ů...) ani
// znak "Kč" - proto registrujeme vlastni font s plnou podporou. Soubory jsou primo
// v repozitari (lib/fonts), zadna zavislost na sitovem pripojeni pri renderovani.
Font.register({
  family: "Roboto",
  fonts: [
    { src: path.join(process.cwd(), "lib/fonts/Roboto-Regular.ttf"), fontWeight: 400 },
    { src: path.join(process.cwd(), "lib/fonts/Roboto-Bold.ttf"), fontWeight: 700 },
    { src: path.join(process.cwd(), "lib/fonts/Roboto-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
  ],
});

function formatMoney(n: number) {
  return (
    new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) +
    " Kč"
  );
}
function formatDateCz(iso: string | null) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}`;
}

const GREEN = "#1e3a5f";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, fontFamily: "Roboto", color: "#1e293b" },
  row: { flexDirection: "row", justifyContent: "space-between" },
  headerTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18, alignItems: "flex-start" },
  title: { fontSize: 20, fontWeight: 700, color: GREEN, marginBottom: 2 },
  statusText: { fontSize: 10, color: "#475569" },
  qrImg: { width: 90, height: 90 },
  qrCaption: { fontSize: 7, color: "#94a3b8", textAlign: "center", marginTop: 2 },
  partiesRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  partyBlock: { width: "47%" },
  partyLabel: { fontSize: 7, fontWeight: 700, color: "#64748b", marginBottom: 3, textTransform: "uppercase" },
  partyName: { fontSize: 10, fontWeight: 700, marginBottom: 1 },
  partyLine: { fontSize: 9, color: "#475569" },
  metaRow: {
    flexDirection: "row",
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: "#e2e8f0",
    paddingVertical: 8,
    marginBottom: 14,
  },
  metaCol: { flex: 1 },
  metaLabel: { fontSize: 7, color: "#64748b", marginBottom: 1 },
  metaValue: { fontSize: 9 },
  table: { marginBottom: 12 },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#cbd5e1", paddingBottom: 4, marginBottom: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#f1f5f9", paddingVertical: 4 },
  th: { fontSize: 7, color: "#64748b", fontWeight: 700 },
  colNum: { width: "4%" },
  colDesc: { width: "30%" },
  colQty: { width: "9%", textAlign: "right" },
  colPrice: { width: "12%", textAlign: "right" },
  colBase: { width: "12%", textAlign: "right" },
  colVatPct: { width: "7%", textAlign: "right" },
  colVat: { width: "12%", textAlign: "right" },
  colTotal: { width: "14%", textAlign: "right", fontWeight: 700 },
  itemTitle: { fontSize: 9 },
  itemSubtitle: { fontSize: 7.5, color: "#64748b", fontStyle: "italic" },
  recapWrap: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 14 },
  recapBox: { width: 200 },
  recapLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1.5 },
  recapTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderColor: "#cbd5e1",
    marginTop: 3,
    paddingTop: 4,
    fontWeight: 700,
    fontSize: 11,
    color: GREEN,
  },
  note: { fontSize: 8, color: "#64748b", marginBottom: 10 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 0.5,
    borderColor: "#e2e8f0",
    paddingTop: 6,
    fontSize: 7,
    color: "#94a3b8",
    textAlign: "center",
  },
});

export function InvoicePdfDocument({
  document,
  items,
  company,
  qrDataUrl,
  placeOfIssue,
  paymentMethodLabel,
}: {
  document: Tables<"documents">;
  items: InvoiceLineItem[];
  company: Tables<"companies">;
  qrDataUrl: string | null;
  placeOfIssue: string | null;
  paymentMethodLabel: string | null;
}) {
  const byRate: Record<string, { base: number; vat: number }> = {};
  items.forEach((it) => {
    const { base, vat } = calcLineTotal(it);
    const key = String(it.vatRatePercent);
    if (!byRate[key]) byRate[key] = { base: 0, vat: 0 };
    byRate[key].base += base;
    byRate[key].vat += vat;
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Faktura {document.document_number}</Text>
            <Text style={styles.statusText}>
              {document.status === "zaplaceny" ? "UHRAZENO" : "NEUHRAZENO"}
            </Text>
          </View>
          {qrDataUrl ? (
            <View>
              {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image, not HTML img */}
              <Image src={qrDataUrl} style={styles.qrImg} />
              <Text style={styles.qrCaption}>Zaplatit QR kódem</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.partiesRow}>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Dodavatel</Text>
            <Text style={styles.partyName}>{company.name}</Text>
            <Text style={styles.partyLine}>{company.address}</Text>
            <Text style={styles.partyLine}>
              IČO {company.ico}
              {company.dic ? ` · DIČ ${company.dic}` : ""}
            </Text>
            {company.phone ? <Text style={styles.partyLine}>Tel: {company.phone}</Text> : null}
            {document.payment_bank_account ? (
              <Text style={styles.partyLine}>Účet: {document.payment_bank_account}</Text>
            ) : null}
          </View>
          <View style={styles.partyBlock}>
            <Text style={styles.partyLabel}>Odběratel</Text>
            <Text style={styles.partyName}>{document.customer_name ?? "—"}</Text>
            {document.customer_address ? (
              <Text style={styles.partyLine}>{document.customer_address}</Text>
            ) : null}
            {document.partner_ico ? (
              <Text style={styles.partyLine}>
                IČO {document.partner_ico}
                {document.partner_dic ? ` · DIČ ${document.partner_dic}` : ""}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.metaRow}>
          {placeOfIssue ? (
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Místo vystavení</Text>
              <Text style={styles.metaValue}>{placeOfIssue}</Text>
            </View>
          ) : null}
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Vystaveno</Text>
            <Text style={styles.metaValue}>{formatDateCz(document.issue_date)}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>DUZP</Text>
            <Text style={styles.metaValue}>{formatDateCz(document.taxable_supply_date)}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Splatnost</Text>
            <Text style={styles.metaValue}>{formatDateCz(document.due_date)}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Variabilní symbol</Text>
            <Text style={styles.metaValue}>{document.variable_symbol ?? "—"}</Text>
          </View>
          {paymentMethodLabel ? (
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Forma úhrady</Text>
              <Text style={styles.metaValue}>{paymentMethodLabel}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.th, styles.colNum]}>#</Text>
            <Text style={[styles.th, styles.colDesc]}>Popis</Text>
            <Text style={[styles.th, styles.colQty]}>Množ.</Text>
            <Text style={[styles.th, styles.colPrice]}>Cena/j.</Text>
            <Text style={[styles.th, styles.colBase]}>Základ</Text>
            <Text style={[styles.th, styles.colVatPct]}>DPH %</Text>
            <Text style={[styles.th, styles.colVat]}>DPH</Text>
            <Text style={[styles.th, styles.colTotal]}>Celkem</Text>
          </View>
          {items.map((it, idx) => {
            const t = calcLineTotal(it);
            const [titleLine, ...rest] = it.description.split("\n");
            const subtitle = rest.join(" ").trim();
            return (
              <View key={idx} style={styles.tableRow}>
                <Text style={[styles.itemTitle, styles.colNum]}>{idx + 1}</Text>
                <View style={styles.colDesc}>
                  <Text style={styles.itemTitle}>{titleLine || "—"}</Text>
                  {subtitle ? <Text style={styles.itemSubtitle}>{subtitle}</Text> : null}
                </View>
                <Text style={[styles.itemTitle, styles.colQty]}>{it.quantity}</Text>
                <Text style={[styles.itemTitle, styles.colPrice]}>{formatMoney(it.unitPrice)}</Text>
                <Text style={[styles.itemTitle, styles.colBase]}>{formatMoney(t.base)}</Text>
                <Text style={[styles.itemTitle, styles.colVatPct]}>{it.vatRatePercent}</Text>
                <Text style={[styles.itemTitle, styles.colVat]}>{formatMoney(t.vat)}</Text>
                <Text style={[styles.itemTitle, styles.colTotal]}>{formatMoney(t.total)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.recapWrap}>
          <View style={styles.recapBox}>
            <Text style={{ fontSize: 9, fontWeight: 700, marginBottom: 2 }}>Rekapitulace DPH</Text>
            {Object.entries(byRate).map(([rate, v]) => (
              <View key={rate} style={styles.recapLine}>
                <Text>DPH {rate} %</Text>
                <Text>
                  Zákl. {formatMoney(v.base)} · DPH {formatMoney(v.vat)}
                </Text>
              </View>
            ))}
            <View style={styles.recapLine}>
              <Text>Celkem bez DPH</Text>
              <Text>{formatMoney(Number(document.amount_excl_vat))}</Text>
            </View>
            <View style={styles.recapLine}>
              <Text>DPH</Text>
              <Text>{formatMoney(Number(document.vat_amount))}</Text>
            </View>
            <View style={styles.recapTotal}>
              <Text>Celkem s DPH</Text>
              <Text>{formatMoney(Number(document.amount_total))}</Text>
            </View>
          </View>
        </View>

        {document.note ? <Text style={styles.note}>{document.note}</Text> : null}

        <Text style={styles.footer}>
          {company.name} · IČO {company.ico}
          {company.dic ? ` · DIČ ${company.dic}` : ""}
        </Text>
      </Page>
    </Document>
  );
}
