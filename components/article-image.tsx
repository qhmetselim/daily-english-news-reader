"use client";

import Image from "next/image";
import { useState } from "react";
import type { ArticleCategory } from "@/lib/articles";

const categoryVisuals: Record<
  ArticleCategory,
  {
    gradient: string;
    accent: string;
    label: string;
  }
> = {
  World: {
    gradient: "from-sky-950 via-blue-700 to-cyan-400",
    accent: "bg-cyan-200/80",
    label: "Global Brief",
  },
  Economy: {
    gradient: "from-emerald-950 via-teal-700 to-lime-300",
    accent: "bg-lime-200/80",
    label: "Market Watch",
  },
  Sports: {
    gradient: "from-green-950 via-emerald-700 to-yellow-300",
    accent: "bg-yellow-200/80",
    label: "Match Report",
  },
  Technology: {
    gradient: "from-slate-950 via-indigo-700 to-sky-300",
    accent: "bg-sky-200/80",
    label: "Tech Signal",
  },
  Science: {
    gradient: "from-cyan-950 via-blue-700 to-violet-300",
    accent: "bg-violet-200/80",
    label: "Discovery",
  },
  Culture: {
    gradient: "from-rose-950 via-fuchsia-700 to-amber-300",
    accent: "bg-amber-200/80",
    label: "Culture Desk",
  },
  Magazine: {
    gradient: "from-stone-950 via-orange-700 to-pink-300",
    accent: "bg-pink-200/80",
    label: "Weekend Read",
  },
};

type ArticleImageProps = {
  category: ArticleCategory;
  imageUrl?: string;
  title: string;
  usesFallbackImage?: boolean;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

export function ArticleImage({
  category,
  imageUrl,
  title,
  usesFallbackImage,
  sizes,
  priority = false,
  className = "aspect-video",
  imageClassName = "",
}: ArticleImageProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const displayImageUrl = getDisplayImageUrl(imageUrl);
  const showImage = Boolean(displayImageUrl && !usesFallbackImage && !imageFailed);

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      {showImage ? (
        <Image
          src={displayImageUrl ?? ""}
          alt={title}
          fill
          sizes={sizes}
          quality={90}
          priority={priority}
          {...(priority ? {} : { loading: "lazy" as const })}
          className={`object-cover transition duration-500 group-hover:scale-105 ${imageClassName}`}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <CategoryPlaceholder category={category} />
      )}
    </div>
  );
}

function getDisplayImageUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const upgradedValue = upgradeImageUrlForDisplay(value);

  return isLowQualityImageUrl(upgradedValue) ? undefined : upgradedValue;
}

function upgradeImageUrlForDisplay(value: string): string {
  if (value.startsWith("/")) {
    return value;
  }

  try {
    const url = new URL(value);

    if (url.hostname === "i.guim.co.uk" && url.pathname.includes("/master/")) {
      return url.toString();
    }

    for (const key of ["w", "width", "maxwidth"]) {
      const width = Number(url.searchParams.get(key));

      if (Number.isFinite(width) && width < 1000) {
        url.searchParams.set(key, "1200");
      }
    }

    for (const key of ["h", "height", "maxheight"]) {
      const height = Number(url.searchParams.get(key));

      if (Number.isFinite(height) && height < 675) {
        url.searchParams.set(key, "675");
      }
    }

    url.pathname = url.pathname.replace(
      /(?:^|[-_/])(?:150x150|300x\d+|\d+x300)(?=$|[-_.\/])/gi,
      (match) => match.replace(/150x150|300x\d+|\d+x300/i, "1200x675"),
    );

    return url.toString();
  } catch {
    return value;
  }
}

function isLowQualityImageUrl(value: string): boolean {
  if (isSignedGuardianImage(value)) {
    return false;
  }

  const dimensions = value.match(/(?:^|[^\d])(\d{2,4})x(\d{2,4})(?:[^\d]|$)/i);
  const width = getNumericImageParam(value, ["w", "width", "maxwidth"]);
  const height = getNumericImageParam(value, ["h", "height", "maxheight"]);

  if (dimensions) {
    return Number(dimensions[1]) < 480 || Number(dimensions[2]) < 270;
  }

  if (width && width < 480) {
    return true;
  }

  if (height && height < 270) {
    return true;
  }

  return /(?:thumbnail|thumb|small|150x150|300x\d+|\d+x300)/i.test(value);
}

function isSignedGuardianImage(value: string): boolean {
  try {
    const url = new URL(value);

    return url.hostname === "i.guim.co.uk" && url.searchParams.has("s");
  } catch {
    return false;
  }
}

function getNumericImageParam(value: string, keys: string[]): number | null {
  try {
    const url = new URL(value);

    for (const key of keys) {
      const number = Number(url.searchParams.get(key));

      if (Number.isFinite(number)) {
        return number;
      }
    }
  } catch {
    return null;
  }

  return null;
}

function CategoryPlaceholder({ category }: { category: ArticleCategory }) {
  const visual = categoryVisuals[category];

  return (
    <div
      className={`absolute inset-0 bg-gradient-to-br ${visual.gradient} transition duration-500 group-hover:scale-105`}
    >
      <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_20%,white_0,transparent_28%),radial-gradient(circle_at_80%_30%,white_0,transparent_24%),linear-gradient(135deg,transparent_0_45%,white_46%_47%,transparent_48%)]" />
      <div className="absolute bottom-5 left-5 right-5">
        <div className={`mb-3 h-1.5 w-16 rounded-full ${visual.accent}`} />
        <p className="text-lg font-semibold text-white drop-shadow">
          {visual.label}
        </p>
      </div>
    </div>
  );
}
