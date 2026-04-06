import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const today = new Date().toISOString().split("T")[0]

    const { error } = await supabase
      .from("campaigns")
      .update({ status: "completed" })
      .eq("status", "active")
      .lt("end_date", today)

    if (error) throw error

    const { count } = await supabase
      .from("campaigns")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .lt("end_date", today)

    console.log(`Marked ${count || 0} campaigns as completed`)

    return new Response(
      JSON.stringify({ success: true, marked: count || 0 }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    console.error("Error:", error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    )
  }
})
