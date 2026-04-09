import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const R2_ACCOUNT_ID = Deno.env.get("R2_ACCOUNT_ID")!
const R2_API_TOKEN = Deno.env.get("R2_API_TOKEN")!
const R2_BUCKET = Deno.env.get("R2_BUCKET_NAME") || "loopin-media"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get("Authorization")!
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const contentType = req.headers.get("content-type") || "application/octet-stream"
    const ext = contentType.includes("jpeg") || contentType.includes("jpg") ? "jpg" 
      : contentType.includes("png") ? "png"
      : contentType.includes("webp") ? "webp"
      : contentType.includes("mp4") ? "mp4"
      : "bin"

    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`

    const r2Endpoint = `https://api.cloudflare.com/client/v4/accounts/${R2_ACCOUNT_ID}/r2/buckets/${R2_BUCKET}/objects/${fileName}`

    const r2Response = await fetch(r2Endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "Authorization": `Bearer ${R2_API_TOKEN}`,
      },
      body: req.body,
    })

    if (!r2Response.ok) {
      const errorText = await r2Response.text()
      console.error("R2 upload error:", r2Response.status, errorText)
      return new Response(JSON.stringify({ error: "Upload failed", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const publicUrl = `https://pub-7f59ad5c421b4ae6b6343caf3733476c.r2.dev/${fileName}`

    return new Response(JSON.stringify({ url: publicUrl, path: fileName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })

  } catch (error) {
    console.error("Upload error:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})