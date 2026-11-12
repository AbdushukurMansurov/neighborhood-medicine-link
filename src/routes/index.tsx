import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenCheck, CalendarClock, FileCheck2, MapPin, Pill, ShieldCheck, Stethoscope, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Averuna — Davlat dorilarini 0 so'mga oling" },
      { name: "description", content: "Shifokor 12 xonali e-retsept yozadi, bemor uni kuzatadi, farmatsevt bir necha soniyada dori beradi. Surunkali kasalliklar uchun bepul dorilar." },
      { property: "og:title", content: "Averuna — Davlat dorilarini 0 so'mga oling" },
      { property: "og:description", content: "Shifokor 12 xonali e-retsept yozadi, bemor uni kuzatadi, farmatsevt bir necha soniyada dori beradi." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const roles = [
  { icon: FileCheck2, title: "Bemorlar", text: "Har bir retseptingiz, uning 12 xonali kodi va muddati tugash vaqtini ko'ring. Eslatmalarni Telegram orqali oling." },
  { icon: Stethoscope, title: "Shifokorlar", text: "Davlat ro'yxatidagi dorilardan bir necha soniyada e-retsept yozing — bemorga SMS avtomatik boradi." },
  { icon: Store, title: "Dorixonalar", text: "Kodni kiriting, SMS kodni tasdiqlang va dorini 0 so'mga bering. Zaxira avtomatik kamayadi." },
];

const modules = [
  { icon: MapPin, title: "Dorixona qidiruvchisi", text: "Xaritada yaqin DTSJ hamkor dorixonalar" },
  { icon: Pill, title: "Dori mavjudligi", text: "Dori tugagan bo'lsa — bepul o'rinbosar tavsiyasi" },
  { icon: CalendarClock, title: "Aqlli retsept taqvimi", text: "7 kunlik taymer va kundalik qabul" },
  { icon: BookOpenCheck, title: "Qo'llanma", text: "4 qadamda bepul dori olish va huquqni tekshirish" },
];

function Index() {
  return (
    <main>
      <section className="bg-hero">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-sm font-semibold text-primary shadow-soft">
            <ShieldCheck className="h-4 w-4" /> Davlat tibbiy sug'urta jamg'armasi (DTSJ) dasturi asosida
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] sm:text-6xl">
            Bitta retsept kodi. Dorini 0 so'mga olishning eng oson yo'li.
          </h1>
          <p className="mt-6 max-w-xl text-xl text-muted-foreground">
            Averuna shifokor, bemor va hamkor dorixonalarni yagona 12 xonali elektron retsept atrofida birlashtiradi. Gipertoniya, qandli diabet, astma va boshqa surunkali kasalliklar uchun dorilar davlat hisobidan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="xl"><Link to="/auth">Boshlash</Link></Button>
            <Button asChild size="xl" variant="bold"><Link to="/qollanma">Huquqimni tekshirish</Link></Button>
            <Button asChild size="xl" variant="outline"><Link to="/pharmacies">Dorixona topish</Link></Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:grid-cols-3">
        {roles.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-2xl border bg-card p-6">
            <Icon className="h-7 w-7 text-primary" />
            <h2 className="mt-4 text-2xl font-semibold">{title}</h2>
            <p className="mt-2 text-lg text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>

      <section className="border-y bg-muted/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-3xl font-semibold sm:text-4xl">Bemor uchun hamma narsa bir joyda</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border-2 bg-card p-5">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground"><Icon className="h-6 w-6" /></span>
                <h3 className="mt-4 text-xl font-bold">{title}</h3>
                <p className="mt-1 text-lg text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center sm:p-10">
          <div className="flex-1">
            <h2 className="text-3xl font-semibold">Ko'zingiz yaxshi ko'rmayaptimi?</h2>
            <p className="mt-2 text-xl opacity-90">Yuqoridagi «A+» tugmasini bosing — butun saytda harflar kattalashadi va ranglar yorqinroq bo'ladi.</p>
          </div>
          <Button asChild size="xl" variant="warm"><Link to="/qollanma">Qo'llanmani ochish</Link></Button>
        </div>
      </section>
    </main>
  );
}
