import { BellRing, Send } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { CareStore } from "@/lib/care-store";
import { formatPrescriptionCode, formatUzDate, timeLeft } from "@/lib/prescription-timer";
import { cn } from "@/lib/utils";

type ActiveInfo = { code: string; medicineName: string; expiresAt: Date } | null;

/** Visual preview of the reminders a patient would get from the Shifo Telegram bot. */
export function TelegramReminders({ store, active }: { store: CareStore; active: ActiveInfo }) {
  const on = store.telegram;
  const left = active ? timeLeft(active.expiresAt, new Date()) : null;
  const meds = store.meds.length > 0 ? store.meds : [{ id: "x", brand_name: "Siofor", strength: "850 mg" }];
  const times = ["08:00", "14:00", "20:00"];

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr]">
      <label
        htmlFor="tg-toggle"
        className={cn("flex h-fit cursor-pointer items-start gap-5 rounded-2xl border-2 p-5 transition-colors", on ? "border-telegram bg-telegram-soft" : "bg-card")}
      >
        <Switch id="tg-toggle" size="lg" checked={on} onCheckedChange={store.setTelegram} />
        <span>
          <span className="flex items-center gap-2 text-xl font-bold"><Send className="h-6 w-6 text-telegram" /> Telegram orqali eslatma olish</span>
          <span className="mt-1 block text-lg text-muted-foreground">
            @ShifoEslatmaBot har kuni dori ichish vaqtini va retsept muddati tugashidan oldin ogohlantirish yuboradi.
          </span>
          {on && <span className="mt-2 block text-lg font-semibold text-telegram">Yoqilgan — namunaviy xabarlar o'ngda ko'rsatilgan.</span>}
        </span>
      </label>

      <div className={cn("overflow-hidden rounded-3xl border-2 bg-telegram-chat transition-opacity", !on && "opacity-50")} aria-label="Telegram xabarlari namunasi">
        <div className="flex items-center gap-3 bg-telegram px-4 py-3 text-telegram-foreground">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-telegram-foreground/20"><BellRing className="h-5 w-5" /></span>
          <div>
            <p className="font-bold leading-tight">Shifo Eslatma</p>
            <p className="text-sm opacity-80">bot</p>
          </div>
        </div>
        <div className="space-y-3 p-4">
          {!on && <p className="text-center text-base font-semibold">Eslatmalarni ko'rish uchun tugmani yoqing</p>}
          {active && left && !left.expired && (
            <Bubble time="09:00">
              ⚠️ <strong>Diqqat!</strong> «{active.medicineName}» retseptingiz ({formatPrescriptionCode(active.code)}) muddati tugashiga{" "}
              <strong>{left.days} kun {left.hours} soat</strong> qoldi. {formatUzDate(active.expiresAt)} gacha DTSJ hamkor dorixonasidan 0 so'mga oling.
            </Bubble>
          )}
          {meds.slice(0, 2).map((m, i) => (
            <Bubble key={m.id} time={times[i] ?? "08:00"}>
              ⏰ Dori ichish vaqti keldi: <strong>{m.brand_name}{m.strength ? ` ${m.strength}` : ""}</strong> — 1 dona. Ichganingizdan so'ng «✅ Ichdim» tugmasini bosing.
            </Bubble>
          ))}
          <Bubble time="20:30">
            📅 Bugungi hisobot: rejadagi dorilarning barchasini belgilashni unutmang. Sog' bo'ling! 💚
          </Bubble>
        </div>
      </div>
    </div>
  );
}

function Bubble({ time, children }: { time: string; children: React.ReactNode }) {
  return (
    <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-card p-3 text-base leading-relaxed text-card-foreground shadow-sm">
      {children}
      <span className="mt-1 block text-right text-xs text-muted-foreground">{time}</span>
    </div>
  );
}
