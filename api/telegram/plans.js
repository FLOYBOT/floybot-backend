const PLANS=[["1m","1 месяц","TG_PLAN_1M_STARS",true],["2m","2 месяца","TG_PLAN_2M_STARS",false],["3m","3 месяца","TG_PLAN_3M_STARS",false],["6m","6 месяцев","TG_PLAN_6M_STARS",false],["12m","12 месяцев","TG_PLAN_12M_STARS",false]];
export default function handler(req,res){
 res.setHeader("Access-Control-Allow-Origin","https://floybot.github.io");
 res.setHeader("Cache-Control","public, max-age=60");
 if(req.method!=="GET")return res.status(405).json({ok:false});
 return res.status(200).json({ok:true,plans:PLANS.map(([code,label,env,recurring])=>({code,label,stars:Number(process.env[env]||0),recurring}))});
}