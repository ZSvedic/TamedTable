const l={id:"jsonl",extensions:[".jsonl",".ndjson"],contentTypes:["jsonl","ndjson"],parse(c,t){const r=new TextDecoder().decode(c),e=[];r.split(`
`).forEach((i,s)=>{const f=i.trim();if(f!=="")try{e.push(JSON.parse(f))}catch(d){throw new Error(`${t}:${s+1} malformed JSON: ${d.message}`)}});const o=[],n=new Set;for(const i of e)for(const s of Object.keys(i))n.has(s)||(n.add(s),o.push(s));return{rows:e,columns:o}},serialize(c,t){const r=c.map(e=>{if(!t)return JSON.stringify(e);const o={};for(const n of t)o[n]=n in e?e[n]:null;for(const n of Object.keys(e))n in o||(o[n]=e[n]);return JSON.stringify(o)}).join(`
`);return new TextEncoder().encode(r+(r.length?`
`:""))}};export{l as jsonlCodec};
