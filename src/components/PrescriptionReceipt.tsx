import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatPrescriptionCode, formatUzDate } from "@/lib/prescription-timer";

export type ReceiptData = {
  code: string;
  medicineName: string;
  xpn?: string | null | undefined;
  dosage?: string | null | undefined;
  quantity?: number | null | undefined;
  patientName?: string | null | undefined;
  smsCode?: string | null | undefined;
  issuedAt: Date;
  expiresAt: Date;
};

/** Printable e-prescription slip (QR + 12-digit code) for patients without a smartphone. Browser print also saves as PDF. */
export function PrescriptionReceiptButton({ data, className }: { data: ReceiptData; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="xl" variant="bold" className={className} onClick={() => setOpen(true)}>
        <Printer /> Retseptni Yuklab Olish (PDF/Chop etish)
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl">Retseptni chop etish</DialogTitle>
            <DialogDescription className="text-lg">
              «Chop etish» tugmasini bosing. PDF sifatida saqlash uchun printer o'rniga «PDF sifatida saqlash»ni tanlang.
            </DialogDescription>
          </DialogHeader>
          <div className="print-area rounded-2xl border-2 border-foreground bg-card p-6 text-card-foreground">
            <div className="flex items-start justify-between gap-4 border-b-2 border-dashed pb-4">
              <div>
                <p className="font-display text-2xl font-bold">Shifo · Elektron retsept</p>
                <p className="text-base text-muted-foreground">Davlat tibbiy sug'urta jamg'armasi (DTSJ)</p>
              </div>
              <QRCodeSVG value={data.code} size={112} level="M" aria-label="Retsept QR kodi" />
            </div>
            <dl className="mt-4 space-y-2 text-lg">
              <Row label="Retsept raqami"><span className="font-mono text-2xl font-extrabold tracking-widest">{formatPrescriptionCode(data.code)}</span></Row>
              {data.patientName && <Row label="Bemor">{data.patientName}</Row>}
              <Row label="Dori">{data.medicineName}{data.xpn ? ` (XPN: ${data.xpn})` : ""}</Row>
              {(data.quantity || data.dosage) && <Row label="Miqdori">{[data.quantity ? `${data.quantity} qadoq` : null, data.dosage].filter(Boolean).join(" · ")}</Row>}
              <Row label="Berilgan sana">{formatUzDate(data.issuedAt)} {data.issuedAt.getFullYear()}</Row>
              <Row label="Amal qiladi">{formatUzDate(data.expiresAt)} {data.expiresAt.getFullYear()} gacha (7 kun)</Row>
              {data.smsCode && <Row label="SMS tasdiq kodi"><span className="font-mono text-xl font-bold">{data.smsCode}</span></Row>}
              <Row label="Narxi"><strong>0 SO'M</strong> — DTSJ hamkor dorixonasida</Row>
            </dl>
            <p className="mt-4 border-t-2 border-dashed pt-3 text-base">
              Ushbu varaqni hamkor dorixonaga olib boring. Farmatsevt QR kodni skanerlaydi yoki 12 xonali raqamni kiritadi.
            </p>
          </div>
          <Button size="xl" className="w-full" onClick={() => window.print()}><Printer /> Chop etish / PDF</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-2">
      <dt className="text-muted-foreground">{label}:</dt>
      <dd className="font-semibold">{children}</dd>
    </div>
  );
}
