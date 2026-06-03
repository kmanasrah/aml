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
function BatchImport(){
  const [batches,setBatches]=useState(BATCHES);
  const [importing,setImporting]=useState(false);
  const [progress,setProgress]=useState(0);
  const [phase,setPhase]=useState("");
  const [newBatch,setNewBatch]=useState(null);

  const runImport=()=>{
    setImporting(true); setProgress(0); setNewBatch(null);
    const phases=[
      [0,"Watching /shared/alerts/ for new file…"],
      [15,"File detected: eastnets_export_20240115_1000.csv"],
      [25,"Computing SHA-256 hash — checking for duplicates…"],
      [40,"Parsing CSV — 28 rows detected"],
      [55,"Normalising to canonical schema…"],
      [65,"Enqueuing 28 alerts for AI processing…"],
      [75,"AI scoring batch (28 alerts) — Ollama Mistral 7B…"],
      [88,"Running entity enrichment — OpenSanctions + OFAC…"],
      [96,"Writing enriched records to PostgreSQL…"],
      [100,"Batch complete"],
    ];
    let pi=0;
    const iv=setInterval(()=>{
      if(pi>=phases.length){ clearInterval(iv); setImporting(false);
        const nb={id:"BATCH-20240115-003",file:"eastnets_export_20240115_1000.csv",alerts:28,processed:28,failed:0,time:new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"}),status:"complete"};
        setNewBatch(nb); setBatches(prev=>[nb,...prev]); return; }
      setPhase(phases[pi][1]); setProgress(phases[pi][0]); pi++;
    },600);
  };

  return(
    <div style={{padding:26,flex:1,overflowY:"auto"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <div style={{fontSize:19,fontWeight:700,color:"#0F172A"}}>Batch import</div>
          <div style={{fontSize:12,color:"#64748B",marginTop:2}}>EastNets SafeWatch export processing · file watcher active</div>
        </div>
        <button onClick={runImport} disabled={importing} style={{padding:"9px 18px",background:importing?"#94A3B8":"#0F172A",color:"#fff",border:"none",borderRadius:8,fontSize:12,fontWeight:600,cursor:importing?"not-allowed":"pointer"}}>
          {importing?"Processing…":"⇥ Trigger manual import"}
        </button>
      </div>

      {/* Live progress */}
      {(importing||newBatch)&&(
        <div style={{background:"#0F172A",borderRadius:12,padding:20,marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,color:"#E2E8F0"}}>Import pipeline</div>
            <div style={{fontSize:11,color:"#38BDF8",fontFamily:"monospace"}}>{Math.round(progress)}%</div>
          </div>
          <div style={{background:"#1E293B",borderRadius:4,height:6,marginBottom:14}}>
            <div style={{width:`${progress}%`,background:progress===100?"#10B981":"#38BDF8",height:"100%",borderRadius:4,transition:"width 0.4s ease"}}/>
          </div>
          <div style={{fontSize:11,color:"#64748B",fontFamily:"monospace"}}>{phase}</div>
          {progress===100&&newBatch&&(
            <div style={{marginTop:14,background:"#052e16",border:"1px solid #166534",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
              <span style={{color:"#10B981",fontSize:14}}>✓</span>
              <div>
                <div style={{fontSize:12,color:"#10B981",fontWeight:600}}>{newBatch.alerts} alerts processed successfully</div>
                <div style={{fontSize:10,color:"#166534"}}>{newBatch.id} · {newBatch.file}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status indicator */}
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,padding:16,marginBottom:16,display:"flex",alignItems:"center",gap:16}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#10B981"}}/>
          <div style={{fontSize:12,color:"#0F172A",fontWeight:600}}>File watcher active</div>
        </div>
        <div style={{fontSize:11,color:"#64748B",fontFamily:"monospace"}}>/shared/alerts/eastnets-export/</div>
        <div style={{marginLeft:"auto",fontSize:11,color:"#64748B"}}>Poll interval: 60s</div>
        <div style={{fontSize:11,color:"#64748B"}}>Last check: 0:23 ago</div>
      </div>

      {/* Batch history */}
      <div style={{background:"#fff",border:"1px solid #E2E8F0",borderRadius:10,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:"160px 1fr 70px 70px 60px 80px 90px",background:"#F8FAFC",borderBottom:"1px solid #E2E8F0"}}>
          {["Batch ID","File","Alerts","Processed","Failed","Time","Status"].map(h=>(
            <div key={h} style={{padding:"9px 14px",fontSize:9,color:"#64748B",fontWeight:600,letterSpacing:"0.07em",textTransform:"uppercase",fontFamily:"monospace"}}>{h}</div>
          ))}
        </div>
        {batches.map((b,i)=>{
          const isFail=b.status==="warning";
          return(
            <div key={b.id} style={{display:"grid",gridTemplateColumns:"160px 1fr 70px 70px 60px 80px 90px",borderBottom:i<batches.length-1?"1px solid #F1F5F9":"none",alignItems:"center",background:b.id===newBatch?.id?"#F0FDF4":"#fff"}}>
              <div style={{padding:"11px 14px",fontSize:10,color:"#475569",fontFamily:"monospace"}}>{b.id}</div>
              <div style={{padding:"11px 14px",fontSize:11,color:"#374151"}}>{b.file}</div>
              <div style={{padding:"11px 14px",fontSize:11,fontFamily:"monospace",color:"#0F172A",fontWeight:600}}>{b.alerts}</div>
              <div style={{padding:"11px 14px",fontSize:11,fontFamily:"monospace",color:"#166534",fontWeight:600}}>{b.processed}</div>
              <div style={{padding:"11px 14px",fontSize:11,fontFamily:"monospace",color:isFail?"#DC2626":"#94A3B8",fontWeight:isFail?700:400}}>{b.failed}</div>
              <div style={{padding:"11px 14px",fontSize:10,color:"#94A3B8",fontFamily:"monospace"}}>{b.time}</div>
              <div style={{padding:"11px 14px"}}>
                <span style={{fontSize:10,background:isFail?"#FFF7ED":b.id===newBatch?.id?"#F0FDF4":"#F0FDF4",color:isFail?"#9A3412":"#166534",padding:"2px 9px",borderRadius:20}}>
                  {isFail?"⚠ warning":"✓ complete"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
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
          {view==="settings"&&<Settings/>}
        </main>
      </div>
    </>
  );
}
