const base = process.argv[2] || 'https://api.mykviz.ru/api';
let failure;
for(let attempt=0;attempt<6;attempt++) {
 try {
  const response=await fetch(base.replace(/\/$/,'')+'/quizzes?public=true&summary=true',{signal:AbortSignal.timeout(10000),headers:{Origin:'https://mykviz.ru'}});
  if(!response.ok) throw new Error('Gallery HTTP '+response.status);
  const body=await response.text(); const cards=JSON.parse(body);
  if(!Array.isArray(cards)||cards.some(c=>typeof c.id!=='string'||c.is_summary!==true||!Number.isInteger(c.question_count))) throw new Error('Invalid gallery response');
  if(Buffer.byteLength(body)>1000000) throw new Error('Gallery response exceeds compact payload budget');
  console.log(JSON.stringify({gallery:'ok',cards:cards.length,bytes:Buffer.byteLength(body)}));
  process.exit(0);
 } catch(error) {failure=error; if(attempt<5) await new Promise(resolve=>setTimeout(resolve,5000));}
}
console.error(failure.message);process.exit(1);
