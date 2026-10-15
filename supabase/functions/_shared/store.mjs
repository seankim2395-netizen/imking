// Only the Edge Function receives this service key. Browsers never query this table.
export function createSupabaseStore({url,serviceKey,fetcher=fetch,network=false}){
 if(!url||!serviceKey)throw Error('Supabase server configuration missing');
 const base=new URL(network?'/rest/v1/imking_network_records':'/rest/v1/imking_worlds',url);
 async function query(owner,{method='GET',revision,body,insert=false}={}){
  const target=new URL(base);target.searchParams.set('select','world_json,revision,updated_at');
  if(!insert)target.searchParams.set('owner_id','eq.'+owner);
  if(revision!==undefined&&!insert)target.searchParams.set('revision','eq.'+revision);
  if(insert)target.searchParams.set('on_conflict','owner_id');
  const result=await fetcher(target,{method,headers:{apikey:serviceKey,Authorization:'Bearer '+serviceKey,'Content-Type':'application/json',Prefer:insert?'resolution=ignore-duplicates,return=representation':'return=representation'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
  if(!result.ok)throw Error('Supabase storage request failed');
  const rows=await result.json();if(!Array.isArray(rows))throw Error('Invalid storage response');return rows[0]||null;
 }
 return {
  read:owner=>query(owner),
  exists:async owner=>!!await query(owner),
  write(owner,world,expected){const body={world_json:JSON.stringify(world),revision:expected+1,updated_at:Date.now()};return expected===0?query(owner,{method:'POST',insert:true,body:{owner_id:owner,...body}}):query(owner,{method:'PATCH',revision:expected,body});},
  remove:(owner,expected)=>query(owner,{method:'DELETE',revision:expected}),
 };
}
