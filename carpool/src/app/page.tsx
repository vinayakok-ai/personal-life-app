"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AREAS, AREA_BY_KEY, CORRIDOR_BY_KEY } from "@/lib/areas";

type Days = "SAT" | "SUN" | "BOTH";

export default function JoinPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [area, setArea] = useState("");
  const [customArea, setCustomArea] = useState("");
  const [hasVehicle, setHasVehicle] = useState(false);
  const [vehicleType, setVehicleType] = useState<"CAR" | "BIKE">("CAR");
  const [spareSeats, setSpareSeats] = useState(2);
  const [sat, setSat] = useState(true);
  const [sun, setSun] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<null | { updated: boolean }>(null);
  const [looking, setLooking] = useState(false);

  const days: Days | null = sat && sun ? "BOTH" : sat ? "SAT" : sun ? "SUN" : null;

  const areaOptions = useMemo(
    () =>
      [...AREAS].sort((a, b) =>
        a.key === "other" ? 1 : b.key === "other" ? -1 : a.name.localeCompare(b.name)
      ),
    []
  );

  const selectedArea = AREA_BY_KEY[area];

  async function lookup(p: string) {
    const digits = p.replace(/\D/g, "").replace(/^91/, "");
    if (digits.length !== 10) return;
    setLooking(true);
    try {
      const res = await fetch(`/api/me?phone=${digits}`);
      const { rider } = await res.json();
      if (rider) {
        setName(rider.name);
        setArea(rider.area);
        setCustomArea(rider.customArea ?? "");
        setHasVehicle(rider.hasVehicle);
        if (rider.vehicleType === "BIKE" || rider.vehicleType === "CAR")
          setVehicleType(rider.vehicleType);
        setSpareSeats(rider.spareSeats || 2);
        setSat(rider.days !== "SUN");
        setSun(rider.days !== "SAT");
      }
    } finally {
      setLooking(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!days) {
      setError("Pick at least one day.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          area,
          customArea,
          hasVehicle,
          vehicleType,
          spareSeats,
          days,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong — try again.");
        return;
      }
      setDone({ updated: data.updated });
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="mx-auto max-w-md px-4 py-12 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="mt-4 text-2xl font-bold">
          {done.updated ? "Details updated!" : "You're in!"}
        </h1>
        <p className="mt-2 text-stone-600">
          You've been placed in a ride group with people travelling your way.
          Ping your group on WhatsApp to fix pickup points and split the fare.
        </p>
        <Link
          href="/board"
          className="mt-6 inline-block w-full rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow hover:bg-emerald-700"
        >
          See my ride group →
        </Link>
        <button
          onClick={() => setDone(null)}
          className="mt-3 w-full rounded-xl border border-stone-300 px-6 py-3 font-medium text-stone-700 hover:bg-stone-100"
        >
          Edit my details
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-8">
      <header className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
          Claude Impact Lab · Sat &amp; Sun
        </p>
        <h1 className="mt-1 text-3xl font-bold">Ride together to Whitefield 🚗</h1>
        <p className="mt-2 text-stone-600">
          Polaris School of Technology, 9:00 AM sharp. Join a carpool or cab
          group from your side of Bangalore — cheaper for everyone, greener for
          the city.
        </p>
        <Link href="/board" className="mt-3 inline-block text-sm font-medium text-emerald-700 underline">
          Already joined? See the ride board →
        </Link>
      </header>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <div>
          <label className="mb-1 block text-sm font-medium">Your name</label>
          <input
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vinayak"
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            WhatsApp number {looking && <span className="text-stone-400">(checking…)</span>}
          </label>
          <input
            required
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onBlur={(e) => lookup(e.target.value)}
            placeholder="10-digit mobile number"
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
          />
          <p className="mt-1 text-xs text-stone-500">
            No login needed — your number is your ID. Enter it again anytime to
            edit or drop out. It'll be visible to other riders so groups can
            coordinate on WhatsApp.
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Which area are you coming from?
          </label>
          <select
            required
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
          >
            <option value="" disabled>
              Select your area…
            </option>
            {areaOptions.map((a) => (
              <option key={a.key} value={a.key}>
                {a.name}
              </option>
            ))}
          </select>
          {area === "other" && (
            <input
              required
              maxLength={60}
              value={customArea}
              onChange={(e) => setCustomArea(e.target.value)}
              placeholder="Type your area, e.g. Kammanahalli"
              className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
            />
          )}
          {selectedArea && selectedArea.key !== "other" && (
            <p className="mt-1 text-xs text-stone-500">
              {CORRIDOR_BY_KEY[selectedArea.corridor].name} · ~
              {selectedArea.minutes} min to the venue
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Which days?</label>
          <div className="grid grid-cols-2 gap-2">
            <DayToggle label="Saturday" on={sat} set={setSat} />
            <DayToggle label="Sunday" on={sun} set={setSun} />
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={hasVehicle}
              onChange={(e) => setHasVehicle(e.target.checked)}
              className="size-5 accent-emerald-600"
            />
            <span className="font-medium">I have my own vehicle</span>
          </label>
          {hasVehicle && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {(["CAR", "BIKE"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setVehicleType(t);
                      if (t === "BIKE" && spareSeats > 1) setSpareSeats(1);
                    }}
                    className={`rounded-xl border px-4 py-2 font-medium ${
                      vehicleType === t
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-stone-300 text-stone-600"
                    }`}
                  >
                    {t === "CAR" ? "🚗 Car" : "🏍️ Bike"}
                  </button>
                ))}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Spare seats you can offer
                </label>
                <select
                  value={spareSeats}
                  onChange={(e) => setSpareSeats(Number(e.target.value))}
                  className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-emerald-600"
                >
                  {Array.from(
                    { length: (vehicleType === "BIKE" ? 1 : 6) + 1 },
                    (_, i) => i
                  ).map((n) => (
                    <option key={n} value={n}>
                      {n === 0 ? "0 — riding solo" : n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <button
          disabled={busy}
          className="w-full rounded-xl bg-emerald-600 px-6 py-3.5 text-lg font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
        >
          {busy ? "Joining…" : "Find my ride group"}
        </button>
        <p className="text-center text-xs text-stone-500">
          Groups are first-come-first-served within your travel corridor. Two
          days of solo cabs ≈ ₹2,000+ — split it instead. 🌱
        </p>
      </form>
    </main>
  );
}

function DayToggle({
  label,
  on,
  set,
}: {
  label: string;
  on: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => set(!on)}
      className={`rounded-xl border px-4 py-3 font-medium ${
        on
          ? "border-emerald-600 bg-emerald-50 text-emerald-800"
          : "border-stone-300 text-stone-600"
      }`}
    >
      {on ? "✓ " : ""}
      {label}
    </button>
  );
}
