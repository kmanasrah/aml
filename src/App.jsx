import { useState, useEffect, useRef } from "react";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const ALERTS = [
  {
    id:"ALT-2024-00841", status:"pending", riskScore:0.91, riskTier:"CRITICAL",
    type:"corporate",
    counterparty:"Al-Rashid General Trading LLC", counterpartyCountry:"YE", counterpartyCountryName:"Yemen",
    counterpartyBIC:"ARABAEADXXX", amount:47000, currency:"USD", alertType:"Name match + jurisdiction",
    ingestedAt:"2024-01-15T08:23:11Z", sourceRef:"EXT-20240115-00023",
    flags:["OFAC_HIT","HIGH_RISK_JURISDICTION","THRESHOLD_PROXIMITY"],
    aiRationale:"Counterparty name 'Al-Rashid General Trading LLC' returns a 94% fuzzy match against 'Al-Rashid General Trading Co.' listed on the EU Consolidated Sanctions List (entry EU-2019-0342) and OFAC SDN list. The originating country Yemen is FATF grey-listed. The transaction amount of $47,000 is within 6% of the $50,000 mandatory reporting threshold — a recognised structuring indicator per FATF Typology 2023-AML-07.",
    entityGraph:{ shareholders:["Omar Al-Rashid (67%)","Khalid Al-Rashid (33%)"], incorporated:"2019", jurisdiction:"Dubai, UAE", legalForm:"LLC" },
    newsHits:[
      { headline:"UAE-based trading firm linked to Yemeni sanctions probe", source:"Reuters", date:"2023-11-02" },
      { headline:"Al-Rashid Trading named in OFAC advisory notice", source:"Financial Times", date:"2023-08-14" }
    ],
    sanctionsHits:[{ list:"EU Consolidated", match:"94%", entityRef:"EU-2019-0342" },{ list:"OFAC SDN", match:"91%", entityRef:"SDN-YEM-0871" }],
    priorAlerts:2, accountAge:"4 months", txHistory:"First transaction with this counterparty",
    sarDraft:{ subject:"Al-Rashid General Trading LLC", suspicionType:"Sanctions evasion / layering", narrative:"On 15 January 2024, Al-Urdun Bank identified a wire transfer of USD 47,000 originating from account XXXXXXX to Al-Rashid General Trading LLC (IBAN: AE07 0331 2345 6789 0123 456) held at Arab Bank UAE (ARABAEADXXX). The transaction was flagged due to a 94% name match against EU Consolidated Sanctions List entry EU-2019-0342 and OFAC SDN list entry SDN-YEM-0871. The counterparty is domiciled in Yemen, a FATF grey-listed jurisdiction. The transaction amount of USD 47,000 falls within 6% of the USD 50,000 mandatory reporting threshold, consistent with structuring behaviour described in FATF Typology Report 2023. No prior banking relationship exists between Al-Urdun Bank and this counterparty. The account holder provided no satisfactory explanation for the transfer purpose." }
  },
  {
    id:"ALT-2024-00842", status:"pending", riskScore:0.73, riskTier:"HIGH",
    type:"corporate",
    counterparty:"Meridian Capital Holdings SA", counterpartyCountry:"PA", counterpartyCountryName:"Panama",
    counterpartyBIC:"BANAPAPAXX1", amount:125000, currency:"USD", alertType:"High-risk jurisdiction",
    ingestedAt:"2024-01-15T08:41:05Z", sourceRef:"EXT-20240115-00024",
    flags:["HIGH_RISK_JURISDICTION","SHELL_COMPANY_INDICATOR"],
    aiRationale:"Counterparty is a Panamanian holding company with no apparent operational activity. Panama remains a monitored jurisdiction per CBJ Circular 10/2022. Corporate registry data shows the entity was incorporated 4 months ago with no known beneficial owner disclosure. The combination of offshore holding structure, recent incorporation, and large round-number transfer ($125,000) matches a known layering typology.",
    entityGraph:{ shareholders:["Nominee director (bearer shares)","Unknown beneficial owner"], incorporated:"2023", jurisdiction:"Panama City", legalForm:"SA" },
    newsHits:[], sanctionsHits:[],
    priorAlerts:0, accountAge:"8 months", txHistory:"3rd transaction this month, total $310,000",
    sarDraft:{ subject:"Meridian Capital Holdings SA", suspicionType:"Layering / beneficial ownership concealment", narrative:"On 15 January 2024, Al-Urdun Bank flagged an outbound wire transfer of USD 125,000 to Meridian Capital Holdings SA, a Panamanian entity incorporated in September 2023. The entity has no apparent commercial operations and its beneficial ownership is concealed through nominee directors. Panama is identified as a monitored jurisdiction under CBJ Circular 10/2022. This is the third transfer to this counterparty in the current month, with a cumulative value of USD 310,000. The transaction pattern and corporate structure are consistent with layering behaviour." }
  },
  {
    id:"ALT-2024-00843", status:"pending", riskScore:0.44, riskTier:"MEDIUM",
    type:"corporate",
    counterparty:"Levant Textile Export Co.", counterpartyCountry:"TR", counterpartyCountryName:"Turkey",
    counterpartyBIC:"AKBKTRISXXX", amount:18500, currency:"EUR", alertType:"Pattern — repeat beneficiary",
    ingestedAt:"2024-01-15T09:02:33Z", sourceRef:"EXT-20240115-00025",
    flags:["REPEAT_BENEFICIARY"],
    aiRationale:"This is the 7th transaction to this counterparty in 60 days, totalling EUR 112,000. Individual amounts are below threshold but cumulative volume is elevated. No sanctions list match. Turkey is not FATF grey-listed. Pattern may represent legitimate trade activity — recommend verifying invoice documentation against transaction narrative.",
    entityGraph:{ shareholders:["Mehmet Yilmaz (100%)"], incorporated:"2011", jurisdiction:"Istanbul", legalForm:"Limited" },
    newsHits:[], sanctionsHits:[],
    priorAlerts:6, accountAge:"3 years", txHistory:"7 transactions in 60 days, EUR 112,000 cumulative"
  },
  {
    id:"ALT-2024-00844", status:"approved", riskScore:0.12, riskTier:"LOW",
    type:"corporate",
    counterparty:"Jordan Phosphate Mines Co.", counterpartyCountry:"JO", counterpartyCountryName:"Jordan",
    counterpartyBIC:"ARABJOABXXX", amount:340000, currency:"JOD", alertType:"Amount threshold",
    ingestedAt:"2024-01-15T07:15:00Z", sourceRef:"EXT-20240115-00021",
    flags:[],
    aiRationale:"Counterparty is a publicly listed Jordanian state-owned enterprise. No sanctions matches. Transaction aligns with seasonal export payment pattern observed in prior 3 years of account history. Low risk.",
    entityGraph:{ shareholders:["Government of Jordan (49%)","Public (51%)"], incorporated:"1949", jurisdiction:"Amman", legalForm:"Public JSC" },
    newsHits:[], sanctionsHits:[],
    priorAlerts:0, accountAge:"12 years", txHistory:"Regular quarterly payments — consistent with prior years"
  },
  {
    id:"ALT-2024-00845", status:"escalated", riskScore:0.88, riskTier:"CRITICAL",
    type:"corporate",
    counterparty:"Freeport Global Investments Ltd", counterpartyCountry:"VG", counterpartyCountryName:"British Virgin Islands",
    counterpartyBIC:"RBOSGGSGXXX", amount:89500, currency:"USD", alertType:"Jurisdiction + structure",
    ingestedAt:"2024-01-14T16:44:22Z", sourceRef:"EXT-20240114-00019",
    flags:["HIGH_RISK_JURISDICTION","SHELL_COMPANY_INDICATOR","ADVERSE_NEWS"],
    aiRationale:"BVI-incorporated shell with adverse media linking its sole director to a 2022 financial fraud investigation in Cyprus. Beneficial ownership is obscured behind a Seychelles nominee structure. Escalated for SAR consideration.",
    entityGraph:{ shareholders:["Nominee (Seychelles)"], incorporated:"2020", jurisdiction:"British Virgin Islands", legalForm:"Ltd" },
    newsHits:[{ headline:"BVI firm director questioned in Cyprus fraud case", source:"Cyprus Mail", date:"2023-04-17" }],
    sanctionsHits:[],
    priorAlerts:1, accountAge:"6 months", txHistory:"2nd transaction, first was $45,000 in December"
  },
  // Individual transactions
  {
    id:"ALT-2024-00846", status:"pending", riskScore:0.79, riskTier:"HIGH",
    type:"individual",
    counterparty:"Mohammed Tariq Al-Zawahiri", counterpartyCountry:"PK", counterpartyCountryName:"Pakistan",
    counterpartyBIC:"MCBLPKKA", amount:9800, currency:"USD", alertType:"Structuring — near threshold",
    ingestedAt:"2024-01-15T09:45:00Z", sourceRef:"EXT-20240115-00026",
    flags:["THRESHOLD_PROXIMITY","PEP_MATCH","STRUCTURING_PATTERN"],
    aiRationale:"Individual counterparty 'Mohammed Tariq Al-Zawahiri' returns a 78% fuzzy match to a name on the UN consolidated list. The $9,800 transfer is the 4th in 30 days from this account, all between $9,500–$9,900 — a textbook structuring pattern to avoid the $10,000 reporting threshold. The counterparty is based in Karachi, Pakistan, which has elevated risk per FATF 2022 assessment.",
    individual:{ dob:"1974-03-12", nationality:"Pakistani", occupation:"Textile merchant", pep:false, pepMatch:"78% match to UN list individual", passportRef:"AB-1234567" },
    newsHits:[], sanctionsHits:[{ list:"UN Consolidated (fuzzy)", match:"78%", entityRef:"UN-QI-2019-0441" }],
    priorAlerts:3, accountAge:"14 months", txHistory:"4 transactions in 30 days: $9,500, $9,750, $9,900, $9,800",
    sarDraft:{ subject:"Mohammed Tariq Al-Zawahiri", suspicionType:"Structuring / potential sanctions evasion", narrative:"Al-Urdun Bank identifies a pattern of structured transfers by account holder to Mohammed Tariq Al-Zawahiri in Karachi, Pakistan. Four transactions were recorded in a 30-day period, each below the USD 10,000 reporting threshold (amounts: $9,500; $9,750; $9,900; $9,800), totalling USD 39,050. The pattern is consistent with structuring as defined under Article 6 of the AML Law No. 46/2007. Additionally, the counterparty name returns a 78% fuzzy match to a UN Consolidated List individual. Bank is filing this SAR pending further investigation." }
  },
  {
    id:"ALT-2024-00847", status:"pending", riskScore:0.52, riskTier:"MEDIUM",
    type:"individual",
    counterparty:"Fatima Ibrahim Al-Nasser", counterpartyCountry:"SA", counterpartyCountryName:"Saudi Arabia",
    counterpartyBIC:"RIBLSARI", amount:22000, currency:"USD", alertType:"Unusual remittance volume",
    ingestedAt:"2024-01-15T10:10:00Z", sourceRef:"EXT-20240115-00027",
    flags:["UNUSUAL_VOLUME"],
    aiRationale:"Remittance of $22,000 is 4x the account's average monthly outbound volume. No sanctions match. Saudi Arabia is not a high-risk jurisdiction. Customer profile indicates salary-level income inconsistent with this transfer size. Recommend CDD review before approval.",
    individual:{ dob:"1988-07-22", nationality:"Jordanian", occupation:"Teacher", pep:false, pepMatch:"None", passportRef:"JO-9876543" },
    newsHits:[], sanctionsHits:[],
    priorAlerts:0, accountAge:"6 years", txHistory:"First transfer above $3,000 in account history"
  },
  {
    id:"ALT-2024-00848", status:"dismissed", riskScore:0.18, riskTier:"LOW",
    type:"individual",
    counterparty:"Ahmad Yousef Khalil", counterpartyCountry:"JO", counterpartyCountryName:"Jordan",
    counterpartyBIC:"ARABJOABXXX", amount:5500, currency:"JOD", alertType:"Name similarity",
    ingestedAt:"2024-01-15T07:45:00Z", sourceRef:"EXT-20240115-00020",
    flags:[],
    aiRationale:"Name similarity flag on 'Ahmad Yousef Khalil' — 71% match to a watchlist name. However, date of birth, nationality, and account history are inconsistent with the watchlist individual. Domestic Jordan transaction. Likely false positive.",
    individual:{ dob:"1992-11-05", nationality:"Jordanian", occupation:"Engineer", pep:false, pepMatch:"71% match (DOB mismatch — likely false positive)", passportRef:"JO-4456789" },
    newsHits:[], sanctionsHits:[],
    priorAlerts:0, accountAge:"4 years", txHistory:"Regular domestic transfers, consistent pattern"
  }
];

const BATCHES = [
  { id:"BATCH-20240115-001", file:"eastnets_export_20240115_0800.csv", alerts:23, processed:23, failed:0, time:"08:01:44", status:"complete" },
  { id:"BATCH-20240115-002", file:"eastnets_export_20240115_0900.csv", alerts:14, processed:14, failed:0, time:"09:01:12", status:"complete" },
  { id:"BATCH-20240114-003", file:"eastnets_export_20240114_1600.csv", alerts:31, processed:29, failed:2, time:"16:02:05", status:"warning" },
  { id:"BATCH-20240114-004", file:"eastnets_export_20240114_0800.csv", alerts:19, processed:19, failed:0, time:"08:01:55", status:"complete" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const TC = {
  CRITICAL:{ bg:"#FEF2F2", border:"#FECACA", text:"#991B1B", dot:"#DC2626" },
  HIGH:    { bg:"#FFF7ED", border:"#FED7AA", text:"#9A3412", dot:"#EA580C" },
  MEDIUM:  { bg:"#FFFBEB", border:"#FDE68A", text:"#92400E", dot:"#D97706" },
  LOW:     { bg:"#F0FDF4", border:"#BBF7D0", text:"#166534", dot:"#16A34A" },
};
const SS = {
  pending:  { label:"Pending",   bg:"#EFF6FF", text:"#1D4ED8" },
  approved: { label:"Approved",  bg:"#F0FDF4", text:"#166534" },
  escalated:{ label:"Escalated", bg:"#FEF2F2", text:"#991B1B" },
  dismissed:{ label:"Dismissed", bg:"#F9FAFB", text:"#6B7280" },
};
const FL = {
  OFAC_HIT:"OFAC match", HIGH_RISK_JURISDICTION:"High-risk jurisdiction",
  THRESHOLD_PROXIMITY:"Near threshold", SHELL_COMPANY_INDICATOR:"Shell company",
  ADVERSE_NEWS:"Adverse media", REPEAT_BENEFICIARY:"Repeat beneficiary",
  PEP_MATCH:"PEP match", STRUCTURING_PATTERN:"Structuring pattern", UNUSUAL_VOLUME:"Unusual volume"
};
function fmt(n,c){ try{ return new Intl.NumberFormat("en-US",{style:"currency",currency:c||"USD",maximumFractionDigits:0}).format(n); }catch{ return `${c} ${n.toLocaleString()}`; } }
function fmtD(iso){ return new Date(iso).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}); }

function TypedText({ text }){
  const [shown,setShown]=useState("");
  const [done,setDone]=useState(false);
  useEffect(()=>{ setShown(""); setDone(false); let i=0;
    const iv=setInterval(()=>{ if(i>=text.length){setDone(true);clearInterval(iv);return;} setShown(t=>t+text[i]); i++; },11);
    return ()=>clearInterval(iv);
  },[text]);
  return <span>{shown}{!done&&<span style={{opacity:0.35}}>▋</span>}</span>;
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function Sidebar({ view, setView, pending, critical }){
  const links=[
    {id:"dashboard",label:"Dashboard",icon:"▣"},
    {id:"queue",label:"Alert queue",icon:"◈",badge:pending},
    {id:"audit",label:"Audit trail",icon:"◎"},
    {id:"import",label:"Batch import",icon:"⇥"},
    {id:"rules",label:"Rules engine",icon:"◇"},
    {id:"settings",label:"Settings",icon:"⊙"},
  ];
  return(
    <aside style={{width:216,background:"#0F172A",display:"flex",flexDirection:"column",flexShrink:0,height:"100%"}}>
      <div style={{padding:"22px 20px 16px",borderBottom:"1px solid #1E293B"}}>
        <div style={{fontSize:10,letterSpacing:"0.2em",color:"#94A3B8",fontFamily:"monospace",marginBottom:3}}>CLEARPATH</div>
        <div style={{fontSize:10,color:"#334155"}}>v1.0 · Al-Urdun Bank</div>
      </div>
      {critical>0&&(
        <div style={{margin:"10px 10px 0",background:"#7F1D1D",borderRadius:7,padding:"8px 12px"}}>
          <div style={{fontSize:11,color:"#FCA5A5",fontWeight:600}}>⚠ {critical} critical</div>
          <div style={{fontSize:10,color:"#F87171",marginTop:1}}>Immediate review required</div>
        </div>
      )}
      <nav style={{flex:1,paddingTop:10}}>
        {links.map(l=>{
          const active=view===l.id;
          return(
            <button key={l.id} onClick={()=>setView(l.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 18px",background:active?"#1E293B":"transparent",border:"none",borderLeft:active?"2px solid #38BDF8":"2px solid transparent",cursor:"pointer"}}>
              <span style={{fontSize:12,color:active?"#38BDF8":"#64748B"}}>{l.icon}</span>
              <span style={{fontSize:11,color:active?"#E2E8F0":"#94A3B8",fontFamily:"monospace"}}>{l.label}</span>
              {l.badge>0&&<span style={{marginLeft:"auto",background:"#EF4444",color:"#fff",fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:20}}>{l.badge}</span>}
            </button>
          );
        })}
      </nav>
      <div style={{padding:"12px 18px",borderTop:"1px solid #1E293B"}}>
        <div style={{fontSize:10,color:"#475569",marginBottom:3}}>Signed in as</div>
        <div style={{fontSize:11,color:"#94A3B8",fontFamily:"monospace"}}>Sara Al-Khalidi</div>
        <div style={{fontSize:10,color:"#334155"}}>Senior Compliance Analyst</div>
      </div>
    </aside>
  );
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function Dashboard({ alerts, setView, setSelected }){
  const pending=alerts.filter(a=>a.status==="pending");
  const tc=t=>alerts.filter(a=>a.status==="pending"&&a.riskTier===t).length;
  const criticals=pending.filter(a=>a.riskTier==="CRITICAL");
  const individuals=alerts.filter(a=>a.type==="individual"&&a.status==="pending").length;
  const suppressed=33;
  const weekly=[12,18,9,24,31,47,22];
  const days=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const maxW=Math.max(...weekly);

  // Recent activity feed
  const recent=[
    {time:"09:45",event:"New CRITICAL alert",detail:"Al-Rashid General Trading LLC · $47,000",color:"#DC2626"},
    {time:"09:02",event:"Batch ingested",detail:"BATCH-20240115-002 · 14 alerts processed",color:"#0891B2"},
    {time:"08:55",event:"Alert dismissed",detail:"ALT-2024-00848 · false positive confirmed",color:"#16A34A"},
    {time:"08:41",event:"New HIGH alert",detail:"Meridian Capital Holdings · $125,000",color:"#EA580C"},
    {time:"08:23",event:"SAR filed",detail:"Freeport Global Investments Ltd · escalated",color:"#7C3AED"},
    {time:"08:01",event:"Batch ingested",detail:"BATCH-20240115-001 · 23 alerts processed",color:"#0891B2"},
  ];

  return(
    <div style={{padding:26,overflowY:"auto",flex:1}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:22}}>
        <div>
          <div style={{fontSize:20,fontWeight:700,color:"#0F172A"}}>Good morning, Sara</div>
          <div style={{fontSize:13,color:"#64748B",marginTop:3}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setView("queue")} style={{padding:"8px 16px",background:"#0F172A",color:"#fff",border:"none",borderRadius:8,fontSize:12,cursor:"pointer",fontWeight:600}}>Open queue →</button>
        </div>
      </div>

      {/* Top stat cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:18}}>
        {[
          {label:"Total today",val:47,sub:"alerts screened",accent:"#0F172A"},
          {label:"Pending",val:pending.length,sub:"awaiting review",accent:"#1D4ED8"},
          {label:"Critical",val:tc("CRITICAL"),sub:"immediate action",accent:"#DC2626"},
          {label:"Individuals",val:individuals,sub:"person alerts",accent:"#7C3AED"},
          {label:"AI suppressed",val:suppressed,sub:"false positives",accent:"#0891B2"},
          {label:"Avg triage",val:"2.3m",sub:"vs 38m manual",accent:"#059669"},
        ].map(c=>(
          <div key={c.label} style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:"14px 16px"}}>
            <div style={{fontSize:9,color:"#64748B",letterSpacing:"0.07em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:7}}>{c.label}</div>
            <div style={{fontSize:24,fontWeight:800,fontFamily:"monospace",color:c.accent,lineHeight:1}}>{c.val}</div>
            <div style={{fontSize:10,color:"#94A3B8",marginTop:4}}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 320px",gap:14,marginBottom:14}}>
        {/* Weekly trend */}
        <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:18}}>
          <div style={{fontSize:12,fontWeight:600,color:"#0F172A",marginBottom:4}}>Weekly alert volume</div>
          <div style={{fontSize:11,color:"#94A3B8",marginBottom:16}}>Last 7 days — all tiers</div>
          <div style={{display:"flex",alignItems:"flex-end",gap:6,height:90}}>
            {weekly.map((v,i)=>(
              <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                <div style={{fontSize:9,color:"#64748B",fontFamily:"monospace"}}>{v}</div>
                <div style={{width:"100%",background:i===6?"#0F172A":"#E2E8F0",borderRadius:"3px 3px 0 0",height:`${(v/maxW)*70}px`,transition:"height 0.4s"}}/>
                <div style={{fontSize:9,color:"#94A3B8",fontFamily:"monospace"}}>{days[i]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk breakdown */}
        <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:18}}>
          <div style={{fontSize:12,fontWeight:600,color:"#0F172A",marginBottom:4}}>Risk tier breakdown</div>
          <div style={{fontSize:11,color:"#94A3B8",marginBottom:16}}>Pending alerts by severity</div>
          {["CRITICAL","HIGH","MEDIUM","LOW"].map(t=>{
            const count=tc(t); const col=TC[t];
            const pct=Math.round((count/47)*100);
            return(
              <div key={t} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:64,fontSize:10,fontFamily:"monospace",color:col.text,background:col.bg,border:`1px solid ${col.border}`,borderRadius:4,padding:"2px 6px",textAlign:"center"}}>{t}</div>
                <div style={{flex:1,background:"#F1F5F9",borderRadius:4,height:8}}>
                  <div style={{width:`${pct}%`,background:col.dot,height:"100%",borderRadius:4}}/>
                </div>
                <div style={{width:18,fontSize:11,fontFamily:"monospace",textAlign:"right",color:"#0F172A",fontWeight:600}}>{count}</div>
              </div>
            );
          })}
          <div style={{marginTop:14,paddingTop:12,borderTop:"1px solid #F1F5F9",display:"flex",gap:16}}>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:700,color:"#0F172A",fontFamily:"monospace"}}>{individuals}</div>
              <div style={{fontSize:10,color:"#94A3B8"}}>Individual</div>
            </div>
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:700,color:"#0F172A",fontFamily:"monospace"}}>{pending.length-individuals}</div>
              <div style={{fontSize:10,color:"#94A3B8"}}>Corporate</div>
            </div>
            <div style={{textAlign:"center",marginLeft:"auto"}}>
              <div style={{fontSize:18,fontWeight:700,color:"#059669",fontFamily:"monospace"}}>71%</div>
              <div style={{fontSize:10,color:"#94A3B8"}}>FP rate</div>
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:18}}>
          <div style={{fontSize:12,fontWeight:600,color:"#0F172A",marginBottom:16}}>Live activity</div>
          {recent.map((r,i)=>(
            <div key={i} style={{display:"flex",gap:10,marginBottom:12,alignItems:"flex-start"}}>
              <div style={{width:6,height:6,borderRadius:"50%",background:r.color,marginTop:5,flexShrink:0}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,color:"#0F172A",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.event}</div>
                <div style={{fontSize:10,color:"#94A3B8",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.detail}</div>
              </div>
              <div style={{fontSize:10,color:"#CBD5E1",fontFamily:"monospace",flexShrink:0}}>{r.time}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Critical alerts */}
      {criticals.length>0&&(
        <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10,padding:16}}>
          <div style={{fontSize:12,fontWeight:600,color:"#991B1B",marginBottom:12}}>⚠ Critical — immediate review required</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            {criticals.map(a=>(
              <div key={a.id} onClick={()=>{setSelected(a);setView("detail");}} style={{background:"#fff",border:"1px solid #FECACA",borderRadius:8,padding:"12px 14px",cursor:"pointer",display:"flex",alignItems:"center",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#0F172A"}}>{a.counterparty}</div>
                  <div style={{fontSize:10,color:"#64748B",marginTop:2}}>{a.id} · {fmt(a.amount,a.currency)} · {a.counterpartyCountryName}</div>
                  <div style={{display:"flex",gap:4,marginTop:6,flexWrap:"wrap"}}>
                    {a.flags.slice(0,2).map(f=><span key={f} style={{fontSize:9,background:"#FEE2E2",color:"#991B1B",padding:"1px 6px",borderRadius:20}}>{FL[f]||f}</span>)}
                  </div>
                </div>
                <div style={{fontSize:26,fontWeight:800,color:"#DC2626",fontFamily:"monospace"}}>{Math.round(a.riskScore*100)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ALERT QUEUE ─────────────────────────────────────────────────────────────
function AlertQueue({ alerts, setSelected, setView }){
  const [filter,setFilter]=useState("pending");
  const [typeFilter,setTypeFilter]=useState("all");
  const [expanded,setExpanded]=useState(null);

  const filtered=alerts
    .filter(a=> filter==="all"?true:["pending","approved","escalated","dismissed"].includes(filter)?a.status===filter:a.riskTier===filter)
    .filter(a=> typeFilter==="all"?true:a.type===typeFilter)
    .sort((a,b)=>b.riskScore-a.riskScore);

  const toggleExpand=(id,e)=>{ e.stopPropagation(); setExpanded(prev=>prev===id?null:id); };

  return(
    <div style={{padding:24,flex:1,overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <div style={{fontSize:19,fontWeight:700,color:"#0F172A"}}>Alert queue</div>
          <div style={{fontSize:12,color:"#64748B",marginTop:2}}>AI-ranked · {filtered.length} alerts</div>
        </div>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <div style={{display:"flex",gap:5}}>
            {["all","individual","corporate"].map(f=>(
              <button key={f} onClick={()=>setTypeFilter(f)} style={{padding:"4px 11px",borderRadius:20,border:"1px solid",fontSize:10,cursor:"pointer",fontFamily:"monospace",background:typeFilter===f?"#334155":"#fff",color:typeFilter===f?"#fff":"#64748B",borderColor:typeFilter===f?"#334155":"#E2E8F0"}}>{f}</button>
            ))}
          </div>
          <div style={{display:"flex",gap:5}}>
            {["all","pending","CRITICAL","HIGH","MEDIUM","LOW","approved","escalated","dismissed"].map(f=>(
              <button key={f} onClick={()=>setFilter(f)} style={{padding:"4px 11px",borderRadius:20,border:"1px solid",fontSize:10,cursor:"pointer",fontFamily:"monospace",background:filter===f?"#0F172A":"#fff",color:filter===f?"#fff":"#64748B",borderColor:filter===f?"#0F172A":"#E2E8F0"}}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden"}}>
        {/* Header row */}
        <div style={{display:"grid",gridTemplateColumns:"72px 110px 1fr 95px 140px 95px 105px 32px",background:"#F8FAFC",borderBottom:"1px solid #E2E8F0",padding:"0"}}>
          {["Score","Alert ID","Counterparty","Amount","Type","Status","Ingested",""].map(h=>(
            <div key={h} style={{padding:"10px 12px",fontSize:9,color:"#64748B",fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",fontFamily:"monospace"}}>{h}</div>
          ))}
        </div>

        {filtered.map((a,i)=>{
          const col=TC[a.riskTier]; const ss=SS[a.status];
          const pct=Math.round(a.riskScore*100);
          const isExp=expanded===a.id;
          return(
            <div key={a.id} style={{borderBottom:i<filtered.length-1?"1px solid #F1F5F9":"none"}}>
              {/* Main row */}
              <div style={{display:"grid",gridTemplateColumns:"72px 110px 1fr 95px 140px 95px 105px 32px",cursor:"pointer",background:"#fff",alignItems:"center"}}
                onMouseEnter={e=>e.currentTarget.style.background="#F8FAFC"}
                onMouseLeave={e=>e.currentTarget.style.background="#fff"}
                onClick={()=>{setSelected(a);setView("detail");}}>
                <div style={{padding:"11px 12px"}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:42,background:col.bg,border:`1px solid ${col.border}`,borderRadius:7,padding:"5px 0"}}>
                    <div style={{fontSize:15,fontWeight:800,color:col.text,fontFamily:"monospace",lineHeight:1}}>{pct}</div>
                    <div style={{fontSize:7,color:col.text,opacity:0.7,marginTop:1}}>{a.riskTier}</div>
                  </div>
                </div>
                <div style={{padding:"11px 12px",fontSize:10,color:"#475569",fontFamily:"monospace"}}>{a.id}</div>
                <div style={{padding:"11px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    {a.type==="individual"&&<span style={{fontSize:9,background:"#FAF5FF",color:"#7C3AED",border:"1px solid #E9D5FF",padding:"1px 6px",borderRadius:20,flexShrink:0}}>individual</span>}
                    <span style={{fontSize:12,fontWeight:600,color:"#0F172A"}}>{a.counterparty}</span>
                  </div>
                  <div style={{fontSize:10,color:"#94A3B8",marginTop:2}}>{a.counterpartyCountryName} · {a.counterpartyBIC}</div>
                </div>
                <div style={{padding:"11px 12px",fontSize:11,fontWeight:600,color:"#0F172A",fontFamily:"monospace"}}>{fmt(a.amount,a.currency)}</div>
                <div style={{padding:"11px 12px",fontSize:10,color:"#64748B"}}>{a.alertType}</div>
                <div style={{padding:"11px 12px"}}><span style={{fontSize:10,background:ss.bg,color:ss.text,padding:"2px 8px",borderRadius:20}}>{ss.label}</span></div>
                <div style={{padding:"11px 12px",fontSize:10,color:"#94A3B8",fontFamily:"monospace"}}>{fmtD(a.ingestedAt)}</div>
                <div style={{padding:"11px 8px"}} onClick={e=>toggleExpand(a.id,e)}>
                  <div style={{fontSize:14,color:"#94A3B8",transform:isExp?"rotate(90deg)":"none",transition:"transform 0.2s"}}>›</div>
                </div>
              </div>

              {/* Supplementary expansion row */}
              {isExp&&(
                <div style={{background:"#FAFBFC",borderTop:"1px solid #F1F5F9",padding:"14px 12px 14px 84px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12}}>
                  <div>
                    <div style={{fontSize:9,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:"monospace",marginBottom:4}}>Prior alerts</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#0F172A",fontFamily:"monospace"}}>{a.priorAlerts}</div>
                    <div style={{fontSize:10,color:"#64748B"}}>on this counterparty</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:"monospace",marginBottom:4}}>Account age</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#0F172A",fontFamily:"monospace"}}>{a.accountAge}</div>
                    <div style={{fontSize:10,color:"#64748B"}}>relationship length</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:"monospace",marginBottom:4}}>Tx history</div>
                    <div style={{fontSize:11,color:"#374151",lineHeight:1.4}}>{a.txHistory}</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:"#94A3B8",textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:"monospace",marginBottom:4}}>Risk signals</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {a.flags.length>0?a.flags.map(f=><span key={f} style={{fontSize:9,background:"#FEF2F2",color:"#991B1B",border:"1px solid #FECACA",padding:"1px 7px",borderRadius:20}}>{FL[f]||f}</span>):<span style={{fontSize:10,color:"#94A3B8"}}>No flags</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ALERT DETAIL ────────────────────────────────────────────────────────────
function AlertDetail({ alert, onBack, onDecide }){
  const [notes,setNotes]=useState("");
  const [decided,setDecided]=useState(alert.status!=="pending"?alert.status:null);
  const [showSAR,setShowSAR]=useState(false);
  const [showFPModal,setShowFPModal]=useState(false);
  const [fpReason,setFPReason]=useState(null);
  const [fpSubmitted,setFPSubmitted]=useState(false);
  const col=TC[alert.riskTier]; const pct=Math.round(alert.riskScore*100);

  const decide=d=>{
    if(d==="dismissed"){ setShowFPModal(true); return; }
    setDecided(d); onDecide(alert.id,d);
  };
  const submitFP=(reason)=>{ setFPReason(reason); setFPSubmitted(true); setDecided("dismissed"); onDecide(alert.id,"dismissed"); setShowFPModal(false); };

  return(
    <div style={{flex:1,overflowY:"auto",padding:26,position:"relative"}}>
      <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",fontSize:12,color:"#64748B",marginBottom:16,padding:0}}>← Back to queue</button>

      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
            {alert.type==="individual"&&<span style={{fontSize:10,background:"#FAF5FF",color:"#7C3AED",border:"1px solid #E9D5FF",padding:"2px 8px",borderRadius:20}}>individual</span>}
            <div style={{fontSize:20,fontWeight:700,color:"#0F172A"}}>{alert.counterparty}</div>
          </div>
          <div style={{fontSize:11,color:"#64748B",fontFamily:"monospace"}}>{alert.id} · {alert.alertType} · {fmtD(alert.ingestedAt)}</div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:42,fontWeight:900,color:col.text,fontFamily:"monospace",lineHeight:1}}>{pct}</div>
            <div style={{fontSize:9,color:"#94A3B8",marginTop:2}}>risk score</div>
          </div>
          <div style={{background:col.bg,border:`1px solid ${col.border}`,borderRadius:8,padding:"8px 14px"}}>
            <div style={{fontSize:12,fontWeight:700,color:col.text}}>{alert.riskTier}</div>
          </div>
        </div>
      </div>

      {/* Flags */}
      {alert.flags.length>0&&(
        <div style={{display:"flex",gap:7,marginBottom:16,flexWrap:"wrap"}}>
          {alert.flags.map(f=><span key={f} style={{fontSize:11,background:"#FEF2F2",color:"#991B1B",border:"1px solid #FECACA",padding:"3px 11px",borderRadius:20}}>{FL[f]||f}</span>)}
        </div>
      )}

      {/* Info grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:18}}>
          <div style={{fontSize:9,color:"#64748B",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",fontFamily:"monospace",marginBottom:12}}>Transaction</div>
          {[["Amount",fmt(alert.amount,alert.currency)],["Currency",alert.currency],["BIC",alert.counterpartyBIC],["Country",`${alert.counterpartyCountryName} (${alert.counterpartyCountry})`],["Source ref",alert.sourceRef],["Prior alerts",`${alert.priorAlerts} on this counterparty`],["Tx history",alert.txHistory]].map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #F1F5F9",gap:8}}>
              <span style={{fontSize:11,color:"#94A3B8",flexShrink:0}}>{k}</span>
              <span style={{fontSize:11,color:"#0F172A",fontFamily:"monospace",textAlign:"right"}}>{v}</span>
            </div>
          ))}
        </div>

        {/* Entity graph (corporate) or Individual profile */}
        {alert.type==="corporate"?(
          <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:18}}>
            <div style={{fontSize:9,color:"#64748B",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",fontFamily:"monospace",marginBottom:12}}>Entity graph</div>
            {[["Legal form",alert.entityGraph.legalForm],["Shareholders",alert.entityGraph.shareholders.join(", ")],["Incorporated",alert.entityGraph.incorporated],["Jurisdiction",alert.entityGraph.jurisdiction]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #F1F5F9",gap:8}}>
                <span style={{fontSize:11,color:"#94A3B8",flexShrink:0}}>{k}</span>
                <span style={{fontSize:11,color:"#0F172A",textAlign:"right"}}>{v}</span>
              </div>
            ))}
          </div>
        ):(
          <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:18}}>
            <div style={{fontSize:9,color:"#64748B",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",fontFamily:"monospace",marginBottom:12}}>Individual profile</div>
            {[["Date of birth",alert.individual.dob],["Nationality",alert.individual.nationality],["Occupation",alert.individual.occupation],["Passport ref",alert.individual.passportRef],["PEP status",alert.individual.pep?"Yes":"No"],["List match",alert.individual.pepMatch]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #F1F5F9",gap:8}}>
                <span style={{fontSize:11,color:"#94A3B8",flexShrink:0}}>{k}</span>
                <span style={{fontSize:11,color:k==="List match"&&v!=="None"?"#991B1B":"#0F172A",fontFamily:"monospace",textAlign:"right"}}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI rationale */}
      <div style={{background:"#0F172A",borderRadius:12,padding:20,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:26,height:26,borderRadius:7,background:"#1E293B",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>◈</div>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:"#E2E8F0"}}>AI risk analysis</div>
            <div style={{fontSize:9,color:"#64748B",fontFamily:"monospace"}}>clearpath-mistral-v1.2 · {fmtD(alert.ingestedAt)}</div>
          </div>
          <div style={{marginLeft:"auto",background:"#1E293B",borderRadius:6,padding:"3px 10px",fontSize:10,color:"#38BDF8",fontFamily:"monospace"}}>confidence: {pct}%</div>
        </div>
        <div style={{fontSize:13,color:"#CBD5E1",lineHeight:1.75}}><TypedText text={alert.aiRationale}/></div>
      </div>

      {/* Sanctions */}
      {alert.sanctionsHits.length>0&&(
        <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:10,padding:16,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:"#991B1B",marginBottom:10}}>Sanctions list matches</div>
          {alert.sanctionsHits.map((h,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<alert.sanctionsHits.length-1?"1px solid #FECACA":"none"}}>
              <span style={{fontSize:10,background:"#FEE2E2",color:"#991B1B",padding:"2px 8px",borderRadius:4,fontFamily:"monospace"}}>{h.list}</span>
              <span style={{fontSize:12,color:"#0F172A"}}>Match: <strong>{h.match}</strong></span>
              <span style={{fontSize:10,color:"#94A3B8",fontFamily:"monospace"}}>{h.entityRef}</span>
            </div>
          ))}
        </div>
      )}

      {/* News */}
      {alert.newsHits.length>0&&(
        <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:16,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:"#0F172A",marginBottom:10}}>Adverse media</div>
          {alert.newsHits.map((n,i)=>(
            <div key={i} style={{padding:"7px 0",borderBottom:i<alert.newsHits.length-1?"1px solid #F1F5F9":"none"}}>
              <div style={{fontSize:12,color:"#0F172A"}}>{n.headline}</div>
              <div style={{fontSize:10,color:"#94A3B8",marginTop:2}}>{n.source} · {n.date}</div>
            </div>
          ))}
        </div>
      )}

      {/* Decision */}
      {!decided?(
        <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:20}}>
          <div style={{fontSize:12,fontWeight:600,color:"#0F172A",marginBottom:12}}>Analyst decision</div>
          <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Add notes — included in audit log..." style={{width:"100%",minHeight:64,border:"1px solid #E2E8F0",borderRadius:8,padding:10,fontSize:12,color:"#0F172A",resize:"vertical",marginBottom:12,boxSizing:"border-box",fontFamily:"inherit"}}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>decide("approved")} style={{flex:1,padding:"10px 0",background:"#059669",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>✓ Approve</button>
            <button onClick={()=>decide("escalated")} style={{flex:1,padding:"10px 0",background:"#DC2626",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>↑ Escalate → SAR</button>
            <button onClick={()=>decide("dismissed")} style={{flex:1,padding:"10px 0",background:"#F8FAFC",color:"#374151",border:"1px solid #E2E8F0",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>✕ Dismiss</button>
          </div>
        </div>
      ):(
        <div>
          <div style={{background:decided==="escalated"?"#FEF2F2":decided==="approved"?"#F0FDF4":"#F9FAFB",border:`1px solid ${decided==="escalated"?"#FECACA":decided==="approved"?"#BBF7D0":"#E2E8F0"}`,borderRadius:10,padding:18,textAlign:"center",marginBottom:decided==="escalated"?14:0}}>
            <div style={{fontSize:14,fontWeight:700,color:decided==="escalated"?"#991B1B":decided==="approved"?"#166534":"#374151"}}>
              {decided==="escalated"?"↑ Escalated — SAR process initiated":decided==="approved"?"✓ Alert cleared and logged":fpReason?`✕ Dismissed — ${fpReason}`:"✕ Dismissed — logged as false positive"}
            </div>
            <div style={{fontSize:11,color:"#64748B",marginTop:4}}>Decision written to audit trail · {new Date().toLocaleTimeString()}</div>
          </div>
          {decided==="escalated"&&alert.sarDraft&&(
            <div style={{marginTop:10}}>
              <button onClick={()=>setShowSAR(true)} style={{width:"100%",padding:"10px 0",background:"#7C3AED",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>◈ Open AI-drafted SAR →</button>
            </div>
          )}
        </div>
      )}

      {/* False positive modal */}
      {showFPModal&&(
        <div style={{position:"absolute",inset:0,background:"rgba(15,23,42,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50}}>
          <div style={{background:"#fff",borderRadius:14,padding:28,width:440,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{fontSize:15,fontWeight:700,color:"#0F172A",marginBottom:6}}>Why is this a false positive?</div>
            <div style={{fontSize:12,color:"#64748B",marginBottom:20}}>Your feedback improves AI suppression accuracy over time.</div>
            {[
              {id:"name_similarity",label:"Name similarity only — different entity",sub:"Same or similar name, but different person or company"},
              {id:"jurisdiction",label:"Jurisdiction — legitimate business reason",sub:"Customer operates legitimately in this country"},
              {id:"amount",label:"Amount pattern — known business activity",sub:"Transaction size is consistent with customer profile"},
              {id:"pep",label:"PEP / list match — different individual",sub:"DOB, nationality or other details do not match"},
              {id:"other",label:"Other reason",sub:"Will be noted in audit log"},
            ].map(opt=>(
              <div key={opt.id} onClick={()=>submitFP(opt.label)} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:"1px solid #E2E8F0",borderRadius:8,marginBottom:8,cursor:"pointer",transition:"all 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor="#7C3AED";e.currentTarget.style.background="#FAF5FF";}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="#E2E8F0";e.currentTarget.style.background="#fff";}}>
                <div style={{width:16,height:16,borderRadius:"50%",border:"1px solid #CBD5E1",flexShrink:0}}/>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:"#0F172A"}}>{opt.label}</div>
                  <div style={{fontSize:11,color:"#94A3B8"}}>{opt.sub}</div>
                </div>
              </div>
            ))}
            <button onClick={()=>setShowFPModal(false)} style={{width:"100%",marginTop:8,padding:"9px 0",background:"#F8FAFC",color:"#374151",border:"1px solid #E2E8F0",borderRadius:8,fontSize:12,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {/* SAR modal */}
      {showSAR&&alert.sarDraft&&(
        <div style={{position:"absolute",inset:0,background:"rgba(15,23,42,0.75)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:50,paddingTop:40,overflowY:"auto"}}>
          <div style={{background:"#fff",borderRadius:14,width:680,maxWidth:"90%",boxShadow:"0 20px 60px rgba(0,0,0,0.35)",marginBottom:40}}>
            {/* SAR header */}
            <div style={{background:"#0F172A",borderRadius:"14px 14px 0 0",padding:"18px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div>
                <div style={{fontSize:10,color:"#64748B",letterSpacing:"0.12em",fontFamily:"monospace",marginBottom:3}}>AI-DRAFTED SUSPICIOUS ACTIVITY REPORT</div>
                <div style={{fontSize:14,fontWeight:600,color:"#E2E8F0"}}>Central Bank of Jordan — SAR Form AML-1</div>
              </div>
              <button onClick={()=>setShowSAR(false)} style={{background:"#1E293B",border:"none",color:"#94A3B8",cursor:"pointer",borderRadius:6,padding:"6px 12px",fontSize:12}}>✕ Close</button>
            </div>
            <div style={{padding:"24px 28px"}}>
              <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:8,padding:"10px 14px",marginBottom:20,fontSize:11,color:"#92400E"}}>
                ◈ AI-drafted from alert data. Review all fields before submission. Model: clearpath-mistral-v1.2
              </div>

              {/* SAR fields */}
              {[
                {label:"Reporting institution",val:"Al-Urdun Bank · Amman, Jordan · License No. CBJ-2008-0042"},
                {label:"Report date",val:new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})},
                {label:"Alert reference",val:alert.id},
                {label:"Subject of report",val:alert.sarDraft.subject},
                {label:"Suspicion type",val:alert.sarDraft.suspicionType},
                {label:"Transaction amount",val:fmt(alert.amount,alert.currency)},
                {label:"Transaction date",val:fmtD(alert.ingestedAt)},
                {label:"Counterparty BIC",val:alert.counterpartyBIC},
                {label:"Counterparty country",val:alert.counterpartyCountryName},
              ].map(({label,val})=>(
                <div key={label} style={{display:"flex",gap:16,padding:"8px 0",borderBottom:"1px solid #F1F5F9"}}>
                  <div style={{width:180,fontSize:11,color:"#94A3B8",flexShrink:0}}>{label}</div>
                  <div style={{fontSize:11,color:"#0F172A",fontFamily:"monospace"}}>{val}</div>
                </div>
              ))}

              <div style={{marginTop:20}}>
                <div style={{fontSize:11,color:"#64748B",marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Narrative of suspicion</div>
                <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:8,padding:14,fontSize:12,color:"#0F172A",lineHeight:1.75,minHeight:120}}>
                  {alert.sarDraft.narrative}
                </div>
              </div>

              <div style={{marginTop:20}}>
                <div style={{fontSize:11,color:"#64748B",marginBottom:8,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.06em"}}>Analyst certification</div>
                <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:8,padding:14,fontSize:12,color:"#0F172A"}}>
                  I, Sara Al-Khalidi, Senior Compliance Analyst at Al-Urdun Bank, certify that the information contained in this report is true and accurate to the best of my knowledge, and that this report is filed in accordance with Article 12 of AML Law No. 46/2007.
                </div>
              </div>

              <div style={{display:"flex",gap:10,marginTop:20}}>
                <button style={{flex:1,padding:"11px 0",background:"#0F172A",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer"}}>Submit to CBJ / AMLU</button>
                <button style={{padding:"11px 16px",background:"#F8FAFC",color:"#374151",border:"1px solid #E2E8F0",borderRadius:8,fontSize:12,cursor:"pointer"}}>⬇ Export PDF</button>
                <button style={{padding:"11px 16px",background:"#F8FAFC",color:"#374151",border:"1px solid #E2E8F0",borderRadius:8,fontSize:12,cursor:"pointer"}}>✎ Edit draft</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AUDIT TRAIL ─────────────────────────────────────────────────────────────
function AuditTrail({ alerts }){
  const entries=alerts.flatMap(a=>[
    {time:a.ingestedAt,event:"Alert ingested from EastNets",detail:`${a.id} · ${a.sourceRef}`,type:"system"},
    {time:a.ingestedAt,event:"AI analysis complete",detail:`Score: ${Math.round(a.riskScore*100)} · ${a.riskTier} · clearpath-mistral-v1.2`,type:"ai"},
    ...(a.status!=="pending"?[{time:a.ingestedAt,event:`Decision: ${a.status}`,detail:`Sara Al-Khalidi · ${a.id}`,type:"analyst"}]:[])
  ]).sort((a,b)=>new Date(b.time)-new Date(a.time));
  const ts={system:{bg:"#F0F9FF",text:"#0369A1",dot:"#0891B2"},ai:{bg:"#FAF5FF",text:"#7C3AED",dot:"#8B5CF6"},analyst:{bg:"#F0FDF4",text:"#166534",dot:"#16A34A"}};
  return(
    <div style={{padding:26,flex:1,overflowY:"auto"}}>
      <div style={{marginBottom:20}}>
        <div style={{fontSize:19,fontWeight:700,color:"#0F172A"}}>Audit trail</div>
        <div style={{fontSize:12,color:"#64748B",marginTop:2}}>Immutable log · SHA-256 hash chain · every AI and analyst action</div>
      </div>
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden"}}>
        {entries.map((e,i)=>{const t=ts[e.type];return(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 18px",borderBottom:i<entries.length-1?"1px solid #F1F5F9":"none"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:t.dot,marginTop:5,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}>
                <span style={{fontSize:12,fontWeight:600,color:"#0F172A"}}>{e.event}</span>
                <span style={{fontSize:9,background:t.bg,color:t.text,padding:"1px 7px",borderRadius:20}}>{e.type}</span>
              </div>
              <div style={{fontSize:10,color:"#64748B",fontFamily:"monospace"}}>{e.detail}</div>
            </div>
            <div style={{fontSize:9,color:"#94A3B8",whiteSpace:"nowrap",fontFamily:"monospace"}}>{fmtD(e.time)}</div>
          </div>
        );})}
      </div>
    </div>
  );
}

// ─── BATCH IMPORT ─────────────────────────────────────────────────────────────
// ─── RULES ENGINE DATA ────────────────────────────────────────────────────────
const RULES_LIBRARY = [
  // ── SANCTIONS & WATCHLIST ──
  {
    id:"RUL-001", name:"OFAC SDN exact name match — auto-escalate",
    category:"Sanctions & watchlist", type:"ESCALATION", status:"active",
    source:"OFAC", lastModified:"2024-01-10", createdBy:"System",
    fires30d:4, suppressed30d:0, accuracy:98,
    conditions:[
      {field:"Sanctions list match",op:"is",value:"OFAC SDN"},
      {field:"Match confidence",op:">=",value:"95%"},
    ],
    action:"Force risk tier to CRITICAL. Override AI score. Flag: OFAC_HIT.",
    rationale:"Exact or near-exact OFAC SDN matches carry regulatory zero-tolerance. Human review required before any transaction release.",
    editable:false
  },
  {
    id:"RUL-002", name:"Fuzzy name match — suppress below 70% confidence",
    category:"Sanctions & watchlist", type:"SUPPRESSION", status:"active",
    source:"AI-suggested", lastModified:"2024-01-12", createdBy:"Sara Al-Khalidi",
    fires30d:0, suppressed30d:47, accuracy:94,
    conditions:[
      {field:"Name match score",op:"<",value:"70%"},
      {field:"Counterparty country",op:"not in",value:"FATF blacklist"},
      {field:"Transaction amount",op:"<",value:"$25,000"},
    ],
    action:"Auto-dismiss. Log as suppressed. Tag: LOW_CONFIDENCE_NAME_MATCH.",
    rationale:"Matches below 70% with no jurisdictional risk represent noise in the EastNets name-screening engine. 94% of these have been confirmed false positives over 90 days.",
    editable:true
  },
  {
    id:"RUL-003", name:"EU Consolidated List — escalate if match > 85%",
    category:"Sanctions & watchlist", type:"ESCALATION", status:"active",
    source:"EU Regulation 2016/1686", lastModified:"2024-01-08", createdBy:"System",
    fires30d:2, suppressed30d:0, accuracy:97,
    conditions:[
      {field:"Sanctions list match",op:"includes",value:"EU Consolidated"},
      {field:"Match confidence",op:">=",value:"85%"},
    ],
    action:"Force risk tier to CRITICAL. Require senior analyst approval.",
    rationale:"EU sanctions apply to all EUR-denominated transactions and to any EU correspondent bank relationships maintained by Al-Urdun Bank.",
    editable:false
  },
  {
    id:"RUL-004", name:"UN Security Council list — any match escalate",
    category:"Sanctions & watchlist", type:"ESCALATION", status:"active",
    source:"UN SC Resolution 1267", lastModified:"2024-01-08", createdBy:"System",
    fires30d:1, suppressed30d:0, accuracy:100,
    conditions:[
      {field:"Sanctions list match",op:"includes",value:"UN Security Council"},
    ],
    action:"Force risk tier to CRITICAL. Block transaction pending review. Notify Head of Compliance.",
    rationale:"UN Security Council designations carry international legal obligation. Jordan is bound as a UN member state.",
    editable:false
  },
  {
    id:"RUL-005", name:"CBJ / AMLU Jordan national watchlist — mandatory review",
    category:"Sanctions & watchlist", type:"ESCALATION", status:"active",
    source:"CBJ Circular AML/2022-04", lastModified:"2024-01-09", createdBy:"System",
    fires30d:3, suppressed30d:0, accuracy:100,
    conditions:[
      {field:"Sanctions list match",op:"includes",value:"CBJ National Watchlist"},
    ],
    action:"Force risk tier to CRITICAL. Mandatory 24-hour hold. File preliminary SAR.",
    rationale:"CBJ national watchlist hits carry direct regulatory liability for Al-Urdun Bank under AML Law No. 46/2007.",
    editable:false
  },
  {
    id:"RUL-006", name:"Arabic name transliteration variance — widen match window",
    category:"Sanctions & watchlist", type:"FLAG", status:"active",
    source:"FATF Guidance 2023 — Identifying TF", lastModified:"2024-01-14", createdBy:"Sara Al-Khalidi",
    fires30d:12, suppressed30d:0, accuracy:88,
    conditions:[
      {field:"Name script",op:"is",value:"Arabic transliteration"},
      {field:"Match score after normalisation",op:">=",value:"75%"},
    ],
    action:"Add flag: TRANSLITERATION_VARIANT. Escalate to analyst even if base match below threshold.",
    rationale:"Standard Latin-script fuzzy matching misses Arabic name variants (Mohammed / Muhammad / Mohamed). ClearPath normalises before scoring.",
    editable:true
  },

  // ── JURISDICTION RISK ──
  {
    id:"RUL-007", name:"FATF blacklist jurisdiction — auto-escalate all transactions",
    category:"Jurisdiction risk", type:"ESCALATION", status:"active",
    source:"FATF Public Statement", lastModified:"2024-01-08", createdBy:"System",
    fires30d:2, suppressed30d:0, accuracy:100,
    conditions:[
      {field:"Counterparty country",op:"in",value:"FATF blacklist (Iran, North Korea, Myanmar)"},
    ],
    action:"Force risk tier to CRITICAL. Block transaction. Notify Head of Compliance within 1 hour.",
    rationale:"FATF blacklisted jurisdictions require enhanced due diligence and carry the highest regulatory risk per CBJ Circular 10/2022.",
    editable:false
  },
  {
    id:"RUL-008", name:"FATF grey list — escalate transactions above $10,000",
    category:"Jurisdiction risk", type:"ESCALATION", status:"active",
    source:"FATF Grey List Feb 2024", lastModified:"2024-01-15", createdBy:"System",
    fires30d:8, suppressed30d:0, accuracy:92,
    conditions:[
      {field:"Counterparty country",op:"in",value:"FATF grey list"},
      {field:"Transaction amount",op:">=",value:"$10,000"},
    ],
    action:"Upgrade risk tier minimum to HIGH. Add flag: FATF_GREY_JURISDICTION.",
    rationale:"Current FATF grey list includes Yemen, Syria, Haiti, Mali, Tanzania, Nigeria, South Africa. Updated quarterly.",
    editable:true
  },
  {
    id:"RUL-009", name:"Offshore financial centres — flag beneficial ownership",
    category:"Jurisdiction risk", type:"FLAG", status:"active",
    source:"FATF Typologies 2022 — Beneficial Ownership", lastModified:"2024-01-11", createdBy:"Ahmad Mansour",
    fires30d:14, suppressed30d:0, accuracy:82,
    conditions:[
      {field:"Counterparty country",op:"in",value:"BVI, Cayman, Seychelles, Panama, Vanuatu"},
      {field:"Counterparty type",op:"is",value:"corporate"},
    ],
    action:"Add flag: SHELL_COMPANY_INDICATOR. Require beneficial ownership documentation before approval.",
    rationale:"Offshore incorporation in secrecy jurisdictions is a primary layering indicator per FATF Typology Report 2022.",
    editable:true
  },
  {
    id:"RUL-010", name:"High-risk correspondent bank — flag all transactions",
    category:"Jurisdiction risk", type:"FLAG", status:"active",
    source:"CBJ Correspondent Banking Circular 2023", lastModified:"2024-01-09", createdBy:"System",
    fires30d:6, suppressed30d:0, accuracy:91,
    conditions:[
      {field:"Counterparty BIC",op:"in",value:"CBJ high-risk correspondent list"},
    ],
    action:"Add flag: HIGH_RISK_CORRESPONDENT. Minimum review tier: MEDIUM.",
    rationale:"CBJ maintains a list of correspondent banks subject to enhanced due diligence under AML Law No. 46/2007 Article 8.",
    editable:true
  },

  // ── TRANSACTION PATTERNS ──
  {
    id:"RUL-011", name:"Structuring — multiple transactions near reporting threshold",
    category:"Transaction patterns", type:"ESCALATION", status:"active",
    source:"FATF Typology 2023-AML-07 — Structuring", lastModified:"2024-01-13", createdBy:"Sara Al-Khalidi",
    fires30d:5, suppressed30d:0, accuracy:89,
    conditions:[
      {field:"Transaction amount",op:"between",value:"$9,000–$9,999 or JOD 6,500–JOD 7,000"},
      {field:"Same account, same direction",op:"count in",value:">=3 transactions in 30 days"},
    ],
    action:"Escalate to HIGH minimum. Add flag: STRUCTURING_PATTERN. Include cumulative total in AI rationale.",
    rationale:"FATF Typology 2023-AML-07 defines structuring as splitting transactions to avoid reporting thresholds. JOD 7,000 and USD 10,000 are CBJ/FinCEN thresholds respectively.",
    editable:true
  },
  {
    id:"RUL-012", name:"Round-number large transfer — flag for review",
    category:"Transaction patterns", type:"FLAG", status:"active",
    source:"FATF Typologies 2021 — ML Red Flags", lastModified:"2024-01-10", createdBy:"Ahmad Mansour",
    fires30d:19, suppressed30d:0, accuracy:71,
    conditions:[
      {field:"Transaction amount",op:"is round number",value:"divisible by 5,000"},
      {field:"Transaction amount",op:">=",value:"$50,000"},
      {field:"Prior relationship",op:"<",value:"6 months"},
    ],
    action:"Add flag: ROUND_NUMBER_LARGE_TRANSFER. Include in AI analysis context.",
    rationale:"Round-number transfers to new counterparties are a layering indicator — legitimate transactions rarely produce exact multiples of 5,000.",
    editable:true
  },
  {
    id:"RUL-013", name:"Rapid movement — funds in and out within 48 hours",
    category:"Transaction patterns", type:"ESCALATION", status:"active",
    source:"FATF Typologies 2022 — Layering", lastModified:"2024-01-12", createdBy:"Sara Al-Khalidi",
    fires30d:3, suppressed30d:0, accuracy:93,
    conditions:[
      {field:"Inbound transaction",op:"followed within",value:"48 hours"},
      {field:"Outbound transaction",op:"amount",value:">= 80% of inbound"},
      {field:"Account type",op:"is not",value:"correspondent account"},
    ],
    action:"Force risk tier to HIGH. Add flag: RAPID_FUND_MOVEMENT. Auto-link related transactions in case.",
    rationale:"Funds entering and rapidly leaving an account is a primary layering indicator. Excludes correspondent accounts where this is normal operating behaviour.",
    editable:true
  },
  {
    id:"RUL-014", name:"Velocity anomaly — transaction volume 3x account average",
    category:"Transaction patterns", type:"FLAG", status:"active",
    source:"Internal — Al-Urdun Bank policy AML-2023-07", lastModified:"2024-01-11", createdBy:"Ahmad Mansour",
    fires30d:11, suppressed30d:0, accuracy:77,
    conditions:[
      {field:"Monthly transaction volume",op:">",value:"3x 12-month average"},
    ],
    action:"Add flag: VELOCITY_ANOMALY. Include volume comparison in AI rationale.",
    rationale:"Sudden volume spikes inconsistent with customer profile indicate account takeover, business change, or illicit fund injection.",
    editable:true
  },
  {
    id:"RUL-015", name:"Dormant account reactivation — large first transaction",
    category:"Transaction patterns", type:"ESCALATION", status:"active",
    source:"FATF Guidance 2020 — Proliferation Financing", lastModified:"2024-01-10", createdBy:"Sara Al-Khalidi",
    fires30d:2, suppressed30d:0, accuracy:85,
    conditions:[
      {field:"Account last activity",op:">",value:"12 months ago"},
      {field:"Transaction amount",op:">=",value:"JOD 5,000"},
    ],
    action:"Upgrade to HIGH. Add flag: DORMANT_REACTIVATION. Require CDD refresh.",
    rationale:"Dormant account reactivation with large transactions is a known technique for introducing illicit funds after a cooling-off period.",
    editable:true
  },

  // ── COUNTERPARTY BEHAVIOR ──
  {
    id:"RUL-016", name:"New counterparty — first transaction above JOD 10,000",
    category:"Counterparty behavior", type:"FLAG", status:"active",
    source:"Internal — Al-Urdun Bank policy AML-2023-03", lastModified:"2024-01-09", createdBy:"Ahmad Mansour",
    fires30d:9, suppressed30d:0, accuracy:74,
    conditions:[
      {field:"Prior transactions with counterparty",op:"=",value:"0"},
      {field:"Transaction amount",op:">=",value:"JOD 10,000"},
    ],
    action:"Add flag: NEW_COUNTERPARTY_LARGE_TX. Include in AI analysis.",
    rationale:"First-transaction large amounts represent elevated risk — no established pattern to compare against.",
    editable:true
  },
  {
    id:"RUL-017", name:"Repeat beneficiary accumulation — same counterparty > JOD 50,000 in 90 days",
    category:"Counterparty behavior", type:"ESCALATION", status:"active",
    source:"FATF Typology 2023 — Trade Finance", lastModified:"2024-01-13", createdBy:"Sara Al-Khalidi",
    fires30d:4, suppressed30d:0, accuracy:88,
    conditions:[
      {field:"Cumulative to same counterparty",op:">",value:"JOD 50,000 in 90 days"},
      {field:"Transaction purpose",op:"not documented",value:"with invoices"},
    ],
    action:"Escalate to HIGH. Add flag: REPEAT_BENEFICIARY. Request invoice documentation.",
    rationale:"High cumulative volumes without trade documentation may indicate disguised payments.",
    editable:true
  },
  {
    id:"RUL-018", name:"New account — suppress low-value domestic alerts",
    category:"Counterparty behavior", type:"SUPPRESSION", status:"active",
    source:"AI-suggested", lastModified:"2024-01-14", createdBy:"Sara Al-Khalidi",
    fires30d:0, suppressed30d:23, accuracy:97,
    conditions:[
      {field:"Counterparty country",op:"is",value:"Jordan (JO)"},
      {field:"Transaction amount",op:"<",value:"JOD 2,000"},
      {field:"EastNets alert type",op:"is",value:"Name similarity only"},
      {field:"AI risk score",op:"<",value:"0.30"},
    ],
    action:"Auto-dismiss. Log as suppressed. No analyst queue entry.",
    rationale:"Domestic low-value name-similarity alerts have a 97% false positive rate based on 90-day historical review. All are Jordan-resident individuals with common names.",
    editable:true
  },

  // ── PEP & INDIVIDUAL ──
  {
    id:"RUL-019", name:"Politically exposed person (PEP) — any transaction",
    category:"PEP & individual", type:"ESCALATION", status:"active",
    source:"FATF Recommendations R12 — PEPs", lastModified:"2024-01-08", createdBy:"System",
    fires30d:3, suppressed30d:0, accuracy:100,
    conditions:[
      {field:"Counterparty PEP status",op:"is",value:"PEP (any tier)"},
    ],
    action:"Force risk tier to HIGH minimum. Require senior analyst approval. Enhanced due diligence mandatory.",
    rationale:"FATF Recommendation 12 requires enhanced due diligence for all PEP relationships regardless of transaction size or risk score.",
    editable:false
  },
  {
    id:"RUL-020", name:"PEP family member or close associate — flag",
    category:"PEP & individual", type:"FLAG", status:"active",
    source:"FATF Recommendations R12 — PEP associates", lastModified:"2024-01-08", createdBy:"System",
    fires30d:2, suppressed30d:0, accuracy:90,
    conditions:[
      {field:"Counterparty PEP association",op:"is",value:"Family member or known associate"},
    ],
    action:"Add flag: PEP_ASSOCIATE. Minimum review tier: MEDIUM.",
    rationale:"FATF R12 extends EDD requirements to PEP family members and close associates.",
    editable:false
  },
  {
    id:"RUL-021", name:"Individual income-transaction mismatch",
    category:"PEP & individual", type:"FLAG", status:"active",
    source:"Internal — Al-Urdun Bank KYC policy 2023", lastModified:"2024-01-11", createdBy:"Ahmad Mansour",
    fires30d:7, suppressed30d:0, accuracy:81,
    conditions:[
      {field:"Counterparty type",op:"is",value:"individual"},
      {field:"Transaction amount",op:">",value:"3x stated annual income / 12"},
      {field:"Account classification",op:"is",value:"retail / personal"},
    ],
    action:"Add flag: INCOME_MISMATCH. Request source of funds documentation.",
    rationale:"Transactions materially exceeding known income profile suggest undeclared income, third-party funds, or money laundering placement.",
    editable:true
  },

  // ── TRADE-BASED ──
  {
    id:"RUL-022", name:"Trade finance — invoice amount mismatch",
    category:"Trade-based ML", type:"ESCALATION", status:"active",
    source:"FATF Guidance 2021 — TBML", lastModified:"2024-01-12", createdBy:"Sara Al-Khalidi",
    fires30d:2, suppressed30d:0, accuracy:91,
    conditions:[
      {field:"Payment reference",op:"includes",value:"invoice / LC / trade"},
      {field:"Transaction amount vs invoice",op:"variance >",value:"20%"},
    ],
    action:"Escalate to HIGH. Add flag: TBML_INVOICE_MISMATCH. Require amended invoice.",
    rationale:"Over/under-invoicing relative to declared invoice value is the most common trade-based money laundering technique per FATF 2021 TBML Guidance.",
    editable:true
  },
  {
    id:"RUL-023", name:"High-risk commodity — flag all trade payments",
    category:"Trade-based ML", type:"FLAG", status:"active",
    source:"FATF TBML Guidance 2021 — High-risk commodities", lastModified:"2024-01-10", createdBy:"Ahmad Mansour",
    fires30d:5, suppressed30d:0, accuracy:80,
    conditions:[
      {field:"Transaction narrative",op:"contains",value:"gold, diamonds, oil, arms, chemicals, timber"},
    ],
    action:"Add flag: HIGH_RISK_COMMODITY. Include commodity type in AI rationale.",
    rationale:"Dual-use or high-value commodities are preferred TBML vehicles due to valuation difficulty and price volatility.",
    editable:true
  },

  // ── AUTO-SUPPRESSION (KNOWN FP PATTERNS) ──
  {
    id:"RUL-024", name:"Jordan government entities — suppress all name alerts",
    category:"Auto-suppression", type:"SUPPRESSION", status:"active",
    source:"Internal — pre-approved entity list", lastModified:"2024-01-08", createdBy:"Ahmad Mansour",
    fires30d:0, suppressed30d:31, accuracy:100,
    conditions:[
      {field:"Counterparty",op:"in",value:"Approved government entity list (CBJ-verified)"},
    ],
    action:"Auto-dismiss name-similarity alerts. Amount threshold alerts still pass to queue.",
    rationale:"CBJ-verified Jordanian government entities are pre-cleared for name matching. Jordan Phosphate Mines, JPMC, Arab Potash and 47 others on approved list.",
    editable:true
  },
  {
    id:"RUL-025", name:"Known correspondent banks — suppress routine threshold alerts",
    category:"Auto-suppression", type:"SUPPRESSION", status:"active",
    source:"Internal — approved correspondent list", lastModified:"2024-01-09", createdBy:"Ahmad Mansour",
    fires30d:0, suppressed30d:44, accuracy:99,
    conditions:[
      {field:"Counterparty BIC",op:"in",value:"Approved correspondent bank list"},
      {field:"EastNets alert type",op:"is",value:"Amount threshold only"},
      {field:"AI risk score",op:"<",value:"0.25"},
    ],
    action:"Auto-dismiss. Log as suppressed with reason: KNOWN_CORRESPONDENT_THRESHOLD.",
    rationale:"Amount threshold alerts on correspondent accounts are operational noise. These accounts are subject to separate annual due diligence reviews.",
    editable:true
  },
  {
    id:"RUL-026", name:"Salary payments — suppress domestic low-risk",
    category:"Auto-suppression", type:"SUPPRESSION", status:"draft",
    source:"AI-suggested", lastModified:"2024-01-15", createdBy:"ClearPath AI",
    fires30d:0, suppressed30d:0, accuracy:null,
    conditions:[
      {field:"Transaction narrative",op:"contains",value:"salary, راتب, payroll"},
      {field:"Counterparty country",op:"is",value:"Jordan (JO)"},
      {field:"Transaction amount",op:"<",value:"JOD 5,000"},
      {field:"Frequency",op:"is",value:"monthly recurring (±3 days)"},
    ],
    action:"Auto-dismiss. Log as suppressed with reason: SALARY_PAYMENT.",
    rationale:"AI identified 38 recurring monthly domestic transfers matching salary patterns that generated 38 false positive alerts in Q4 2023. Awaiting analyst approval before activation.",
    editable:true
  },
];

// ─── RULES ENGINE COMPONENT ───────────────────────────────────────────────────
// ─── RULE BUILDER ────────────────────────────────────────────────────────────

const FIELD_CATALOG = [
  { group: "Transaction",    fields: [
    { id:"tx_amount",     label:"Transaction amount",      ops:[">=","<=",">","<","between","is round number"], valueType:"amount", placeholder:"e.g. 10000" },
    { id:"tx_currency",   label:"Currency",                ops:["is","is not"],                                 valueType:"select", options:["USD","EUR","JOD","GBP","AED","SAR"] },
    { id:"tx_narrative",  label:"Transaction narrative",   ops:["contains","does not contain"],                 valueType:"text",   placeholder:"e.g. invoice, salary, gold" },
    { id:"tx_direction",  label:"Direction",               ops:["is"],                                          valueType:"select", options:["inbound","outbound","internal"] },
    { id:"tx_type",       label:"Transaction type",        ops:["is","is not"],                                 valueType:"select", options:["wire transfer","cash","SWIFT","SEPA","CliQ","internal"] },
  ]},
  { group: "Counterparty",   fields: [
    { id:"cp_country",    label:"Counterparty country",    ops:["in","not in","is","is not"],                   valueType:"jurisdiction", placeholder:"e.g. YE, IR, SY or FATF blacklist" },
    { id:"cp_type",       label:"Counterparty type",       ops:["is","is not"],                                 valueType:"select", options:["individual","corporate","financial institution","government"] },
    { id:"cp_bic",        label:"Counterparty BIC",        ops:["in","not in","matches"],                       valueType:"text",   placeholder:"e.g. ARABAEADXXX or CBJ high-risk list" },
    { id:"cp_new",        label:"Prior transactions",      ops:["=","<",">"],                                   valueType:"number", placeholder:"number of prior transactions" },
    { id:"cp_jurisdiction",label:"Incorporation jurisdiction", ops:["in","not in"],                             valueType:"jurisdiction", placeholder:"e.g. BVI, Cayman, Seychelles" },
  ]},
  { group: "Sanctions & lists", fields: [
    { id:"sl_match",      label:"Sanctions list match",    ops:["includes","does not include"],                 valueType:"select", options:["OFAC SDN","EU Consolidated","UN Security Council","CBJ National Watchlist","FATF Blacklist","FATF Grey List"] },
    { id:"sl_score",      label:"Match confidence score",  ops:[">=","<=",">","<"],                             valueType:"percent", placeholder:"e.g. 85" },
    { id:"sl_pep",        label:"PEP status",              ops:["is","is not"],                                 valueType:"select", options:["PEP Tier 1","PEP Tier 2","PEP associate","not PEP"] },
  ]},
  { group: "Pattern & velocity", fields: [
    { id:"pt_count",      label:"Transaction count (window)", ops:[">=","<=",">","<"],                          valueType:"count_window", placeholder:"e.g. 3" },
    { id:"pt_cumulative", label:"Cumulative amount (window)", ops:[">=","<=",">","<"],                          valueType:"amount_window", placeholder:"e.g. 50000" },
    { id:"pt_velocity",   label:"Volume vs account average", ops:[">","<"],                                     valueType:"multiplier", placeholder:"e.g. 3x" },
    { id:"pt_dormant",    label:"Account last activity",     ops:["more than","less than"],                     valueType:"duration", placeholder:"e.g. 12 months ago" },
    { id:"pt_rapid",      label:"Time between in/out",       ops:["<","<="],                                    valueType:"duration", placeholder:"e.g. 48 hours" },
  ]},
  { group: "Account & customer", fields: [
    { id:"ac_age",        label:"Account age",             ops:["<",">","<=",">="],                             valueType:"duration", placeholder:"e.g. 6 months" },
    { id:"ac_risk",       label:"Account risk rating",     ops:["is",">="],                                     valueType:"select", options:["Low","Medium","High","Critical"] },
    { id:"ac_segment",    label:"Customer segment",        ops:["is","is not"],                                 valueType:"select", options:["retail","SME","corporate","financial institution","government"] },
    { id:"ac_income",     label:"Income vs transaction",   ops:[">","<"],                                       valueType:"multiplier", placeholder:"e.g. 3x monthly income" },
  ]},
  { group: "AI score", fields: [
    { id:"ai_score",      label:"AI risk score",           ops:[">=","<=",">","<"],                             valueType:"percent", placeholder:"e.g. 0.70" },
    { id:"ai_tier",       label:"AI risk tier",            ops:["is","is not"],                                 valueType:"select", options:["LOW","MEDIUM","HIGH","CRITICAL"] },
    { id:"ai_flags",      label:"AI flag",                 ops:["includes","does not include"],                 valueType:"select", options:["OFAC_HIT","HIGH_RISK_JURISDICTION","THRESHOLD_PROXIMITY","SHELL_COMPANY_INDICATOR","ADVERSE_NEWS","REPEAT_BENEFICIARY","PEP_MATCH","STRUCTURING_PATTERN"] },
  ]},
];

const ACTIONS_CATALOG = [
  { id:"escalate_critical", label:"Force tier → CRITICAL",       desc:"Override AI score, escalate to highest tier",    type:"ESCALATION", color:"#DC2626" },
  { id:"escalate_high",     label:"Force tier → HIGH",           desc:"Override AI score, escalate to HIGH",            type:"ESCALATION", color:"#EA580C" },
  { id:"escalate_medium",   label:"Upgrade tier minimum → MEDIUM", desc:"AI cannot score below MEDIUM",                 type:"ESCALATION", color:"#D97706" },
  { id:"suppress",          label:"Auto-dismiss alert",          desc:"Remove from analyst queue, log as suppressed",   type:"SUPPRESSION", color:"#059669" },
  { id:"flag_ofac",         label:"Add flag: OFAC_HIT",          desc:"Attach OFAC match signal to alert",              type:"FLAG",       color:"#1D4ED8" },
  { id:"flag_jurisdiction", label:"Add flag: HIGH_RISK_JURISDICTION", desc:"Mark as high-risk jurisdiction",            type:"FLAG",       color:"#1D4ED8" },
  { id:"flag_shell",        label:"Add flag: SHELL_COMPANY_INDICATOR", desc:"Require beneficial ownership docs",        type:"FLAG",       color:"#1D4ED8" },
  { id:"flag_structuring",  label:"Add flag: STRUCTURING_PATTERN", desc:"Include pattern analysis in rationale",        type:"FLAG",       color:"#1D4ED8" },
  { id:"flag_custom",       label:"Add custom flag",             desc:"Define your own flag label",                     type:"FLAG",       color:"#7C3AED" },
  { id:"require_docs",      label:"Request documentation",       desc:"Prompt analyst to collect supporting docs",      type:"FLAG",       color:"#7C3AED" },
  { id:"notify",            label:"Notify Head of Compliance",   desc:"Send immediate notification",                    type:"ESCALATION", color:"#DC2626" },
  { id:"hold",              label:"Place 24-hour hold",          desc:"Block transaction pending review",               type:"ESCALATION", color:"#DC2626" },
];

const WINDOWS = ["24 hours","48 hours","7 days","14 days","30 days","60 days","90 days"];

function getFieldMeta(fieldId) {
  for (const group of FIELD_CATALOG) {
    const f = group.fields.find(f => f.id === fieldId);
    if (f) return f;
  }
  return null;
}

function ConditionRow({ cond, index, total, onChange, onRemove, isFirst }) {
  const meta = getFieldMeta(cond.field);
  const allFields = FIELD_CATALOG.flatMap(g => g.fields);

  const renderValueInput = () => {
    if (!meta) return null;
    const base = { padding:"6px 10px", border:"1px solid #E2E8F0", borderRadius:7, fontSize:11, color:"#0F172A", background:"#fff", minWidth:120 };
    switch(meta.valueType) {
      case "select":
        return (
          <select value={cond.value} onChange={e => onChange({...cond, value:e.target.value})} style={base}>
            <option value="">select…</option>
            {meta.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      case "jurisdiction":
        return (
          <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <input value={cond.value} onChange={e => onChange({...cond, value:e.target.value})} placeholder={meta.placeholder} style={{...base,minWidth:180}} />
            <div style={{display:"flex",gap:4}}>
              {["FATF blacklist","FATF grey list","Offshore centres"].map(p => (
                <button key={p} onClick={() => onChange({...cond, value:p})} style={{padding:"3px 8px",fontSize:9,border:"1px solid #E2E8F0",borderRadius:20,background:cond.value===p?"#0F172A":"#fff",color:cond.value===p?"#fff":"#64748B",cursor:"pointer"}}>{p}</button>
              ))}
            </div>
          </div>
        );
      case "count_window":
      case "amount_window":
        return (
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <input type="number" value={cond.value} onChange={e => onChange({...cond, value:e.target.value})} placeholder={meta.placeholder} style={{...base,width:90}} />
            <span style={{fontSize:11,color:"#64748B"}}>within</span>
            <select value={cond.window||"30 days"} onChange={e => onChange({...cond, window:e.target.value})} style={base}>
              {WINDOWS.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        );
      case "multiplier":
        return (
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <input type="number" value={cond.value} onChange={e => onChange({...cond, value:e.target.value})} placeholder="e.g. 3" style={{...base,width:70}} />
            <span style={{fontSize:11,color:"#64748B"}}>× average</span>
          </div>
        );
      case "duration":
        return (
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <input type="number" value={cond.value} onChange={e => onChange({...cond, value:e.target.value})} placeholder="e.g. 6" style={{...base,width:70}} />
            <select value={cond.unit||"months"} onChange={e => onChange({...cond, unit:e.target.value})} style={base}>
              {["hours","days","weeks","months","years"].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        );
      case "percent":
        return (
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <input type="number" min="0" max="100" value={cond.value} onChange={e => onChange({...cond, value:e.target.value})} placeholder={meta.placeholder} style={{...base,width:80}} />
            {meta.id.includes("score") && cond.value && <span style={{fontSize:11,color:"#64748B"}}>%</span>}
          </div>
        );
      case "amount":
        return (
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            {cond.op === "between" ? (
              <>
                <input type="number" value={cond.value} onChange={e => onChange({...cond, value:e.target.value})} placeholder="min" style={{...base,width:90}} />
                <span style={{fontSize:11,color:"#64748B"}}>and</span>
                <input type="number" value={cond.value2||""} onChange={e => onChange({...cond, value2:e.target.value})} placeholder="max" style={{...base,width:90}} />
              </>
            ) : (
              <input type="number" value={cond.value} onChange={e => onChange({...cond, value:e.target.value})} placeholder={meta.placeholder} style={{...base,width:120}} />
            )}
            <select value={cond.currency||"USD"} onChange={e => onChange({...cond, currency:e.target.value})} style={{...base,width:70}}>
              {["USD","EUR","JOD","GBP","AED"].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
        );
      default:
        return <input value={cond.value} onChange={e => onChange({...cond, value:e.target.value})} placeholder={meta?.placeholder||"value"} style={{...base,minWidth:180}} />;
    }
  };

  return (
    <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:8}}>
      {/* Connector badge */}
      <div style={{width:40,paddingTop:8,flexShrink:0,textAlign:"right"}}>
        {isFirst
          ? <span style={{fontSize:10,color:"#94A3B8",fontFamily:"monospace"}}>IF</span>
          : <span style={{fontSize:10,fontWeight:700,color:"#7C3AED",background:"#FAF5FF",border:"1px solid #E9D5FF",padding:"2px 6px",borderRadius:4,fontFamily:"monospace"}}>AND</span>
        }
      </div>

      {/* Field selector */}
      <select value={cond.field} onChange={e => {
        const newMeta = getFieldMeta(e.target.value);
        onChange({...cond, field:e.target.value, op:newMeta?.ops[0]||"", value:"", value2:"", window:"30 days", unit:"months", currency:"USD"});
      }} style={{padding:"6px 10px",border:"1px solid #E2E8F0",borderRadius:7,fontSize:11,color:"#0F172A",background:"#fff",minWidth:200}}>
        <option value="">Choose field…</option>
        {FIELD_CATALOG.map(g => (
          <optgroup key={g.group} label={g.group}>
            {g.fields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </optgroup>
        ))}
      </select>

      {/* Operator */}
      {meta && (
        <select value={cond.op} onChange={e => onChange({...cond, op:e.target.value, value:"", value2:""})} style={{padding:"6px 10px",border:"1px solid #E2E8F0",borderRadius:7,fontSize:11,color:"#0F172A",background:"#fff",minWidth:100}}>
          {meta.ops.map(op => <option key={op} value={op}>{op}</option>)}
        </select>
      )}

      {/* Value input */}
      <div style={{flex:1}}>{renderValueInput()}</div>

      {/* Remove */}
      {total > 1 && (
        <button onClick={onRemove} style={{padding:"6px 8px",background:"none",border:"1px solid #E2E8F0",borderRadius:7,cursor:"pointer",color:"#94A3B8",fontSize:14,flexShrink:0,marginTop:1}}>✕</button>
      )}
    </div>
  );
}

function RulePreview({ name, ruleType, conditions, selectedActions }) {
  const hasName = name.trim().length > 0;
  const hasConds = conditions.some(c => c.field && c.value);
  const hasActions = selectedActions.length > 0;
  if (!hasName && !hasConds && !hasActions) return null;

  const typeColors = {
    ESCALATION:{ bg:"#FEF2F2", text:"#991B1B", border:"#FECACA" },
    SUPPRESSION:{ bg:"#F0FDF4", text:"#166534", border:"#BBF7D0" },
    FLAG:{ bg:"#EFF6FF", text:"#1D4ED8", border:"#BFDBFE" },
  };
  const tc = typeColors[ruleType] || typeColors["FLAG"];

  const condText = conditions.filter(c => c.field && c.value).map((c,i) => {
    const meta = getFieldMeta(c.field);
    const label = meta?.label || c.field;
    const valStr = c.op === "between" ? `${c.value}–${c.value2||"?"} ${c.currency||""}` :
      c.unit ? `${c.value} ${c.unit}` :
      c.window ? `${c.value} within ${c.window}` :
      `${c.value}${c.currency?" "+c.currency:""}`;
    return `${i>0?"AND ":""}${label} ${c.op} ${valStr}`;
  }).join(" ");

  return (
    <div style={{background:"#0F172A",borderRadius:10,padding:18,marginTop:4}}>
      <div style={{fontSize:9,color:"#64748B",letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"monospace",marginBottom:10}}>Live preview</div>
      {hasName && (
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
          <span style={{fontSize:13,fontWeight:700,color:"#E2E8F0"}}>{name}</span>
          {ruleType && <span style={{fontSize:9,background:tc.bg,color:tc.text,border:`1px solid ${tc.border}`,padding:"2px 8px",borderRadius:20,fontFamily:"monospace"}}>{ruleType}</span>}
        </div>
      )}
      {hasConds && (
        <div style={{marginBottom:10}}>
          <div style={{fontSize:9,color:"#475569",marginBottom:6,fontFamily:"monospace"}}>CONDITIONS</div>
          <div style={{background:"#1E293B",borderRadius:7,padding:"10px 14px",fontSize:12,color:"#94A3B8",fontFamily:"monospace",lineHeight:1.8}}>{condText}</div>
        </div>
      )}
      {hasActions && (
        <div>
          <div style={{fontSize:9,color:"#475569",marginBottom:6,fontFamily:"monospace"}}>THEN</div>
          {selectedActions.map(aid => {
            const a = ACTIONS_CATALOG.find(x => x.id === aid);
            return a ? (
              <div key={aid} style={{fontSize:11,color:"#CBD5E1",display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:a.color,flexShrink:0,display:"inline-block"}}/>
                {a.label}
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

function RuleBuilder({ onClose }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [ruleType, setRuleType] = useState("ESCALATION");
  const [category, setCategory] = useState("Sanctions & watchlist");
  const [source, setSource] = useState("");
  const [logic, setLogic] = useState("ALL"); // ALL = AND, ANY = OR
  const [conditions, setConditions] = useState([{ id:1, field:"", op:"", value:"", value2:"", window:"30 days", unit:"months", currency:"USD" }]);
  const [selectedActions, setSelectedActions] = useState([]);
  const [rationale, setRationale] = useState("");
  const [saved, setSaved] = useState(false);
  const nextId = useRef(2);

  const addCondition = () => {
    setConditions(prev => [...prev, { id:nextId.current++, field:"", op:"", value:"", value2:"", window:"30 days", unit:"months", currency:"USD" }]);
  };
  const updateCondition = (id, updated) => setConditions(prev => prev.map(c => c.id===id ? updated : c));
  const removeCondition = (id) => setConditions(prev => prev.filter(c => c.id!==id));
  const toggleAction = (aid) => setSelectedActions(prev => prev.includes(aid) ? prev.filter(x=>x!==aid) : [...prev,aid]);

  const typeColors = {
    ESCALATION:{ bg:"#FEF2F2", text:"#991B1B", border:"#FECACA" },
    SUPPRESSION:{ bg:"#F0FDF4", text:"#166534", border:"#BBF7D0" },
    FLAG:{ bg:"#EFF6FF", text:"#1D4ED8", border:"#BFDBFE" },
  };

  const steps = ["Define rule","Build conditions","Set actions","Review & save"];
  const canNext = step===1 ? name.trim().length>0 :
                  step===2 ? conditions.some(c=>c.field&&c.value) :
                  step===3 ? selectedActions.length>0 : true;

  if (saved) return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.7)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
      <div style={{background:"#fff",borderRadius:14,padding:36,width:440,textAlign:"center",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{fontSize:40,marginBottom:16}}>✓</div>
        <div style={{fontSize:16,fontWeight:700,color:"#0F172A",marginBottom:8}}>Rule saved as draft</div>
        <div style={{fontSize:13,color:"#64748B",marginBottom:24}}>"{name}" is pending review. A senior analyst must approve it before activation.</div>
        <button onClick={onClose} style={{padding:"10px 28px",background:"#0F172A",color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:600,cursor:"pointer"}}>Back to rules library</button>
      </div>
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.7)",display:"flex",alignItems:"flex-start",justifyContent:"center",zIndex:100,paddingTop:32,overflowY:"auto"}}>
      <div style={{background:"#fff",borderRadius:14,width:720,maxWidth:"94%",boxShadow:"0 20px 60px rgba(0,0,0,0.35)",marginBottom:32}}>

        {/* Header */}
        <div style={{background:"#0F172A",borderRadius:"14px 14px 0 0",padding:"18px 24px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:10,color:"#64748B",letterSpacing:"0.12em",fontFamily:"monospace",marginBottom:2}}>RULE BUILDER</div>
            <div style={{fontSize:14,fontWeight:600,color:"#E2E8F0"}}>New screening rule</div>
          </div>
          <button onClick={onClose} style={{background:"#1E293B",border:"none",color:"#94A3B8",cursor:"pointer",borderRadius:6,padding:"6px 12px",fontSize:12}}>✕ Cancel</button>
        </div>

        {/* Step indicator */}
        <div style={{display:"flex",borderBottom:"1px solid #E2E8F0",padding:"0 24px"}}>
          {steps.map((s,i) => {
            const n=i+1; const active=step===n; const done=step>n;
            return (
              <div key={s} style={{display:"flex",alignItems:"center",paddingTop:14,paddingBottom:12,marginRight:4}}>
                <div style={{width:22,height:22,borderRadius:"50%",background:done?"#059669":active?"#0F172A":"#E2E8F0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:done||active?"#fff":"#94A3B8",marginRight:7,flexShrink:0}}>
                  {done ? "✓" : n}
                </div>
                <span style={{fontSize:11,color:active?"#0F172A":done?"#059669":"#94A3B8",fontWeight:active?600:400,whiteSpace:"nowrap"}}>{s}</span>
                {i<steps.length-1 && <div style={{width:24,height:1,background:"#E2E8F0",margin:"0 12px"}}/>}
              </div>
            );
          })}
        </div>

        <div style={{padding:24}}>

          {/* Step 1: Define */}
          {step===1 && (
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:18}}>Define the rule</div>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:6}}>Rule name <span style={{color:"#DC2626"}}>*</span></div>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Flag all transactions to newly incorporated offshore entities" style={{width:"100%",padding:"9px 12px",border:"1px solid #E2E8F0",borderRadius:8,fontSize:13,color:"#0F172A",boxSizing:"border-box"}} />
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:6}}>Rule type</div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {["ESCALATION","SUPPRESSION","FLAG"].map(t => {
                      const tc=typeColors[t]; const sel=ruleType===t;
                      return (
                        <div key={t} onClick={()=>setRuleType(t)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",border:`1px solid ${sel?tc.border:"#E2E8F0"}`,borderRadius:8,cursor:"pointer",background:sel?tc.bg:"#fff"}}>
                          <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${sel?tc.text:"#CBD5E1"}`,marginTop:1,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                            {sel && <div style={{width:6,height:6,borderRadius:"50%",background:tc.text}}/>}
                          </div>
                          <div>
                            <div style={{fontSize:11,fontWeight:600,color:sel?tc.text:"#374151",fontFamily:"monospace"}}>{t}</div>
                            <div style={{fontSize:10,color:"#94A3B8",marginTop:1}}>
                              {t==="ESCALATION"?"Force alert to higher risk tier":t==="SUPPRESSION"?"Auto-dismiss before analyst queue":"Add a risk signal without changing tier"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:6}}>Category</div>
                  <select value={category} onChange={e=>setCategory(e.target.value)} style={{width:"100%",padding:"8px 10px",border:"1px solid #E2E8F0",borderRadius:8,fontSize:12,color:"#0F172A",marginBottom:12}}>
                    {["Sanctions & watchlist","Jurisdiction risk","Transaction patterns","Counterparty behavior","PEP & individual","Trade-based ML","Auto-suppression"].map(c=><option key={c}>{c}</option>)}
                  </select>
                  <div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:6}}>Regulatory reference</div>
                  <input value={source} onChange={e=>setSource(e.target.value)} placeholder="e.g. FATF Typology 2023-AML-07" style={{width:"100%",padding:"8px 10px",border:"1px solid #E2E8F0",borderRadius:8,fontSize:12,color:"#0F172A",boxSizing:"border-box",marginBottom:12}} />
                  <div style={{fontSize:11,fontWeight:600,color:"#374151",marginBottom:6}}>Rationale</div>
                  <textarea value={rationale} onChange={e=>setRationale(e.target.value)} placeholder="Explain the regulatory or business basis for this rule..." style={{width:"100%",minHeight:80,border:"1px solid #E2E8F0",borderRadius:8,padding:"8px 10px",fontSize:12,color:"#0F172A",resize:"vertical",boxSizing:"border-box",fontFamily:"inherit"}} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Conditions */}
          {step===2 && (
            <div>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:2}}>Build conditions</div>
                  <div style={{fontSize:11,color:"#64748B"}}>Alert fires when conditions are met. Add multiple conditions with AND logic.</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:11,color:"#64748B"}}>Match</span>
                  <div style={{display:"flex",border:"1px solid #E2E8F0",borderRadius:7,overflow:"hidden"}}>
                    {["ALL","ANY"].map(l=>(
                      <button key={l} onClick={()=>setLogic(l)} style={{padding:"5px 12px",fontSize:10,fontWeight:600,border:"none",cursor:"pointer",background:logic===l?"#0F172A":"#fff",color:logic===l?"#fff":"#64748B",fontFamily:"monospace"}}>{l}</button>
                    ))}
                  </div>
                  <span style={{fontSize:11,color:"#64748B"}}>conditions</span>
                </div>
              </div>

              <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:10,padding:16,marginBottom:12}}>
                {conditions.map((c,i) => (
                  <ConditionRow key={c.id} cond={c} index={i} total={conditions.length} isFirst={i===0}
                    onChange={updated => updateCondition(c.id, updated)}
                    onRemove={() => removeCondition(c.id)} />
                ))}
                <button onClick={addCondition} style={{marginTop:6,padding:"6px 14px",background:"#fff",border:"1px dashed #CBD5E1",borderRadius:7,fontSize:11,color:"#64748B",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                  + Add condition
                </button>
              </div>

              <RulePreview name={name} ruleType={ruleType} conditions={conditions} selectedActions={selectedActions} />
            </div>
          )}

          {/* Step 3: Actions */}
          {step===3 && (
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:6}}>Set actions</div>
              <div style={{fontSize:11,color:"#64748B",marginBottom:18}}>What should happen when this rule fires? Select one or more actions.</div>

              {[
                { label:"Escalation actions", types:["ESCALATION"] },
                { label:"Suppression actions", types:["SUPPRESSION"] },
                { label:"Flag actions", types:["FLAG"] },
              ].map(group => {
                const groupActions = ACTIONS_CATALOG.filter(a => group.types.includes(a.type));
                return (
                  <div key={group.label} style={{marginBottom:16}}>
                    <div style={{fontSize:10,color:"#94A3B8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",fontFamily:"monospace",marginBottom:8}}>{group.label}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {groupActions.map(a => {
                        const sel = selectedActions.includes(a.id);
                        return (
                          <div key={a.id} onClick={()=>toggleAction(a.id)} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"10px 12px",border:`1px solid ${sel?"#0F172A":"#E2E8F0"}`,borderRadius:8,cursor:"pointer",background:sel?"#F8FAFC":"#fff"}}>
                            <div style={{width:14,height:14,borderRadius:3,border:`2px solid ${sel?"#0F172A":"#CBD5E1"}`,marginTop:1,flexShrink:0,background:sel?"#0F172A":"transparent",display:"flex",alignItems:"center",justifyContent:"center"}}>
                              {sel && <span style={{color:"#fff",fontSize:9,fontWeight:700}}>✓</span>}
                            </div>
                            <div>
                              <div style={{fontSize:11,fontWeight:600,color:"#0F172A"}}>{a.label}</div>
                              <div style={{fontSize:10,color:"#94A3B8",marginTop:1}}>{a.desc}</div>
                            </div>
                            <div style={{marginLeft:"auto",width:8,height:8,borderRadius:"50%",background:a.color,flexShrink:0,marginTop:3}}/>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <RulePreview name={name} ruleType={ruleType} conditions={conditions} selectedActions={selectedActions} />
            </div>
          )}

          {/* Step 4: Review */}
          {step===4 && (
            <div>
              <div style={{fontSize:13,fontWeight:600,color:"#0F172A",marginBottom:18}}>Review before saving</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                {[["Rule name",name],["Type",ruleType],["Category",category],["Reference",source||"—"],].map(([k,v])=>(
                  <div key={k} style={{background:"#F8FAFC",borderRadius:8,padding:"10px 14px"}}>
                    <div style={{fontSize:10,color:"#94A3B8",marginBottom:4}}>{k}</div>
                    <div style={{fontSize:12,fontWeight:600,color:"#0F172A",fontFamily:"monospace"}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:10,padding:16,marginBottom:14}}>
                <div style={{fontSize:10,color:"#64748B",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",fontFamily:"monospace",marginBottom:12}}>Conditions — {logic==="ALL"?"ALL must match":"ANY must match"}</div>
                {conditions.filter(c=>c.field&&c.value).map((c,i)=>{
                  const meta=getFieldMeta(c.field);
                  const valStr = c.op==="between"?`${c.value}–${c.value2||"?"} ${c.currency||""}`:c.unit?`${c.value} ${c.unit}`:c.window?`${c.value} within ${c.window}`:`${c.value}${c.currency?" "+c.currency:""}`;
                  return (
                    <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:i<conditions.filter(x=>x.field&&x.value).length-1?"1px solid #E2E8F0":"none"}}>
                      <span style={{fontSize:10,color:"#94A3B8",width:28,textAlign:"right",fontFamily:"monospace"}}>{i===0?"IF":"AND"}</span>
                      <span style={{fontSize:11,fontWeight:600,color:"#0F172A",background:"#fff",border:"1px solid #E2E8F0",padding:"2px 8px",borderRadius:5,fontFamily:"monospace"}}>{meta?.label||c.field}</span>
                      <span style={{fontSize:10,color:"#64748B"}}>{c.op}</span>
                      <span style={{fontSize:11,color:"#1D4ED8",background:"#EFF6FF",padding:"2px 8px",borderRadius:5,fontFamily:"monospace"}}>{valStr}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:10,padding:16,marginBottom:14}}>
                <div style={{fontSize:10,color:"#64748B",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",fontFamily:"monospace",marginBottom:10}}>Actions</div>
                {selectedActions.map(aid=>{
                  const a=ACTIONS_CATALOG.find(x=>x.id===aid);
                  return a?<div key={aid} style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#0F172A",marginBottom:6}}><span style={{width:7,height:7,borderRadius:"50%",background:a.color,flexShrink:0,display:"inline-block"}}/>{a.label}</div>:null;
                })}
              </div>
              {rationale && (
                <div style={{background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:10,padding:16,marginBottom:14}}>
                  <div style={{fontSize:10,color:"#64748B",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em",fontFamily:"monospace",marginBottom:8}}>Rationale</div>
                  <div style={{fontSize:12,color:"#374151",lineHeight:1.6}}>{rationale}</div>
                </div>
              )}
              <div style={{background:"#FFFBEB",border:"1px solid #FDE68A",borderRadius:8,padding:"10px 14px",fontSize:11,color:"#92400E"}}>
                ⚠ This rule will be saved as <strong>draft</strong>. A senior analyst must review and activate it before it affects live screening.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div style={{display:"flex",justifyContent:"space-between",marginTop:20,paddingTop:16,borderTop:"1px solid #F1F5F9"}}>
            <button onClick={()=>step>1?setStep(s=>s-1):onClose()} style={{padding:"9px 18px",background:"#F8FAFC",color:"#374151",border:"1px solid #E2E8F0",borderRadius:8,fontSize:12,cursor:"pointer"}}>
              {step===1?"Cancel":"← Back"}
            </button>
            <button onClick={()=>step<4?setStep(s=>s+1):setSaved(true)} disabled={!canNext} style={{padding:"9px 22px",background:canNext?"#0F172A":"#E2E8F0",color:canNext?"#fff":"#94A3B8",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:canNext?"pointer":"not-allowed"}}>
              {step===4?"Save as draft →":"Next →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RulesEngine() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState("All");
  const [selectedRule, setSelectedRule] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [search, setSearch] = useState("");

  const categories = ["All", ...Array.from(new Set(RULES_LIBRARY.map(r => r.category)))];
  const types = ["All", "ESCALATION", "SUPPRESSION", "FLAG"];
  const statusColors = {
    active: { bg: "#F0FDF4", text: "#166534", dot: "#16A34A" },
    inactive: { bg: "#F9FAFB", text: "#6B7280", dot: "#9CA3AF" },
    draft: { bg: "#FFFBEB", text: "#92400E", dot: "#D97706" },
  };
  const typeColors = {
    ESCALATION: { bg: "#FEF2F2", text: "#991B1B", border: "#FECACA" },
    SUPPRESSION: { bg: "#F0FDF4", text: "#166534", border: "#BBF7D0" },
    FLAG: { bg: "#EFF6FF", text: "#1D4ED8", border: "#BFDBFE" },
    CUSTOM_SCREEN: { bg: "#FAF5FF", text: "#7C3AED", border: "#E9D5FF" },
  };
  const sourceColors = {
    "FATF": "#7C3AED", "CBJ": "#0891B2", "OFAC": "#DC2626",
    "EU Regulation 2016/1686": "#1D4ED8", "UN SC Resolution 1267": "#1D4ED8",
    "CBJ Circular AML/2022-04": "#0891B2", "AI-suggested": "#059669",
    "Internal": "#64748B", "System": "#64748B",
  };
  const getSourceColor = (src) => {
    for (const key of Object.keys(sourceColors)) {
      if (src.startsWith(key)) return sourceColors[key];
    }
    return "#64748B";
  };

  const filtered = RULES_LIBRARY.filter(r => {
    const matchCat = selectedCategory === "All" || r.category === selectedCategory;
    const matchType = selectedType === "All" || r.type === selectedType;
    const matchSearch = search === "" || r.name.toLowerCase().includes(search.toLowerCase()) || r.rationale.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchType && matchSearch;
  });

  const stats = {
    active: RULES_LIBRARY.filter(r => r.status === "active").length,
    suppressed30d: RULES_LIBRARY.reduce((a, r) => a + r.suppressed30d, 0),
    fires30d: RULES_LIBRARY.reduce((a, r) => a + r.fires30d, 0),
    draft: RULES_LIBRARY.filter(r => r.status === "draft").length,
  };

  if (selectedRule) return <RuleDetail rule={selectedRule} onBack={() => setSelectedRule(null)} typeColors={typeColors} statusColors={statusColors} getSourceColor={getSourceColor} />;

  return (
    <div style={{ padding: 24, flex: 1, overflowY: "auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 700, color: "#0F172A" }}>Rules engine</div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
            Screening logic library · {RULES_LIBRARY.length} rules · suppression, escalation and custom flags
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowBuilder(true)} style={{ padding: "8px 14px", background: "#0F172A", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            + Add rule
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Active rules", val: stats.active, accent: "#0F172A" },
          { label: "Alerts escalated (30d)", val: stats.fires30d, accent: "#DC2626" },
          { label: "Alerts suppressed (30d)", val: stats.suppressed30d, accent: "#059669" },
          { label: "Pending approval", val: stats.draft, accent: "#D97706" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: "#64748B", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 7 }}>{s.label}</div>
            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "monospace", color: s.accent, lineHeight: 1 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search rules..."
          style={{ flex: 1, padding: "7px 12px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, color: "#0F172A", background: "#fff" }}
        />
        <div style={{ display: "flex", gap: 5 }}>
          {types.map(t => (
            <button key={t} onClick={() => setSelectedType(t)} style={{ padding: "5px 11px", borderRadius: 20, border: "1px solid", fontSize: 10, cursor: "pointer", fontFamily: "monospace", background: selectedType === t ? "#0F172A" : "#fff", color: selectedType === t ? "#fff" : "#64748B", borderColor: selectedType === t ? "#0F172A" : "#E2E8F0" }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 5, marginBottom: 16, flexWrap: "wrap" }}>
        {categories.map(c => (
          <button key={c} onClick={() => setSelectedCategory(c)} style={{ padding: "4px 12px", borderRadius: 20, border: "1px solid", fontSize: 10, cursor: "pointer", background: selectedCategory === c ? "#334155" : "#fff", color: selectedCategory === c ? "#fff" : "#64748B", borderColor: selectedCategory === c ? "#334155" : "#E2E8F0" }}>
            {c === "All" ? `All (${RULES_LIBRARY.length})` : c}
          </button>
        ))}
      </div>

      {/* Rules table */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 110px 120px 80px 80px 80px 80px", background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
          {["ID", "Rule name + rationale", "Type", "Category", "Status", "Fires 30d", "Suppressed", "Accuracy"].map(h => (
            <div key={h} style={{ padding: "9px 12px", fontSize: 9, color: "#64748B", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "monospace" }}>{h}</div>
          ))}
        </div>

        {filtered.map((r, i) => {
          const tc = typeColors[r.type] || {};
          const sc = statusColors[r.status];
          return (
            <div key={r.id}
              onClick={() => setSelectedRule(r)}
              style={{ display: "grid", gridTemplateColumns: "60px 1fr 110px 120px 80px 80px 80px 80px", borderBottom: i < filtered.length - 1 ? "1px solid #F1F5F9" : "none", cursor: "pointer", background: "#fff", alignItems: "start" }}
              onMouseEnter={e => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={e => e.currentTarget.style.background = "#fff"}
            >
              <div style={{ padding: "13px 12px", fontSize: 9, color: "#94A3B8", fontFamily: "monospace" }}>{r.id}</div>
              <div style={{ padding: "13px 12px" }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", marginBottom: 3, lineHeight: 1.3 }}>{r.name}</div>
                <div style={{ fontSize: 10, color: "#94A3B8", lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{r.rationale}</div>
                <div style={{ marginTop: 5, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: 9, color: getSourceColor(r.source), background: `${getSourceColor(r.source)}15`, padding: "1px 7px", borderRadius: 20, border: `1px solid ${getSourceColor(r.source)}30` }}>{r.source.split("—")[0].trim()}</span>
                  {!r.editable && <span style={{ fontSize: 9, color: "#64748B" }}>🔒 locked</span>}
                </div>
              </div>
              <div style={{ padding: "13px 12px" }}>
                <span style={{ fontSize: 9, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`, padding: "2px 8px", borderRadius: 20, fontFamily: "monospace" }}>{r.type}</span>
              </div>
              <div style={{ padding: "13px 12px", fontSize: 10, color: "#64748B" }}>{r.category}</div>
              <div style={{ padding: "13px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: sc.dot }} />
                  <span style={{ fontSize: 9, color: sc.text }}>{r.status}</span>
                </div>
              </div>
              <div style={{ padding: "13px 12px", fontSize: 12, fontWeight: 700, color: r.fires30d > 0 ? "#DC2626" : "#94A3B8", fontFamily: "monospace" }}>{r.fires30d}</div>
              <div style={{ padding: "13px 12px", fontSize: 12, fontWeight: 700, color: r.suppressed30d > 0 ? "#059669" : "#94A3B8", fontFamily: "monospace" }}>{r.suppressed30d}</div>
              <div style={{ padding: "13px 12px", fontSize: 12, fontWeight: 700, color: "#0F172A", fontFamily: "monospace" }}>
                {r.accuracy !== null ? `${r.accuracy}%` : <span style={{ color: "#94A3B8" }}>—</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Rule builder modal */}
      {showBuilder && (
        <RuleBuilder onClose={() => setShowBuilder(false)} />
      )}
    </div>
  );
}

function RuleDetail({ rule, onBack, typeColors, statusColors, getSourceColor }) {
  const [active, setActive] = useState(rule.status === "active");
  const tc = typeColors[rule.type] || {};
  const sc = statusColors[rule.status];
  return (
    <div style={{ flex: 1, overflowY: "auto", padding: 26 }}>
      <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#64748B", marginBottom: 16, padding: 0 }}>← Back to rules</button>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 5 }}>{rule.name}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 10, background: tc.bg, color: tc.text, border: `1px solid ${tc.border}`, padding: "2px 9px", borderRadius: 20, fontFamily: "monospace" }}>{rule.type}</span>
            <span style={{ fontSize: 10, color: sc.text, background: sc.bg, padding: "2px 9px", borderRadius: 20 }}>{rule.status}</span>
            <span style={{ fontSize: 10, color: getSourceColor(rule.source) }}>{rule.source}</span>
            <span style={{ fontSize: 10, color: "#94A3B8", fontFamily: "monospace" }}>{rule.id}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {rule.editable && (
            <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 12, color: "#374151" }}>
              <div style={{ width: 36, height: 20, borderRadius: 10, background: active ? "#059669" : "#E2E8F0", position: "relative", transition: "background 0.2s", cursor: "pointer" }} onClick={() => setActive(!active)}>
                <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2, left: active ? 18 : 2, transition: "left 0.2s" }} />
              </div>
              {active ? "Active" : "Inactive"}
            </label>
          )}
          {!rule.editable && <span style={{ fontSize: 11, color: "#94A3B8" }}>🔒 System rule — read only</span>}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
        {[
          { label: "Fires (30d)", val: rule.fires30d, accent: rule.fires30d > 0 ? "#DC2626" : "#94A3B8" },
          { label: "Suppressed (30d)", val: rule.suppressed30d, accent: rule.suppressed30d > 0 ? "#059669" : "#94A3B8" },
          { label: "Accuracy", val: rule.accuracy !== null ? `${rule.accuracy}%` : "—", accent: "#0F172A" },
          { label: "Last modified", val: rule.lastModified, accent: "#64748B" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ fontSize: 9, color: "#64748B", letterSpacing: "0.07em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 7 }}>{s.label}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "monospace", color: s.accent, lineHeight: 1 }}>{s.val}</div>
          </div>
        ))}
      </div>

      {/* Rationale */}
      <div style={{ background: "#0F172A", borderRadius: 10, padding: 18, marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 8 }}>Regulatory rationale</div>
        <div style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.7 }}>{rule.rationale}</div>
      </div>

      {/* Conditions */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: 18, marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 14 }}>Conditions — IF all of the following are true</div>
        {rule.conditions.map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < rule.conditions.length - 1 ? "1px solid #F1F5F9" : "none" }}>
            {i > 0 && <span style={{ fontSize: 10, color: "#94A3B8", width: 24, textAlign: "right", flexShrink: 0 }}>AND</span>}
            {i === 0 && <span style={{ fontSize: 10, color: "#94A3B8", width: 24, textAlign: "right", flexShrink: 0 }}>IF</span>}
            <span style={{ fontSize: 12, fontWeight: 600, color: "#0F172A", background: "#F8FAFC", padding: "3px 10px", borderRadius: 6, fontFamily: "monospace" }}>{c.field}</span>
            <span style={{ fontSize: 11, color: "#64748B" }}>{c.op}</span>
            <span style={{ fontSize: 12, color: "#1D4ED8", background: "#EFF6FF", padding: "3px 10px", borderRadius: 6, fontFamily: "monospace" }}>{c.value}</span>
          </div>
        ))}
      </div>

      {/* Action */}
      <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: 18, marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: 10 }}>Action — THEN</div>
        <div style={{ fontSize: 13, color: "#0F172A", background: "#F8FAFC", padding: "10px 14px", borderRadius: 8, fontFamily: "monospace", lineHeight: 1.6 }}>{rule.action}</div>
      </div>

      {rule.editable && (
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ flex: 1, padding: "10px 0", background: "#0F172A", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✎ Edit rule</button>
          <button style={{ padding: "10px 16px", background: "#FEF2F2", color: "#991B1B", border: "1px solid #FECACA", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>✕ Deactivate</button>
          <button style={{ padding: "10px 16px", background: "#F8FAFC", color: "#374151", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>⬇ Export</button>
        </div>
      )}
    </div>
  );
}
// ─── MOCK SWIFT DATA ─────────────────────────────────────────────────────────
const MOCK_MT103=`:20:TXN20240115001\n:23B:CRED\n:32A:240115USD47000,\n:50K:/JO45ARAB0000012345678901\nAL-RASHID TRADING CORP\nAMMA JORDAN\n:52A:ARABJOABXXX\n:53A:CITIUSNYWXXX\n:56A:ARABAEADXXX\n:57A:ARABAEADXXX\n:59:/AE070330000010012345678\nAL-RASHID GENERAL TRADING LLC\nDUBAI UAE\n:70:INVOICE REF INV-2024-0089\n:71A:OUR`;
const MOCK_MT202=`:20:IFT20240115002\n:21:REF20240114099\n:32A:240115USD125000,\n:52A:ARABJOABXXX\n:53A:BANAPAPAXX1\n:58A:BANAPAPAXX1\n:72:/BNF/MERIDIAN CAPITAL HOLDINGS SA\n//PANAMA CITY PANAMA`;
const MOCK_MX_PAIN=`<?xml version="1.0"?>\n<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.09">\n  <CstmrCdtTrfInitn>\n    <GrpHdr><MsgId>MSG20240115003</MsgId><CreDtTm>2024-01-15T09:45:00</CreDtTm></GrpHdr>\n    <PmtInf><CdtTrfTxInf>\n      <Amt><InstdAmt Ccy="USD">9800</InstdAmt></Amt>\n      <Cdtr><Nm>Mohammed Tariq Al-Zawahiri</Nm><PstlAdr><Ctry>PK</Ctry></PstlAdr></Cdtr>\n      <CdtrAcct><Id><IBAN>PK36MCBL0200006871234567</IBAN></Id></CdtrAcct>\n      <CdtrAgt><FinInstnId><BICFI>MCBLPKKA</BICFI></FinInstnId></CdtrAgt>\n      <RmtInf><Ustrd>Family remittance FM-2024-0041</Ustrd></RmtInf>\n    </CdtTrfTxInf></PmtInf>\n  </CstmrCdtTrfInitn>\n</Document>`;
const MOCK_BLACKLIST_CSV=`entity_name,entity_type,id_number,nationality,reason,added_by,added_date\nAl-Rashid Trading Corp,corporate,,JO,Fraud cheque bouncing x3,Risk Dept,2023-11-15\nKhalid Omar Nabulsi,individual,JO-8874321,Jordanian,Suspicious activity,Compliance,2023-09-02\nFreeport Solutions Ltd,corporate,,VG,Shell company failed EDD,Compliance,2024-01-03\nAhmed Bassam Al-Zeer,individual,JO-5523109,Jordanian,Internal fraud employee,HR/Legal,2023-06-18\nSunrise Import Export,corporate,,SY,Sanctions adjacency,Compliance,2023-12-01`;

function PipelineProgress({phases,active,progress,done,result}){
  return(
    <div style={{background:"#0F172A",borderRadius:12,padding:20,marginBottom:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{fontSize:12,fontWeight:600,color:"#E2E8F0"}}>Processing pipeline</div>
        <div style={{fontSize:11,color:"#38BDF8",fontFamily:"monospace"}}>{Math.round(progress)}%</div>
      </div>
      <div style={{background:"#1E293B",borderRadius:4,height:5,marginBottom:14}}>
        <div style={{width:`${progress}%`,background:done?"#10B981":"#38BDF8",height:"100%",borderRadius:4,transition:"width 0.35s ease"}}/>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:5}}>
        {phases.map((ph,i)=>{
          const isDone=progress>=(ph.pct+12); const isCurrent=active===i;
          return(
            <div key={i} style={{display:"flex",alignItems:"center",gap:10,opacity:progress<ph.pct?0.3:1,transition:"opacity 0.4s"}}>
              <div style={{width:14,height:14,borderRadius:"50%",background:isDone?"#059669":isCurrent?"#38BDF8":"#1E293B",border:`1px solid ${isDone?"#059669":isCurrent?"#38BDF8":"#334155"}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontSize:8,color:"#fff",fontWeight:700}}>
                {isDone?"✓":isCurrent?"▪":""}
              </div>
              <div style={{fontSize:10,color:isDone?"#64748B":isCurrent?"#E2E8F0":"#334155",fontFamily:"monospace"}}>{ph.label}</div>
            </div>
          );
        })}
      </div>
      {done&&result&&(
        <div style={{marginTop:12,background:"#052e16",border:"1px solid #166534",borderRadius:8,padding:"9px 14px",fontSize:12,color:"#10B981",fontWeight:600}}>{result.title}<div style={{fontSize:10,color:"#166534",marginTop:2,fontWeight:400}}>{result.sub}</div></div>
      )}
    </div>
  );
}

function SwiftMTImporter(){
  const [step,setStep]=useState("idle");
  const [msgType,setMsgType]=useState("MT103");
  const [progress,setProgress]=useState(0);
  const [activePhase,setActivePhase]=useState(0);
  const [confirmed,setConfirmed]=useState(false);

  const MT103_FIELDS=[
    {tag:":20:",label:"Transaction reference",value:"TXN20240115001",risk:false},
    {tag:":32A:",label:"Value date / currency / amount",value:"2024-01-15 · USD 47,000",risk:false},
    {tag:":50K:",label:"Ordering customer",value:"Al-Rashid Trading Corp, Amman JO",risk:false},
    {tag:":52A:",label:"Ordering institution",value:"ARABJOABXXX — Arab Bank Jordan",risk:false},
    {tag:":53A:",label:"Sender's correspondent",value:"CITIUSNYWXXX — Citibank New York",risk:false},
    {tag:":56A:",label:"Intermediary institution",value:"ARABAEADXXX — Arab Bank UAE",risk:false},
    {tag:":57A:",label:"Account with institution",value:"ARABAEADXXX — Arab Bank UAE",risk:false},
    {tag:":59:",label:"Beneficiary",value:"AL-RASHID GENERAL TRADING LLC · AE0703300000...",risk:true,riskNote:"94% match EU Consolidated List EU-2019-0342"},
    {tag:":70:",label:"Remittance info",value:"INVOICE REF INV-2024-0089 / GOODS SUPPLY",risk:false},
    {tag:":71A:",label:"Charges",value:"OUR",risk:false},
  ];
  const MT202_FIELDS=[
    {tag:":20:",label:"Transaction reference",value:"IFT20240115002",risk:false},
    {tag:":21:",label:"Related reference",value:"REF20240114099",risk:false},
    {tag:":32A:",label:"Value date / currency / amount",value:"2024-01-15 · USD 125,000",risk:false},
    {tag:":52A:",label:"Ordering institution",value:"ARABJOABXXX — Arab Bank Jordan",risk:false},
    {tag:":53A:",label:"Sender's correspondent",value:"BANAPAPAXX1 — Banco Nacional Panama",risk:true,riskNote:"Panama — monitored jurisdiction CBJ Circular 10/2022"},
    {tag:":58A:",label:"Beneficiary institution",value:"BANAPAPAXX1 — Banco Nacional Panama",risk:true,riskNote:"High-risk correspondent"},
    {tag:":72:",label:"Sender to receiver info",value:"Meridian Capital Holdings SA, Panama City",risk:true,riskNote:"Shell company indicators"},
  ];

  const PHASES=[
    {pct:0,  label:"Reading file — detecting format"},
    {pct:14, label:"Parsing MT field tags"},
    {pct:28, label:"Extracting structured fields"},
    {pct:42, label:"Resolving BIC codes"},
    {pct:56, label:"Name screening — OpenSanctions + CBJ"},
    {pct:70, label:"Jurisdiction risk check"},
    {pct:84, label:"AI scoring — Ollama Mistral v1.2"},
    {pct:100,label:"Complete"},
  ];

  const HISTORY=[
    {id:"SWIFT-20240115-001",type:"MT103",file:"swift_mt103_0800.txt",msgs:14,alerts:3,time:"08:02:11",status:"complete"},
    {id:"SWIFT-20240114-004",type:"MT202",file:"swift_mt202_1600.txt",msgs:6,alerts:1,time:"16:01:44",status:"complete"},
    {id:"SWIFT-20240114-003",type:"MT103",file:"swift_mt103_0900.txt",msgs:22,alerts:5,time:"09:01:55",status:"complete"},
    {id:"SWIFT-20240113-002",type:"MT103",file:"swift_mt103_1200.txt",msgs:18,alerts:2,time:"12:03:01",status:"warning"},
  ];

  const simulate=()=>{
    setStep("parsing"); setProgress(0); setActivePhase(0); setConfirmed(false);
    let pi=0;
    const iv=setInterval(()=>{
      if(pi>=PHASES.length){clearInterval(iv);setStep("preview");return;}
      setActivePhase(pi); setProgress(PHASES[pi].pct); pi++;
    },480);
  };

  const fields=msgType==="MT103"?MT103_FIELDS:MT202_FIELDS;
  const riskCount=fields.filter(f=>f.risk).length;

  return(
    <div>
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:18,marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:600,color:"#0F172A",marginBottom:12}}>Message format</div>
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          {["MT103","MT202","MT202 COV","MT900","MT910"].map(t=>(
            <button key={t} onClick={()=>{setMsgType(t);setStep("idle");setConfirmed(false);}} style={{padding:"5px 12px",borderRadius:8,border:"1px solid",fontSize:11,cursor:"pointer",fontFamily:"monospace",background:msgType===t?"#0F172A":"#fff",color:msgType===t?"#fff":"#64748B",borderColor:msgType===t?"#0F172A":"#E2E8F0"}}>{t}</button>
          ))}
        </div>
        <div style={{background:"#F8FAFC",borderRadius:8,padding:"9px 12px",fontSize:11,color:"#64748B",marginBottom:14,lineHeight:1.6}}>
          {msgType==="MT103"&&"MT103 — Single customer credit transfer. Extracts: :20 ref, :32A date/amount/currency, :50 originator, :52–57 correspondent chain, :59 beneficiary name+account, :70 remittance info."}
          {msgType==="MT202"&&"MT202 — Financial institution transfer. Extracts: ordering bank, correspondent chain, beneficiary institution, :72 sender-to-receiver narrative."}
          {msgType==="MT202 COV"&&"MT202 COV — Cover payment. Extracts both the cover chain and the underlying customer transfer details — critical for correspondent AML analysis."}
          {msgType==="MT900"&&"MT900 — Debit confirmation. Lower standalone risk but used for pattern analysis against correspondent account velocity."}
          {msgType==="MT910"&&"MT910 — Credit confirmation. Used with MT900 for reconciliation and velocity pattern analysis."}
        </div>
        <div onClick={()=>step==="idle"&&simulate()} style={{border:"2px dashed #E2E8F0",borderRadius:10,padding:"22px 20px",textAlign:"center",cursor:step==="idle"?"pointer":"default",background:step==="idle"?"#FAFAFA":"#F0FDF4"}}
          onMouseEnter={e=>{if(step==="idle")e.currentTarget.style.borderColor="#0F172A";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#E2E8F0";}}>
          {step==="idle"
            ?<><div style={{fontSize:24,marginBottom:6}}>⇥</div><div style={{fontSize:12,fontWeight:600,color:"#0F172A",marginBottom:3}}>Drop {msgType} file or click to simulate</div><div style={{fontSize:10,color:"#94A3B8"}}>Accepts .txt, .fin, .swift · multiple messages per file</div></>
            :<div style={{fontSize:11,color:"#059669",fontWeight:600}}>✓ {msgType}_SWIFT_20240115.fin loaded</div>
          }
        </div>
        {step==="idle"&&(
          <div style={{marginTop:12}}>
            <div style={{fontSize:9,color:"#94A3B8",marginBottom:5,fontFamily:"monospace"}}>Raw message preview:</div>
            <textarea readOnly value={msgType==="MT103"?MOCK_MT103:MOCK_MT202} style={{width:"100%",height:120,border:"1px solid #E2E8F0",borderRadius:7,padding:10,fontSize:9,color:"#475569",fontFamily:"monospace",background:"#F8FAFC",resize:"none",boxSizing:"border-box"}}/>
          </div>
        )}
      </div>

      {step==="parsing"&&<PipelineProgress phases={PHASES} active={activePhase} progress={progress} done={false} result={null}/>}

      {(step==="preview"||step==="done")&&(
        <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden",marginBottom:14}}>
          <div style={{padding:"11px 16px",background:"#F8FAFC",borderBottom:"1px solid #E2E8F0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:12,fontWeight:600,color:"#0F172A"}}>Extracted fields — {msgType}</div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {riskCount>0&&<span style={{fontSize:10,background:"#FEF2F2",color:"#991B1B",border:"1px solid #FECACA",padding:"2px 9px",borderRadius:20}}>⚠ {riskCount} risk signal{riskCount>1?"s":""}</span>}
              <span style={{fontSize:9,color:"#94A3B8"}}>1 message</span>
            </div>
          </div>
          {fields.map((f,i)=>(
            <div key={f.tag} style={{display:"grid",gridTemplateColumns:"70px 190px 1fr",borderBottom:i<fields.length-1?"1px solid #F1F5F9":"none",background:f.risk?"#FFF7F7":"#fff",alignItems:"start"}}>
              <div style={{padding:"9px 12px",fontSize:9,color:"#94A3B8",fontFamily:"monospace",fontWeight:600}}>{f.tag}</div>
              <div style={{padding:"9px 12px",fontSize:10,color:"#475569"}}>{f.label}</div>
              <div style={{padding:"9px 12px"}}>
                <div style={{fontSize:11,color:f.risk?"#991B1B":"#0F172A",fontFamily:"monospace"}}>{f.value}</div>
                {f.risk&&<div style={{fontSize:9,color:"#DC2626",marginTop:2}}>⚠ {f.riskNote}</div>}
              </div>
            </div>
          ))}
          {!confirmed&&<div style={{padding:12,borderTop:"1px solid #E2E8F0",display:"flex",gap:8}}>
            <button onClick={()=>setConfirmed(true)} style={{flex:1,padding:"8px 0",background:"#0F172A",color:"#fff",border:"none",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer"}}>Confirm — generate {riskCount} alert{riskCount!==1?"s":""} →</button>
            <button onClick={()=>{setStep("idle");setConfirmed(false);}} style={{padding:"8px 14px",background:"#F8FAFC",color:"#374151",border:"1px solid #E2E8F0",borderRadius:8,fontSize:11,cursor:"pointer"}}>Discard</button>
          </div>}
          {confirmed&&<div style={{padding:12,borderTop:"1px solid #E2E8F0",background:"#F0FDF4",fontSize:11,color:"#166534",fontWeight:600}}>✓ {riskCount} alert{riskCount!==1?"s":""} created and added to queue — AI scoring in progress</div>}
        </div>
      )}

      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",background:"#F8FAFC",borderBottom:"1px solid #E2E8F0",fontSize:11,fontWeight:600,color:"#64748B"}}>Import history</div>
        <div style={{display:"grid",gridTemplateColumns:"150px 70px 1fr 80px 70px 90px 90px",background:"#F8FAFC",borderBottom:"1px solid #E2E8F0"}}>
          {["Batch ID","Type","File","Messages","Alerts","Time","Status"].map(h=><div key={h} style={{padding:"7px 12px",fontSize:9,color:"#64748B",fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",fontFamily:"monospace"}}>{h}</div>)}
        </div>
        {HISTORY.map((h,i)=>(
          <div key={h.id} style={{display:"grid",gridTemplateColumns:"150px 70px 1fr 80px 70px 90px 90px",borderBottom:i<HISTORY.length-1?"1px solid #F1F5F9":"none",alignItems:"center"}}>
            <div style={{padding:"9px 12px",fontSize:9,color:"#475569",fontFamily:"monospace"}}>{h.id}</div>
            <div style={{padding:"9px 12px"}}><span style={{fontSize:9,fontFamily:"monospace",background:"#F1F5F9",color:"#374151",padding:"2px 7px",borderRadius:4}}>{h.type}</span></div>
            <div style={{padding:"9px 12px",fontSize:10,color:"#374151"}}>{h.file}</div>
            <div style={{padding:"9px 12px",fontSize:11,fontFamily:"monospace",color:"#0F172A",fontWeight:600}}>{h.msgs}</div>
            <div style={{padding:"9px 12px",fontSize:11,fontFamily:"monospace",color:h.alerts>0?"#DC2626":"#94A3B8",fontWeight:h.alerts>0?700:400}}>{h.alerts}</div>
            <div style={{padding:"9px 12px",fontSize:9,color:"#94A3B8",fontFamily:"monospace"}}>{h.time}</div>
            <div style={{padding:"9px 12px"}}><span style={{fontSize:9,background:h.status==="warning"?"#FFF7ED":"#F0FDF4",color:h.status==="warning"?"#9A3412":"#166534",padding:"2px 8px",borderRadius:20}}>{h.status==="warning"?"⚠ warning":"✓ complete"}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SwiftMXImporter(){
  const [step,setStep]=useState("idle");
  const [progress,setProgress]=useState(0);
  const [activePhase,setActivePhase]=useState(0);
  const [confirmed,setConfirmed]=useState(false);

  const MX_FIELDS=[
    {path:"GrpHdr/MsgId",label:"Message ID",value:"MSG20240115003",risk:false},
    {path:"GrpHdr/CreDtTm",label:"Creation date/time",value:"2024-01-15T09:45:00",risk:false},
    {path:"InstdAmt @Ccy",label:"Amount / currency",value:"USD 9,800",risk:false},
    {path:"Cdtr/Nm",label:"Creditor name",value:"Mohammed Tariq Al-Zawahiri",risk:true,riskNote:"78% match — UN Consolidated List (fuzzy)"},
    {path:"Cdtr/PstlAdr/Ctry",label:"Creditor country",value:"PK — Pakistan",risk:true,riskNote:"Elevated risk — FATF 2022 assessment"},
    {path:"CdtrAcct/Id/IBAN",label:"Creditor IBAN",value:"PK36MCBL0200006871234567",risk:false},
    {path:"CdtrAgt/BICFI",label:"Creditor agent BIC",value:"MCBLPKKA — MCB Bank Ltd Pakistan",risk:false},
    {path:"RmtInf/Ustrd",label:"Remittance info",value:"Family remittance ref FM-2024-0041",risk:false},
  ];

  const PHASES=[
    {pct:0,  label:"Validating XML schema — ISO 20022 pain.001"},
    {pct:13, label:"Parsing namespace and message type"},
    {pct:26, label:"Extracting payment instruction blocks"},
    {pct:40, label:"Mapping ISO 20022 fields to canonical schema"},
    {pct:54, label:"BIC resolution — MCBLPKKA"},
    {pct:68, label:"Name screening — Mohammed Tariq Al-Zawahiri"},
    {pct:82, label:"Jurisdiction risk check — PK"},
    {pct:100,label:"Complete"},
  ];

  const simulate=()=>{
    setStep("parsing"); setProgress(0); setActivePhase(0); setConfirmed(false);
    let pi=0;
    const iv=setInterval(()=>{
      if(pi>=PHASES.length){clearInterval(iv);setStep("preview");return;}
      setActivePhase(pi); setProgress(PHASES[pi].pct); pi++;
    },450);
  };

  return(
    <div>
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:18,marginBottom:14}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:600,color:"#0F172A"}}>ISO 20022 MX messages</div>
          <span style={{fontSize:10,background:"#EFF6FF",color:"#1D4ED8",border:"1px solid #BFDBFE",padding:"2px 8px",borderRadius:20}}>New SWIFT standard</span>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
          {[["pain.001","Credit transfer init"],["pain.002","Payment status"],["camt.053","Bank statement"],["camt.054","Debit/credit notif"],["pacs.008","Customer credit"],["pacs.009","FI transfer"]].map(([t,d])=>(
            <div key={t} style={{padding:"5px 10px",border:"1px solid #E2E8F0",borderRadius:7,background:"#F8FAFC"}}>
              <div style={{fontSize:10,fontFamily:"monospace",color:"#0F172A",fontWeight:600}}>{t}</div>
              <div style={{fontSize:9,color:"#94A3B8"}}>{d}</div>
            </div>
          ))}
        </div>
        <div onClick={()=>step==="idle"&&simulate()} style={{border:"2px dashed #E2E8F0",borderRadius:10,padding:"20px",textAlign:"center",cursor:step==="idle"?"pointer":"default",background:"#FAFAFA"}}
          onMouseEnter={e=>{if(step==="idle")e.currentTarget.style.borderColor="#0F172A";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#E2E8F0";}}>
          {step==="idle"
            ?<><div style={{fontSize:22,marginBottom:5}}>⇥</div><div style={{fontSize:12,fontWeight:600,color:"#0F172A",marginBottom:3}}>Drop MX XML file or click to simulate pain.001</div><div style={{fontSize:10,color:"#94A3B8"}}>.xml · schema validated against ISO 20022 XSD</div></>
            :<div style={{fontSize:11,color:"#059669",fontWeight:600}}>✓ pain001_MSG20240115003.xml loaded</div>
          }
        </div>
        {step==="idle"&&(
          <div style={{marginTop:10}}>
            <div style={{fontSize:9,color:"#94A3B8",marginBottom:4,fontFamily:"monospace"}}>Sample MX (pain.001):</div>
            <textarea readOnly value={MOCK_MX_PAIN} style={{width:"100%",height:110,border:"1px solid #E2E8F0",borderRadius:7,padding:10,fontSize:9,color:"#475569",fontFamily:"monospace",background:"#F8FAFC",resize:"none",boxSizing:"border-box"}}/>
          </div>
        )}
      </div>

      {step==="parsing"&&<PipelineProgress phases={PHASES} active={activePhase} progress={progress} done={false} result={null}/>}

      {(step==="preview"||step==="done")&&(
        <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden",marginBottom:14}}>
          <div style={{padding:"11px 16px",background:"#F8FAFC",borderBottom:"1px solid #E2E8F0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:12,fontWeight:600,color:"#0F172A"}}>Extracted fields — pain.001 / ISO 20022</div>
            <span style={{fontSize:10,background:"#FEF2F2",color:"#991B1B",border:"1px solid #FECACA",padding:"2px 9px",borderRadius:20}}>⚠ 2 risk signals</span>
          </div>
          {MX_FIELDS.map((f,i)=>(
            <div key={f.path} style={{display:"grid",gridTemplateColumns:"180px 170px 1fr",borderBottom:i<MX_FIELDS.length-1?"1px solid #F1F5F9":"none",background:f.risk?"#FFF7F7":"#fff",alignItems:"start"}}>
              <div style={{padding:"9px 12px",fontSize:9,color:"#94A3B8",fontFamily:"monospace"}}>{f.path}</div>
              <div style={{padding:"9px 12px",fontSize:10,color:"#475569"}}>{f.label}</div>
              <div style={{padding:"9px 12px"}}>
                <div style={{fontSize:11,color:f.risk?"#991B1B":"#0F172A",fontFamily:"monospace"}}>{f.value}</div>
                {f.risk&&<div style={{fontSize:9,color:"#DC2626",marginTop:2}}>⚠ {f.riskNote}</div>}
              </div>
            </div>
          ))}
          {!confirmed&&<div style={{padding:12,borderTop:"1px solid #E2E8F0",display:"flex",gap:8}}>
            <button onClick={()=>setConfirmed(true)} style={{flex:1,padding:"8px 0",background:"#0F172A",color:"#fff",border:"none",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer"}}>Confirm — generate 1 alert →</button>
            <button onClick={()=>{setStep("idle");setConfirmed(false);}} style={{padding:"8px 14px",background:"#F8FAFC",color:"#374151",border:"1px solid #E2E8F0",borderRadius:8,fontSize:11,cursor:"pointer"}}>Discard</button>
          </div>}
          {confirmed&&<div style={{padding:12,borderTop:"1px solid #E2E8F0",background:"#F0FDF4",fontSize:11,color:"#166534",fontWeight:600}}>✓ Alert ALT-2024-00849 created — AI scoring in progress</div>}
        </div>
      )}
    </div>
  );
}

const BLACKLIST_ENTRIES=[
  {name:"Al-Rashid Trading Corp",type:"corporate",id:"—",nationality:"JO",reason:"Fraud — cheque bouncing x3",addedBy:"Risk Dept",date:"2023-11-15",matchRisk:"HIGH"},
  {name:"Khalid Omar Nabulsi",type:"individual",id:"JO-8874321",nationality:"Jordanian",reason:"Suspicious activity — account closed",addedBy:"Compliance",date:"2023-09-02",matchRisk:"CRITICAL"},
  {name:"Freeport Solutions Ltd",type:"corporate",id:"—",nationality:"VG",reason:"Shell company — failed EDD",addedBy:"Compliance",date:"2024-01-03",matchRisk:"HIGH"},
  {name:"Ahmed Bassam Al-Zeer",type:"individual",id:"JO-5523109",nationality:"Jordanian",reason:"Internal fraud — employee",addedBy:"HR/Legal",date:"2023-06-18",matchRisk:"CRITICAL"},
  {name:"Sunrise Import Export",type:"corporate",id:"—",nationality:"SY",reason:"Sanctions adjacency — Syrian nexus",addedBy:"Compliance",date:"2023-12-01",matchRisk:"CRITICAL"},
  {name:"Mohammed Faris Khalil",type:"individual",id:"PA-1234567",nationality:"Pakistani",reason:"Structuring — SAR filed Aug 2023",addedBy:"Compliance",date:"2023-08-22",matchRisk:"HIGH"},
  {name:"Gulf Star General Trading",type:"corporate",id:"—",nationality:"AE",reason:"Fraud network — 3 linked accounts",addedBy:"Risk Dept",date:"2024-01-10",matchRisk:"HIGH"},
  {name:"Rania Yousef Al-Ahmad",type:"individual",id:"JO-9901234",nationality:"Jordanian",reason:"PEP — undisclosed family member",addedBy:"Compliance",date:"2023-10-05",matchRisk:"MEDIUM"},
];

function InternalBlacklistImporter(){
  const [step,setStep]=useState("idle");
  const [colMap,setColMap]=useState({name:"entity_name",type:"entity_type",id:"id_number",nationality:"nationality",reason:"reason",addedBy:"added_by",date:"added_date"});
  const [progress,setProgress]=useState(0);
  const [activePhase,setActivePhase]=useState(0);
  const [selected,setSelected]=useState(BLACKLIST_ENTRIES.map((_,i)=>i));
  const [entries,setEntries]=useState(BLACKLIST_ENTRIES);
  const [showAdd,setShowAdd]=useState(false);
  const [newEntry,setNewEntry]=useState({name:"",type:"individual",reason:"",matchRisk:"MEDIUM"});

  const CSV_COLS=["entity_name","entity_type","id_number","nationality","reason","added_by","added_date","notes"];
  const SCHEMA_FIELDS=[
    {key:"name",label:"Entity name",required:true},
    {key:"type",label:"Type (individual/corporate)",required:true},
    {key:"id",label:"ID / passport number",required:false},
    {key:"nationality",label:"Nationality / country",required:false},
    {key:"reason",label:"Reason for blacklisting",required:true},
    {key:"addedBy",label:"Added by",required:false},
    {key:"date",label:"Date added",required:false},
  ];
  const IMPORT_PHASES=[
    {pct:0,  label:"Reading CSV — detecting columns"},
    {pct:14, label:"Validating column mapping"},
    {pct:28, label:"Parsing rows"},
    {pct:42, label:"Deduplication check"},
    {pct:58, label:"Cross-referencing sanctions lists"},
    {pct:72, label:"Building fuzzy name match index"},
    {pct:86, label:"Writing to ClearPath blacklist database"},
    {pct:100,label:"Complete — blacklist updated"},
  ];

  const riskCol={CRITICAL:{bg:"#FEF2F2",text:"#991B1B"},HIGH:{bg:"#FFF7ED",text:"#9A3412"},MEDIUM:{bg:"#FFFBEB",text:"#92400E"},LOW:{bg:"#F0FDF4",text:"#166534"}};
  const toggleEntry=i=>setSelected(prev=>prev.includes(i)?prev.filter(x=>x!==i):[...prev,i]);

  const runImport=()=>{
    setStep("importing"); setProgress(0); setActivePhase(0);
    let pi=0;
    const iv=setInterval(()=>{
      if(pi>=IMPORT_PHASES.length){clearInterval(iv);setStep("done");return;}
      setActivePhase(pi); setProgress(IMPORT_PHASES[pi].pct); pi++;
    },470);
  };

  return(
    <div>
      {step==="idle"&&(
        <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:18,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:"#0F172A",marginBottom:4}}>Import from file</div>
          <div style={{fontSize:11,color:"#64748B",marginBottom:14}}>Upload a CSV or Excel file. ClearPath maps your columns — no fixed format required.</div>
          <div onClick={()=>setStep("mapping")} style={{border:"2px dashed #E2E8F0",borderRadius:10,padding:"20px",textAlign:"center",cursor:"pointer",background:"#FAFAFA",marginBottom:12}}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#0F172A"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="#E2E8F0"}>
            <div style={{fontSize:22,marginBottom:5}}>⇥</div>
            <div style={{fontSize:12,fontWeight:600,color:"#0F172A",marginBottom:3}}>Drop CSV or Excel · click to simulate import</div>
            <div style={{fontSize:10,color:"#94A3B8"}}>.csv, .xlsx, .xls · any column structure</div>
          </div>
          <div style={{fontSize:9,color:"#94A3B8",marginBottom:5,fontFamily:"monospace"}}>Sample CSV:</div>
          <textarea readOnly value={MOCK_BLACKLIST_CSV} style={{width:"100%",height:90,border:"1px solid #E2E8F0",borderRadius:7,padding:10,fontSize:9,color:"#475569",fontFamily:"monospace",background:"#F8FAFC",resize:"none",boxSizing:"border-box"}}/>
        </div>
      )}

      {step==="mapping"&&(
        <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:18,marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:600,color:"#0F172A",marginBottom:4}}>Map your columns</div>
          <div style={{fontSize:11,color:"#64748B",marginBottom:16}}>7 columns detected. Match to ClearPath schema. Required fields marked ✱</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 32px 1fr",gap:"8px 10px",alignItems:"center",marginBottom:16}}>
            {SCHEMA_FIELDS.map(f=>(
              <div key={f.key} style={{display:"contents"}}>
                <div style={{padding:"7px 10px",background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:7,fontSize:11,color:"#0F172A"}}>{f.label}{f.required&&<span style={{color:"#DC2626"}}> ✱</span>}</div>
                <div style={{textAlign:"center",fontSize:12,color:"#94A3B8"}}>→</div>
                <select value={colMap[f.key]||""} onChange={e=>setColMap(m=>({...m,[f.key]:e.target.value}))} style={{padding:"6px 8px",border:"1px solid #E2E8F0",borderRadius:7,fontSize:11,color:"#0F172A",background:"#fff"}}>
                  <option value="">— skip —</option>
                  {CSV_COLS.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setStep("preview")} style={{flex:1,padding:"8px 0",background:"#0F172A",color:"#fff",border:"none",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer"}}>Preview mapped data →</button>
            <button onClick={()=>setStep("idle")} style={{padding:"8px 14px",background:"#F8FAFC",color:"#374151",border:"1px solid #E2E8F0",borderRadius:8,fontSize:11,cursor:"pointer"}}>Back</button>
          </div>
        </div>
      )}

      {step==="preview"&&(
        <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden",marginBottom:14}}>
          <div style={{padding:"11px 16px",background:"#F8FAFC",borderBottom:"1px solid #E2E8F0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{fontSize:12,fontWeight:600,color:"#0F172A"}}>Preview — {entries.length} entries · 0 duplicates</div>
            <div style={{fontSize:10,color:"#059669"}}>{selected.length} selected</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"32px 1fr 80px 110px 1fr 90px 85px",background:"#F8FAFC",borderBottom:"1px solid #E2E8F0"}}>
            {["","Entity","Type","ID / Country","Reason","Risk","Added"].map(h=><div key={h} style={{padding:"7px 10px",fontSize:9,color:"#64748B",fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",fontFamily:"monospace"}}>{h}</div>)}
          </div>
          {entries.map((e,i)=>{
            const sel=selected.includes(i); const rc=riskCol[e.matchRisk]||riskCol.MEDIUM;
            return(<div key={i} style={{display:"grid",gridTemplateColumns:"32px 1fr 80px 110px 1fr 90px 85px",borderBottom:i<entries.length-1?"1px solid #F1F5F9":"none",alignItems:"center",opacity:sel?1:0.45}}>
              <div style={{padding:"9px 10px"}}>
                <div onClick={()=>toggleEntry(i)} style={{width:13,height:13,borderRadius:3,border:`2px solid ${sel?"#0F172A":"#CBD5E1"}`,background:sel?"#0F172A":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>
                  {sel&&<span style={{color:"#fff",fontSize:8,fontWeight:700}}>✓</span>}
                </div>
              </div>
              <div style={{padding:"9px 10px"}}><div style={{fontSize:11,fontWeight:600,color:"#0F172A"}}>{e.name}</div><div style={{fontSize:9,color:"#94A3B8"}}>{e.addedBy}</div></div>
              <div style={{padding:"9px 10px"}}><span style={{fontSize:9,background:e.type==="individual"?"#FAF5FF":"#F1F5F9",color:e.type==="individual"?"#7C3AED":"#475569",padding:"2px 7px",borderRadius:20}}>{e.type}</span></div>
              <div style={{padding:"9px 10px",fontSize:9,color:"#64748B",fontFamily:"monospace"}}>{e.nationality}</div>
              <div style={{padding:"9px 10px",fontSize:10,color:"#374151",lineHeight:1.4}}>{e.reason}</div>
              <div style={{padding:"9px 10px"}}><span style={{fontSize:9,background:rc.bg,color:rc.text,padding:"2px 7px",borderRadius:20}}>{e.matchRisk}</span></div>
              <div style={{padding:"9px 10px",fontSize:9,color:"#94A3B8",fontFamily:"monospace"}}>{e.date}</div>
            </div>);
          })}
          <div style={{padding:12,borderTop:"1px solid #E2E8F0",display:"flex",gap:8}}>
            <button onClick={runImport} style={{flex:1,padding:"8px 0",background:"#0F172A",color:"#fff",border:"none",borderRadius:8,fontSize:11,fontWeight:600,cursor:"pointer"}}>Import {selected.length} entries →</button>
            <button onClick={()=>setStep("mapping")} style={{padding:"8px 14px",background:"#F8FAFC",color:"#374151",border:"1px solid #E2E8F0",borderRadius:8,fontSize:11,cursor:"pointer"}}>← Remap</button>
          </div>
        </div>
      )}

      {step==="importing"&&<PipelineProgress phases={IMPORT_PHASES} active={activePhase} progress={progress} done={false} result={null}/>}

      {step==="done"&&<div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:10,padding:16,marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,color:"#166534",marginBottom:4}}>✓ {selected.length} entries imported to internal blacklist</div>
        <div style={{fontSize:11,color:"#166534"}}>Fuzzy name match index rebuilt · active on next alert batch · 0 duplicates skipped</div>
      </div>}

      {/* Live blacklist table */}
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden"}}>
        <div style={{padding:"11px 16px",background:"#F8FAFC",borderBottom:"1px solid #E2E8F0",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:12,fontWeight:600,color:"#0F172A"}}>Active blacklist — {entries.length} entries</div>
          <button onClick={()=>setShowAdd(!showAdd)} style={{padding:"5px 12px",background:"#0F172A",color:"#fff",border:"none",borderRadius:7,fontSize:10,fontWeight:600,cursor:"pointer"}}>+ Add entry</button>
        </div>
        {showAdd&&(
          <div style={{padding:14,borderBottom:"1px solid #E2E8F0",background:"#FAFAFA"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 90px 1fr 90px",gap:8,marginBottom:10}}>
              <div>
                <div style={{fontSize:9,color:"#64748B",marginBottom:4}}>Entity name ✱</div>
                <input value={newEntry.name} onChange={e=>setNewEntry(n=>({...n,name:e.target.value}))} placeholder="Full name or company" style={{width:"100%",padding:"6px 9px",border:"1px solid #E2E8F0",borderRadius:7,fontSize:11,color:"#0F172A",boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:9,color:"#64748B",marginBottom:4}}>Type</div>
                <select value={newEntry.type} onChange={e=>setNewEntry(n=>({...n,type:e.target.value}))} style={{width:"100%",padding:"6px 8px",border:"1px solid #E2E8F0",borderRadius:7,fontSize:11,color:"#0F172A"}}>
                  <option value="individual">Individual</option><option value="corporate">Corporate</option>
                </select>
              </div>
              <div>
                <div style={{fontSize:9,color:"#64748B",marginBottom:4}}>Reason ✱</div>
                <input value={newEntry.reason} onChange={e=>setNewEntry(n=>({...n,reason:e.target.value}))} placeholder="e.g. Fraud — case FR-2024-001" style={{width:"100%",padding:"6px 9px",border:"1px solid #E2E8F0",borderRadius:7,fontSize:11,color:"#0F172A",boxSizing:"border-box"}}/>
              </div>
              <div>
                <div style={{fontSize:9,color:"#64748B",marginBottom:4}}>Risk tier</div>
                <select value={newEntry.matchRisk} onChange={e=>setNewEntry(n=>({...n,matchRisk:e.target.value}))} style={{width:"100%",padding:"6px 8px",border:"1px solid #E2E8F0",borderRadius:7,fontSize:11,color:"#0F172A"}}>
                  {["CRITICAL","HIGH","MEDIUM","LOW"].map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{
                if(!newEntry.name||!newEntry.reason)return;
                setEntries(prev=>[{...newEntry,id:"—",nationality:"—",addedBy:"Sara Al-Khalidi",date:new Date().toISOString().slice(0,10)},...prev]);
                setNewEntry({name:"",type:"individual",reason:"",matchRisk:"MEDIUM"});
                setShowAdd(false);
              }} style={{padding:"6px 16px",background:"#059669",color:"#fff",border:"none",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer"}}>Add to blacklist</button>
              <button onClick={()=>setShowAdd(false)} style={{padding:"6px 12px",background:"#F8FAFC",color:"#374151",border:"1px solid #E2E8F0",borderRadius:7,fontSize:11,cursor:"pointer"}}>Cancel</button>
            </div>
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 1fr 90px 85px",background:"#F8FAFC",borderBottom:"1px solid #E2E8F0"}}>
          {["Entity","Type","ID / Country","Reason","Risk","Added"].map(h=><div key={h} style={{padding:"7px 12px",fontSize:9,color:"#64748B",fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",fontFamily:"monospace"}}>{h}</div>)}
        </div>
        {entries.map((e,i)=>{
          const rc=riskCol[e.matchRisk]||riskCol.MEDIUM;
          return(<div key={i} style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 1fr 90px 85px",borderBottom:i<entries.length-1?"1px solid #F1F5F9":"none",alignItems:"center"}}>
            <div style={{padding:"9px 12px"}}><div style={{fontSize:11,fontWeight:600,color:"#0F172A"}}>{e.name}</div><div style={{fontSize:9,color:"#94A3B8"}}>{e.addedBy}</div></div>
            <div style={{padding:"9px 12px"}}><span style={{fontSize:9,background:e.type==="individual"?"#FAF5FF":"#F1F5F9",color:e.type==="individual"?"#7C3AED":"#475569",padding:"2px 7px",borderRadius:20}}>{e.type}</span></div>
            <div style={{padding:"9px 12px",fontSize:9,color:"#64748B",fontFamily:"monospace"}}>{e.nationality}</div>
            <div style={{padding:"9px 12px",fontSize:10,color:"#374151",lineHeight:1.4}}>{e.reason}</div>
            <div style={{padding:"9px 12px"}}><span style={{fontSize:9,background:rc.bg,color:rc.text,padding:"2px 7px",borderRadius:20}}>{e.matchRisk}</span></div>
            <div style={{padding:"9px 12px",fontSize:9,color:"#94A3B8",fontFamily:"monospace"}}>{e.date}</div>
          </div>);
        })}
      </div>
    </div>
  );
}

function BatchImport(){
  const [tab,setTab]=useState("eastnets");
  const TABS=[{id:"eastnets",label:"EastNets batch",sub:"CSV / XML export"},{id:"swift_mt",label:"SWIFT MT",sub:"MT103, MT202…"},{id:"swift_mx",label:"SWIFT MX",sub:"ISO 20022 XML"},{id:"blacklist",label:"Internal blacklist",sub:"CSV / Excel"}];
  const [batches,setBatches]=useState(BATCHES);
  const [importing,setImporting]=useState(false);
  const [progress,setProgress]=useState(0);
  const [phase,setPhase]=useState("");
  const [newBatch,setNewBatch]=useState(null);

  const runEastnets=()=>{
    setImporting(true); setProgress(0); setNewBatch(null);
    const phases=[[0,"Watching /shared/alerts/ for new file…"],[15,"File detected: eastnets_export_20240115_1000.csv"],[28,"SHA-256 dedup check…"],[42,"Parsing CSV — 28 rows"],[56,"Normalising schema…"],[68,"AI scoring — Ollama Mistral 7B…"],[82,"Entity enrichment — OpenSanctions…"],[95,"Writing to PostgreSQL…"],[100,"Complete"]];
    let pi=0;
    const iv=setInterval(()=>{
      if(pi>=phases.length){clearInterval(iv);setImporting(false);
        const nb={id:"BATCH-20240115-003",file:"eastnets_export_20240115_1000.csv",alerts:28,processed:28,failed:0,time:new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"}),status:"complete"};
        setNewBatch(nb);setBatches(prev=>[nb,...prev]);return;}
      setPhase(phases[pi][1]);setProgress(phases[pi][0]);pi++;
    },560);
  };

  return(
    <div style={{padding:24,flex:1,overflowY:"auto"}}>
      <div style={{marginBottom:18}}>
        <div style={{fontSize:19,fontWeight:700,color:"#0F172A"}}>Import centre</div>
        <div style={{fontSize:12,color:"#64748B",marginTop:2}}>EastNets batch · SWIFT MT / MX messages · internal blacklists</div>
      </div>
      <div style={{display:"flex",gap:0,marginBottom:20,background:"#F8FAFC",border:"1px solid #E2E8F0",borderRadius:10,padding:4}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"8px 0",background:tab===t.id?"#fff":"transparent",border:tab===t.id?"1px solid #E2E8F0":"1px solid transparent",borderRadius:8,cursor:"pointer",textAlign:"center"}}>
            <div style={{fontSize:11,fontWeight:600,color:tab===t.id?"#0F172A":"#64748B"}}>{t.label}</div>
            <div style={{fontSize:9,color:tab===t.id?"#94A3B8":"#CBD5E1",marginTop:1}}>{t.sub}</div>
          </button>
        ))}
      </div>

      {tab==="eastnets"&&(
        <div>
          <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:14,marginBottom:14,display:"flex",alignItems:"center",gap:14}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:"#10B981"}}/>
              <div style={{fontSize:12,color:"#0F172A",fontWeight:600}}>File watcher active</div>
            </div>
            <div style={{fontSize:10,color:"#64748B",fontFamily:"monospace"}}>/shared/alerts/eastnets-export/</div>
            <div style={{marginLeft:"auto",fontSize:10,color:"#64748B"}}>60s · last check 0:23 ago</div>
            <button onClick={runEastnets} disabled={importing} style={{padding:"6px 14px",background:importing?"#94A3B8":"#0F172A",color:"#fff",border:"none",borderRadius:7,fontSize:11,fontWeight:600,cursor:importing?"not-allowed":"pointer"}}>{importing?"Processing…":"⇥ Trigger import"}</button>
          </div>
          {(importing||newBatch)&&(
            <div style={{background:"#0F172A",borderRadius:10,padding:16,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:600,color:"#E2E8F0"}}>Pipeline</div>
                <div style={{fontSize:10,color:"#38BDF8",fontFamily:"monospace"}}>{Math.round(progress)}%</div>
              </div>
              <div style={{background:"#1E293B",borderRadius:4,height:5,marginBottom:10}}>
                <div style={{width:`${progress}%`,background:progress===100?"#10B981":"#38BDF8",height:"100%",borderRadius:4,transition:"width 0.35s ease"}}/>
              </div>
              <div style={{fontSize:10,color:"#64748B",fontFamily:"monospace"}}>{phase}</div>
              {progress===100&&newBatch&&<div style={{marginTop:10,background:"#052e16",border:"1px solid #166534",borderRadius:7,padding:"8px 12px",fontSize:11,color:"#10B981",fontWeight:600}}>✓ {newBatch.alerts} alerts processed · {newBatch.id}</div>}
            </div>
          )}
          <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"155px 1fr 65px 70px 55px 80px 90px",background:"#F8FAFC",borderBottom:"1px solid #E2E8F0"}}>
              {["Batch ID","File","Alerts","Processed","Failed","Time","Status"].map(h=><div key={h} style={{padding:"8px 12px",fontSize:9,color:"#64748B",fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",fontFamily:"monospace"}}>{h}</div>)}
            </div>
            {batches.map((b,i)=>{
              const isFail=b.status==="warning";
              return(<div key={b.id} style={{display:"grid",gridTemplateColumns:"155px 1fr 65px 70px 55px 80px 90px",borderBottom:i<batches.length-1?"1px solid #F1F5F9":"none",alignItems:"center",background:b.id===newBatch?.id?"#F0FDF4":"#fff"}}>
                <div style={{padding:"10px 12px",fontSize:9,color:"#475569",fontFamily:"monospace"}}>{b.id}</div>
                <div style={{padding:"10px 12px",fontSize:10,color:"#374151"}}>{b.file}</div>
                <div style={{padding:"10px 12px",fontSize:11,fontFamily:"monospace",color:"#0F172A",fontWeight:600}}>{b.alerts}</div>
                <div style={{padding:"10px 12px",fontSize:11,fontFamily:"monospace",color:"#166534",fontWeight:600}}>{b.processed}</div>
                <div style={{padding:"10px 12px",fontSize:11,fontFamily:"monospace",color:isFail?"#DC2626":"#94A3B8",fontWeight:isFail?700:400}}>{b.failed}</div>
                <div style={{padding:"10px 12px",fontSize:10,color:"#94A3B8",fontFamily:"monospace"}}>{b.time}</div>
                <div style={{padding:"10px 12px"}}><span style={{fontSize:10,background:isFail?"#FFF7ED":"#F0FDF4",color:isFail?"#9A3412":"#166534",padding:"2px 8px",borderRadius:20}}>{isFail?"⚠ warning":"✓ complete"}</span></div>
              </div>);
            })}
          </div>
        </div>
      )}
      {tab==="swift_mt"&&<SwiftMTImporter/>}
      {tab==="swift_mx"&&<SwiftMXImporter/>}
      {tab==="blacklist"&&<InternalBlacklistImporter/>}
    </div>
  );
}
// ─── SETTINGS ────────────────────────────────────────────────────────────────
function Settings(){
  const sections=[
    {title:"Integration",rows:[["EastNets export path","/shared/alerts/eastnets-export/"],["Poll interval","60 seconds"],["File formats","CSV, XML"]]},
    {title:"AI model",rows:[["Active model","clearpath-mistral-7b-q4-v1.2"],["Inference","Local Ollama · CPU only"],["Escalate threshold","≥ 0.80"],["Flag threshold","≥ 0.60"]]},
    {title:"Sanctions feeds",rows:[["OpenSanctions","Connected · synced 04:00"],["OFAC SDN (local)","Daily sync · 03:00"],["CBJ watch list","/data/cbj-watchlist-2024.csv"],["EU Consolidated","Via OpenSanctions"]]},
    {title:"Data retention",rows:[["Alert records","90 days"],["Audit log","7 years"],["Encryption","AES-256 at rest"]]},
  ];
  return(
    <div style={{padding:26,flex:1,overflowY:"auto"}}>
      <div style={{fontSize:19,fontWeight:700,color:"#0F172A",marginBottom:20}}>Settings</div>
      {sections.map(s=>(
        <div key={s.title} style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:18,marginBottom:12}}>
          <div style={{fontSize:9,fontWeight:600,color:"#64748B",textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:"monospace",marginBottom:12}}>{s.title}</div>
          {s.rows.map(([k,v])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid #F1F5F9"}}>
              <span style={{fontSize:12,color:"#374151"}}>{k}</span>
              <span style={{fontSize:10,fontFamily:"monospace",color:"#0F172A",background:"#F8FAFC",padding:"3px 9px",borderRadius:5}}>{v}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const [view,setView]=useState("dashboard");
  const [alerts,setAlerts]=useState(ALERTS);
  const [selected,setSelected]=useState(null);

  const goTo=v=>{ setView(v); if(v!=="detail") setSelected(null); };
  const decide=(id,dec)=>setAlerts(prev=>prev.map(a=>a.id===id?{...a,status:dec}:a));

  const pending=alerts.filter(a=>a.status==="pending").length;
  const critical=alerts.filter(a=>a.status==="pending"&&a.riskTier==="CRITICAL").length;

  return(
    <>
      <style>{`*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F8FAFC;}textarea{font-family:inherit;}`}</style>
      <div style={{display:"flex",height:"100vh",overflow:"hidden"}}>
        <Sidebar view={view==="detail"?"queue":view} setView={goTo} pending={pending} critical={critical}/>
        <main style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",background:"#F8FAFC"}}>
          {view==="dashboard"&&<Dashboard alerts={alerts} setView={goTo} setSelected={setSelected}/>}
          {view==="queue"&&<AlertQueue alerts={alerts} setSelected={setSelected} setView={goTo}/>}
          {view==="detail"&&selected&&<AlertDetail alert={selected} onBack={()=>goTo("queue")} onDecide={decide}/>}
          {view==="audit"&&<AuditTrail alerts={alerts}/>}
          {view==="import"&&<BatchImport/>}
          {view==="rules"&&<RulesEngine/>}
          {view==="settings"&&<Settings/>}
        </main>
      </div>
    </>
  );
}
