import Image from "next/image";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnimeCardProps {
  id: number;
  title: string;
  image_url: string;
  score: number | null;
}

export function AnimeCard({ id, title, image_url, score }: AnimeCardProps) {
  const formattedScore = score !== null ? score.toFixed(2) : "N/A";

  return (
    <Link href={`/anime/${id}`} className="block">
      <Card className="overflow-hidden border-border/70 bg-card/80 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:scale-105 hover:ring-2 hover:ring-primary cursor-pointer">
        <div className="relative aspect-[2/3] w-full overflow-hidden">
          <Image
            src={image_url}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-500 hover:scale-105"
            priority={false}
          />
        </div>

        <CardHeader className="p-4 pb-2">
          <CardTitle className="line-clamp-2 text-sm sm:text-base" title={title}>
            {title}
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 pt-0 text-sm text-muted-foreground">
          <div className="flex items-center justify-between gap-2">
            <span>MAL ID: {id}</span>
            <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground">
              Score: {formattedScore}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
