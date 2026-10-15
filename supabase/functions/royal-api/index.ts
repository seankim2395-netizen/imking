import {handleGuestSession,handleGuestWorld} from '../_shared/lib/guest-api.mjs';
import {handleNetwork} from '../_shared/lib/network-api.mjs';
import {createHandler} from '../_shared/handler.mjs';
import {createSupabaseStore} from '../_shared/store.mjs';

const url=Deno.env.get('SUPABASE_URL');
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const origins=(Deno.env.get('ALLOWED_ORIGINS')||'https://seankim2395-netizen.github.io').split(',').map(x=>x.trim()).filter(Boolean);
if(!url||!serviceKey||!origins.length)throw Error('Server configuration is required.');
const store=createSupabaseStore({url,serviceKey});
const networkStore=createSupabaseStore({url,serviceKey,network:true});
Deno.serve(createHandler({origins,handleGuestSession,handleGuestWorld,handleNetwork,store,networkStore}));
