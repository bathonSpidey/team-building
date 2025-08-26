"use client";
import Link from "next/link";

type Props = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

export default function GameCard({
  title,
  description,
  href = "#",
  comingSoon = false,
}: Props) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-md hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {comingSoon ? (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
            Coming soon
          </span>
        ) : (
          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
            Play
          </span>
        )}
      </div>
      <p className="mt-3 text-sm text-slate-600">{description}</p>
      <div className="mt-5">
        {comingSoon ? (
          <button
            disabled
            className="w-full rounded-md border border-slate-200 py-2 text-sm text-slate-400"
          >
            Coming soon
          </button>
        ) : (
          <Link
            href={href}
            className="w-full block text-center rounded-md bg-slate-800 py-2 text-sm text-white"
          >
            Start
          </Link>
        )}
      </div>
    </div>
  );
}
