export default async function handler(req,res){
 res.setHeader("Access-Control-Allow-Origin","https://floybot.github.io");
 res.setHeader("Access-Control-Allow-Headers","Content-Type");
 res.setHeader("Access-Control-Allow-Methods","GET,OPTIONS");
 if(req.method==="OPTIONS")return res.status(204).end();
 if(req.method!=="GET")return res.status(405).json({ok:false});
 const id=String(req.query?.telegram_user_id||"");if(!id)return res.status(400).json({ok:false,error:"telegram_user_id required"});
 try{const url=process.env.SUPABASE_URL+"/rest/v1/telegram_subscriptions?telegram_user_id=eq."+encodeURIComponent(id)+"&status=eq.active&expires_at=gt."+encodeURIComponent(new Date().toISOString())+"&select=plan_code,duration_months,expires_at&order=expires_at.desc&limit=1";
 const r=await fetch(url,{headers:{apikey:process.env.SUPABASE_SERVICE_ROLE_KEY,Authorization:"Bearer "+process.env.SUPABASE_SERVICE_ROLE_KEY}});if(!r.ok)throw new Error("Supabase "+r.status);const rows=await r.json();return res.status(200).json({ok:true,active:rows.length>0,subscription:rows[0]||null});
 }catch(e){console.error(e);return res.status(500).json({ok:false,error:"Internal error"});}
}