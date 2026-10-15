import {cp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export async function buildPublic({sourceDir=resolve(root,'public'),outputDir=resolve(root,'dist'),siteUrl,projectRef}){
 const site=new URL(siteUrl);
 if(site.protocol!=='https:'||site.username||site.password||site.hash||site.search)throw Error('SITE_URL must be a public HTTPS base URL.');
 if(!/^[a-z0-9]{20}$/.test(projectRef||''))throw Error('SUPABASE_PROJECT_REF must be the project reference, not an API key.');
 if(!site.pathname.endsWith('/'))site.pathname+='/';
 if(resolve(sourceDir)===resolve(outputDir))throw Error('Build output must differ from source.');
 await rm(outputDir,{recursive:true,force:true});await mkdir(outputDir,{recursive:true});await cp(sourceDir,outputDir,{recursive:true});
 for(const file of ['index.html','invite.html']){
  const path=resolve(outputDir,file);let html=await readFile(path,'utf8');
  html=html.replaceAll('https://imking.palepark256.chatgpt.site/',site.href);
  if(html.includes('imking.palepark256.chatgpt.site'))throw Error('Old preview host remains in metadata.');
  await writeFile(path,html);
 }
 const appPath=resolve(outputDir,'app.mjs');let app=await readFile(appPath,'utf8');
 const marker='const browserSession=createBrowserSession({legacy:';
 if(app.split(marker).length!==2)throw Error('Browser session integration changed; review the export.');
 app="import {deploymentFetch} from './deployment-client.mjs';\n"+app.replace(marker,'const browserSession=createBrowserSession({fetcher:deploymentFetch,legacy:');
 app=app.replace('사이트의 현재 접근 범위는 소유자 전용입니다. 메신저의 실제 이미지 미리보기는 공개 접근 허용 후 확인할 수 있습니다.','게임 화면은 로그인 없이 열립니다. 개인 기록은 브라우저 접속 정보로 구분합니다.');
 await writeFile(appPath,app);
 await writeFile(resolve(outputDir,'deployment-config.mjs'),'export const API_BASE='+JSON.stringify('https://'+projectRef+'.supabase.co/functions/v1/royal-api')+';\n');
 await writeFile(resolve(outputDir,'deployment-client.mjs'),"import {API_BASE} from './deployment-config.mjs';\nimport {createApiTransport} from './browser-transport.mjs';\nexport const deploymentFetch=createApiTransport({apiBase:API_BASE});\n");
 await writeFile(resolve(outputDir,'.nojekyll'),'');
 return {siteUrl:site.href,outputDir};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 await buildPublic({siteUrl:process.env.SITE_URL,projectRef:process.env.SUPABASE_PROJECT_REF});
 console.log('Public HTML and Supabase connection prepared.');
}
