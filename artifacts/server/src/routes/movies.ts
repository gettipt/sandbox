import { Router, type Request, type Response } from "express";

const router = Router();
const UPSTREAM = "https://mppapi.replit.app/api";

type UpstreamFilm = {
  id: string;
  title: string;
  year: number;
  duration: number;
  description?: string;
  thumbnail?: string;
  price: string;
  currency: string;
};

function normalizeFilm(film: UpstreamFilm) {
  return {
    id: film.id,
    title: film.title,
    year: film.year,
    duration: film.duration,
    description: film.description ?? "",
    thumbnail: film.thumbnail ?? "",
    price: film.price,
    currency: film.currency,
  };
}

async function handleMoviesList(req: Request, res: Response) {
  try {
    const requestedLimitRaw = typeof req.query.limit === "string" ? Number(req.query.limit) : 5;
    const requestedLimit = Number.isFinite(requestedLimitRaw) ? Math.max(1, Math.min(5, Math.floor(requestedLimitRaw))) : 5;
    const upstream = await fetch(`${UPSTREAM}/movies`);

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "Upstream error" });
      return;
    }

    const films = (await upstream.json()) as UpstreamFilm[];
    const limitedFilms = films.slice(0, requestedLimit).map(normalizeFilm);
    res.status(200).json(limitedFilms);
  } catch (err) {
    req.log.error({ err }, "movies proxy failed");
    res.status(502).json({ error: "Failed to fetch film info" });
  }
}

async function handleMovieUnlock(
  req: Request,
  res: Response,
  movieId: string,
) {
  try {
    const authHeader = req.headers["authorization"];
    const headers: Record<string, string> = {};
    if (authHeader) {
      headers["Authorization"] = authHeader;
    }

    const upstream = await fetch(`${UPSTREAM}/movies/${encodeURIComponent(movieId)}`, {
      headers,
    });

    if (upstream.status === 402) {
      const wwwAuth = upstream.headers.get("WWW-Authenticate");
      if (wwwAuth) {
        res.setHeader("WWW-Authenticate", wwwAuth);
      }
      res.status(402).json({ error: "Payment required" });
      return;
    }

    if (!upstream.ok) {
      res.status(upstream.status).json({ error: "Upstream error" });
      return;
    }

    const data = await upstream.json();
    res.status(200).json(data);
  } catch (err) {
    req.log.error({ err }, "movie unlock proxy failed");
    res.status(502).json({ error: "Failed to contact stream endpoint" });
  }
}

router.get("/movies", async (req, res) => {
  await handleMoviesList(req, res);
});

router.get("/movies/:id", async (req, res) => {
  const requestedId = typeof req.params.id === "string" ? req.params.id : "";
  if (!requestedId) {
    res.status(400).json({ error: "Missing required path parameter: id" });
    return;
  }

  await handleMovieUnlock(req, res, requestedId);
});

export default router;