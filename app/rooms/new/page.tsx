"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewRoom() {
  const [name, setName] = useState("");
  const [size, setSize] = useState(4);
  const router = useRouter();

  function create() {
    const id = Math.random().toString(36).slice(2, 9);
    sessionStorage.setItem(`room:${id}:settings`, JSON.stringify({ size }));
    router.push(`/rooms/${id}?hostName=${encodeURIComponent(name)}`);
  }

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-semibold">Create a Room</h2>
      <div className="mt-4 grid gap-3">
        <label className="flex flex-col">
          <span className="text-sm text-slate-600">Your display name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 rounded-md border px-3 py-2"
            placeholder="e.g. spidey"
          />
        </label>

        <label className="flex flex-col">
          <span className="text-sm text-slate-600">Room size</span>
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="mt-1 rounded-md border px-3 py-2 w-32"
          >
            {[2, 3, 4, 5, 6, 7, 8].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={create}
          className="mt-4 w-40 rounded-md bg-slate-800 py-2 text-white"
        >
          Create room
        </button>
      </div>
    </div>
  );
}
