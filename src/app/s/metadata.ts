import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Cancel List — Top 5 this week",
  description: "Click to vote. Live ranking. Weekly reset.",
  openGraph: {
    title: "The Cancel List — Top 5 this week",
    description: "Click to vote. Live ranking. Weekly reset.",
    images: [
      {
        url: "/api/og",
        width: 1200,
        height: 630,
        alt: "The Cancel List — Top 5 this week",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Cancel List — Top 5 this week",
    description: "Click to vote. Live ranking. Weekly reset.",
    images: ["/api/og"],
  },
};
