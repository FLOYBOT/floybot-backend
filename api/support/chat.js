export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age","86400");
  res.setHeader("Access-Control-Allow-Methods","POST,OPTIONS");
  if(req.method==="OPTIONS") return res.status(204).end();
  if(req.method==="GET") return res.status(200).json({ok:true,service:"FLOWBOT AI support"});
  if(req.method!=="POST") return res.status(405).json({error:"Method not allowed"});

  const key=process.env.OPENAI_API_KEY;
  if(!key) return res.status(503).json({error:"AI support is not configured yet"});

  let body={};
  try{
    body=typeof req.body==="string"?JSON.parse(req.body||"{}"):(req.body||{});
  }catch(e){
    return res.status(400).json({error:"Invalid JSON"});
  }
  const message=typeof body.message==="string"?body.message.trim():"";
  const history=Array.isArray(body.history)?body.history.slice(-10):[];
  if(!message) return res.status(400).json({error:"Message is required"});
  if(message.length>2000) return res.status(400).json({error:"Message is too long"});

  const input=[
    {role:"developer",content:"Ты AI-помощник поддержки FLOWBOT. Отвечай на русском, кратко, дружелюбно и по делу. Помогай только с FLOWBOT, подключением TikTok через официальный Login Kit, статусом аккаунта, Console и возможностями сайта. Не проси пароли, токены, Client Secret или другие секреты. Не утверждай, что FLOWBOT может ставить лайки, публиковать комментарии или управлять TikTok через неофициальную автоматизацию. Если вопрос требует доступа к аккаунту или ручной проверки, честно скажи об этом. Если не знаешь ответа — так и скажи и предложи обратиться к владельцу FLOWBOT."},
    ...history.filter(x=>x&&((x.role==="user")||(x.role==="assistant"))&&typeof x.content==="string").map(x=>({role:x.role,content:x.content.slice(0,2000)})),
    {role:"user",content:message}
  ];

  try{
    const model=process.env.OPENAI_SUPPORT_MODEL||"gpt-6-luna";
    const api=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+key},
      body:JSON.stringify({model,input,max_output_tokens:500})
    });
    const data=await api.json();
    if(!api.ok){
      const providerCode=data?.error?.code||data?.error?.type||"unknown";
      console.error("OpenAI support error",{status:api.status,code:providerCode,message:data?.error?.message||"unknown",model});
      return res.status(502).json({error:"AI provider error",code:providerCode,status:api.status});
    }
    const answer=data.output_text||data.output?.flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text;
    if(!answer) return res.status(502).json({error:"Empty AI response"});
    return res.status(200).json({answer});
  }catch(e){
    console.error("Support handler error",e?.message||e);
    return res.status(500).json({error:"Support temporarily unavailable"});
  }
}
