import { createClient } from "@supabase/supabase-js";
import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { writeFile, readFile, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const config = { api: { bodyParser: false } };

// Use ffmpeg in Node runtime
ffmpeg.setFfmpegPath(ffmpegPath);

// Helper: read raw binary body
async function getRawBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY =
    process.env.NEXT_SUPABASE_SECRET_KEY ||
    process.env.NEXT_SUPABASE_SERVICE_ROLE_KEY;

  if (!URL)
    return res
      .status(500)
      .json({ ok: false, error: "Missing NEXT_PUBLIC_SUPABASE_URL" });
  if (!SERVICE_KEY)
    return res.status(500).json({
      ok: false,
      error: "Missing NEXT_SUPABASE_SECRET_KEY / NEXT_SERVICE_ROLE_KEY",
    });

  // Admin client (server-only key)
  const supabase = createClient(URL, SERVICE_KEY);

  // Headers control where/how the file is stored (works for both tables)
  const bucket = String(
    req.headers["x-bucket"] || "recreate-ai-storage-bucket"
  ); // change if your bucket is different
  const userId = String(req.headers["x-user-id"] || "anon");
  const table = String(req.headers["x-table"] || "mic_recordings"); // "mic_recordings" | "call_recordings"
  if (!["mic_recordings", "call_recordings"].includes(table)) {
    return res.status(400).json({
      ok: false,
      error: "x-table must be mic_recordings or call_recordings",
    });
  }
  const baseName = String(
    req.headers["x-basename"] || new Date().toISOString().replace(/[:.]/g, "-")
  ).replace(/[^\w\-]/g, "_");

  try {
    // 1) Read input
    const inputBuf = await getRawBody(req);
    if (!inputBuf?.length) {
      return res.status(400).json({ ok: false, error: "Empty body" });
    }

    // 2) Convert → MP3 in /tmp
    const id = crypto.randomBytes(6).toString("hex");
    const inPath = path.join("/tmp", `${id}-in`);
    const outPath = path.join("/tmp", `${id}-out.mp3`);
    await writeFile(inPath, inputBuf);

    await new Promise((resolve, reject) => {
      ffmpeg(inPath)
        .outputOptions(["-vn", "-acodec libmp3lame", "-b:a 128k"])
        .on("end", resolve)
        .on("error", reject)
        .save(outPath);
    });

    const mp3Buf = await readFile(outPath);
    await Promise.allSettled([unlink(inPath), unlink(outPath)]);

    // 3) Upload to Supabase Storage
    const storagePath = `${userId}/${table}/${baseName}.mp3`;
    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(storagePath, mp3Buf, { contentType: "audio/mpeg", upsert: true });

    if (uploadErr) {
      return res.status(500).json({
        ok: false,
        error: "Supabase upload failed",
        details: uploadErr.message || String(uploadErr),
      });
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);

    // 4) Done
    return res.status(200).json({
      ok: true,
      bucket,
      path: storagePath,
      fileName: `${baseName}.mp3`,
      publicUrl: data?.publicUrl || null,
      contentType: "audio/mpeg",
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "Server error",
      details: String(e?.message || e),
    });
  }
}
