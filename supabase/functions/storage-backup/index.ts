import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Verify caller is admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await sb.auth.getUser(token);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // List all buckets and their files
    const { data: buckets, error: bucketsError } = await sb.storage.listBuckets();
    if (bucketsError) throw bucketsError;

    if (!buckets || buckets.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No storage buckets found. Storage backup is not needed yet.",
          buckets: [],
          recommendation:
            "Database backups do NOT cover Storage files. When you add storage buckets, use this endpoint to audit and export file manifests. For actual file backup, download files from the signed URLs provided.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const manifest: Array<{
      bucket: string;
      files: Array<{ name: string; size: number; lastModified: string; signedUrl?: string }>;
    }> = [];

    for (const bucket of buckets) {
      const { data: files } = await sb.storage.from(bucket.name).list("", {
        limit: 1000,
        sortBy: { column: "created_at", order: "desc" },
      });

      const fileEntries = [];
      for (const file of files || []) {
        if (file.id) {
          // Generate a signed URL valid for 1 hour for backup download
          const { data: signedData } = await sb.storage
            .from(bucket.name)
            .createSignedUrl(file.name, 3600);

          fileEntries.push({
            name: file.name,
            size: (file.metadata as any)?.size ?? 0,
            lastModified: (file.metadata as any)?.lastModified ?? file.created_at ?? "",
            signedUrl: signedData?.signedUrl,
          });
        }
      }

      manifest.push({ bucket: bucket.name, files: fileEntries });
    }

    return new Response(
      JSON.stringify({
        message: "Storage file manifest generated. Use signed URLs to download files for backup.",
        recommendation:
          "Database backups do NOT include storage files. Schedule periodic calls to this endpoint and download the signed URLs to maintain file backups.",
        manifest,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("storage-backup error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
