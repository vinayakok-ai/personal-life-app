"use client";

import { useState } from "react";
import Link from "next/link";
import { AREAS } from "@/lib/areas";
import { Confetti, PHONE_KEY, Star, useBoard } from "@/components/shared";

type Vehicle = "CAR" | "BIKE" | null;

export default function JoinWizard() {
  const { board } = useBoard(60000);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);
  const [savedName, setSavedName] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [vehicle, setVehicle] = useState<Vehicle>(null);
  const [seats, setSeats] = useState(2);
  const [sat, setSat] = useState(true);
  const [sun, setSun] = useState(true);

  async function prefill(p: string) {
    const digits = p.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (digits.length !== 10) return;
    try {
      const res = await fetch(`/api/me?phone=${digits}`);
      const { rider } = await res.json();
      if (rider) {
        setName(rider.name);
        setArea(rider.area);
        setCustomArea(rider.customArea ?? "");
        setVehicle(rider.vehicleType ?? null);
        setSeats(rider.spareSeats || 2);
        setSat(rider.days !== "SUN");
        setSun(rider.days !== "SAT");
      }
    } catch {
      /* prefill is best-effort */
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          area,
          customArea,
          hasVehicle: !!vehicle,
          vehicleType: vehicle,
          spareSeats: seats,
          days: sat && sun ? "BOTH" : sat ? "SAT" : "SUN",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong — try again.");
        return;
      }
      localStorage.setItem(PHONE_KEY, data.rider.phone);
      setSavedName(data.rider.name);
      setConfettiKey((k) => k + 1);
      setStep(4);
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border-[1.5px] border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5 outline-none focus:border-[var(--coral)]";
  const btn =
    "block w-full rounded-[13px] bg-[var(--coral)] px-5 py-3 text-center text-[15.5px] font-bold text-[var(--on-coral)] active:bg-[var(--coral-deep)] disabled:opacity-40";
  const ghost =
    "block w-full rounded-[13px] border-[1.5px] border-[var(--line)] bg-[var(--surface)] px-5 py-3 text-center font-semibold";
  const segBtn = (on: boolean) =>
    `flex-1 rounded-xl border-[1.5px] px-3 py-2.5 text-[13.5px] font-semibold ${
      on
        ? "border-[var(--coral)] bg-[var(--coral-soft)] text-[var(--coral-deep)]"
        : "border-[var(--line)] bg-[var(--surface)] text-[var(--soft)]"
    }`;

  const progress = (
    <div className="mb-6 flex gap-1.5">
      {[1, 2, 3].map((i) => (
        <i
          key={i}
          className={`h-1 flex-1 rounded-full ${step >= i ? "bg-[var(--coral)]" : "bg-[var(--line)]"}`}
        />
      ))}
    </div>
  );
  const err = error && (
    <p className="mb-3.5 rounded-xl bg-[var(--danger-soft)] px-3.5 py-2.5 text-[13.5px] font-semibold text-[var(--danger)]">
      {error}
    </p>
  );

  return (
    <main className="mx-auto max-w-md px-5 pb-20 pt-8">
      <Confetti fireKey={confettiKey} />

      {step === 0 && (
        <div className="text-center">
          <div className="text-[40px] leading-none">
            <Star />
          </div>
          <h1 className="serif mt-3 text-[30px] font-bold leading-[1.15] [text-wrap:balance]">
            Don&apos;t ride to Impact Lab alone.
          </h1>
          <p className="mt-2 text-[var(--soft)]">
            Polaris School of Technology, Whitefield · Sat &amp; Sun · doors 9:00 AM
          </p>
          {board && (
            <div className="mt-4 flex gap-2">
              <Stat n={String(board.stats.riders)} l="riders" />
              <Stat n={String(board.stats.sharing)} l="sharing" />
              <Stat n={`₹${(board.stats.savedPerDay / 1000).toFixed(1)}k`} l="saved / day" />
              <Stat n={`${board.stats.co2Kg}kg`} l="CO₂ cut" />
            </div>
          )}
          <button className={`${btn} mt-5`} onClick={() => setStep(1)}>
            Find my ride crew →
          </button>
          <Link href="/board" className={`${ghost} mt-2.5`}>
            Just show me the groups
          </Link>
          <p className="mt-4 text-[11.5px] text-[var(--soft)]">
            Takes ~30 seconds · two days of solo cabs ≈ ₹2,000. Split it. 🌱
          </p>
        </div>
      )}

      {step === 1 && (
        <div>
          {progress}
          <h2 className="serif mb-1 text-[25px] font-bold leading-tight">First, who are you?</h2>
          <p className="mb-5 text-sm text-[var(--soft)]">
            Your number is your ID — re-enter it later to edit or drop out. It&apos;s visible to your
            ride crew so you can coordinate on WhatsApp.
          </p>
          {err}
          <div className="mb-3.5">
            <label className="mb-1 block text-[12.5px] font-bold">Name</label>
            <input className={input} maxLength={60} placeholder="e.g. Vinayak" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="mb-3.5">
            <label className="mb-1 block text-[12.5px] font-bold">WhatsApp number</label>
            <input className={input} inputMode="numeric" placeholder="10-digit mobile" value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={(e) => prefill(e.target.value)} />
          </div>
          <div className="mt-5 flex gap-2">
            <button className={`${ghost} flex-none basis-24`} onClick={() => setStep(0)}>Back</button>
            <button
              className={btn}
              onClick={() => {
                const digits = phone.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
                if (!name.trim()) setError("Please enter your name.");
                else if (!/^[6-9]\d{9}$/.test(digits)) setError("That doesn't look like a 10-digit mobile number.");
                else { setError(null); setStep(2); }
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          {progress}
          <h2 className="serif mb-1 text-[25px] font-bold leading-tight">Where are you starting from?</h2>
          <p className="mb-5 text-sm text-[var(--soft)]">We group people whose routes to Whitefield overlap.</p>
          {err}
          <div className="grid grid-cols-2 gap-2">
            {AREAS.map((a) => (
              <button
                key={a.key}
                onClick={() => { setArea(a.key); setError(null); }}
                className={`rounded-xl border-[1.5px] px-2.5 py-2 text-left text-[13px] font-semibold ${
                  area === a.key
                    ? "border-[var(--coral)] bg-[var(--coral-soft)]"
                    : "border-[var(--line)] bg-[var(--surface)]"
                }`}
              >
                {a.name}
                <small className="block text-[10.5px] font-normal text-[var(--soft)]">
                  {a.key === "other" ? "anywhere else" : `~${a.minutes} min away`}
                </small>
              </button>
            ))}
          </div>
          {area === "other" && (
            <input className={`${input} mt-3`} maxLength={60} placeholder="Type your area, e.g. Kammanahalli" value={customArea} onChange={(e) => setCustomArea(e.target.value)} />
          )}
          <div className="mt-5 flex gap-2">
            <button className={`${ghost} flex-none basis-24`} onClick={() => setStep(1)}>Back</button>
            <button
              className={btn}
              onClick={() => {
                if (!area) setError("Tap the area you're coming from.");
                else if (area === "other" && !customArea.trim()) setError("Type your area name.");
                else { setError(null); setStep(3); }
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          {progress}
          <h2 className="serif mb-1 text-[25px] font-bold leading-tight">Last one — days &amp; wheels.</h2>
          <p className="mb-5 text-sm text-[var(--soft)]">Vehicle owners become crew captains and fill their spare seats.</p>
          {err}
          <div className="mb-4">
            <label className="mb-1 block text-[12.5px] font-bold">I&apos;m going on</label>
            <div className="flex gap-2">
              <button className={segBtn(sat)} onClick={() => setSat(!sat)}>{sat ? "✓ " : ""}Saturday</button>
              <button className={segBtn(sun)} onClick={() => setSun(!sun)}>{sun ? "✓ " : ""}Sunday</button>
            </div>
          </div>
          <BigOpt e="🚕" t="No vehicle — I'll share" d="Join a car with a spare seat, or split a cab 4 ways" on={vehicle === null} onClick={() => setVehicle(null)} />
          <BigOpt e="🚗" t="I'm driving a car" d="Offer your spare seats — be the hero" on={vehicle === "CAR"} onClick={() => setVehicle("CAR")} />
          <BigOpt e="🏍️" t="I'm on a bike" d="Room for one pillion, if you're offering" on={vehicle === "BIKE"} onClick={() => { setVehicle("BIKE"); setSeats(Math.min(seats, 1)); }} />
          {vehicle && (
            <div className="mb-1 mt-3">
              <label className="mb-1 block text-[12.5px] font-bold">Spare seats</label>
              <select className={input} value={seats} onChange={(e) => setSeats(Number(e.target.value))}>
                {Array.from({ length: (vehicle === "BIKE" ? 1 : 6) + 1 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? "0 — riding solo" : i}</option>
                ))}
              </select>
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <button className={`${ghost} flex-none basis-24`} onClick={() => setStep(2)}>Back</button>
            <button
              className={btn}
              disabled={busy}
              onClick={() => {
                if (!sat && !sun) { setError("Pick at least one day."); return; }
                submit();
              }}
            >
              {busy ? "Joining…" : "Join the carpool ✳️"}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="text-center">
          <div className="text-[40px]">🎉</div>
          <h1 className="serif mt-3 text-[28px] font-bold leading-[1.15] [text-wrap:balance]">
            You&apos;re on the manifest, {savedName}.
          </h1>
          <p className="mt-2 text-[var(--soft)]">
            The organizer will slot you into a crew from your corridor. Your ride ticket — and when
            to leave — will appear on the board.
          </p>
          <Link href="/board" className={`${btn} mt-6`}>
            See my ride ticket →
          </Link>
          <button className={`${ghost} mt-2.5`} onClick={() => setStep(1)}>
            Edit my details
          </button>
        </div>
      )}
    </main>
  );
}

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div className="flex-1 rounded-[13px] border border-[var(--line)] bg-[var(--surface)] px-1 py-2.5 text-center">
      <div className="serif text-[20px] font-bold text-[var(--coral-deep)]">{n}</div>
      <div className="text-[10.5px] font-semibold uppercase tracking-wide text-[var(--soft)]">{l}</div>
    </div>
  );
}

function BigOpt({ e, t, d, on, onClick }: { e: string; t: string; d: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`mb-2.5 flex w-full items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3.5 text-left ${
        on ? "border-[var(--coral)] bg-[var(--coral-soft)]" : "border-[var(--line)] bg-[var(--surface)]"
      }`}
    >
      <span className="text-2xl">{e}</span>
      <span>
        <span className="block text-[15px] font-bold">{t}</span>
        <span className="block text-xs text-[var(--soft)]">{d}</span>
      </span>
    </button>
  );
}
