import { get, put } from "@vercel/blob";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export async function readJson<T>(pathname:string, fallback:T):Promise<T>{
  if(!process.env.VERCEL){const file=resolve(process.cwd(),pathname.replace(/^app\//,"data/"));return existsSync(file)?JSON.parse(readFileSync(file,"utf8")):fallback}
  const result=await get(pathname,{access:"private",useCache:false});
  if(!result||result.statusCode!==200||!result.stream)return fallback;
  return new Response(result.stream).json() as Promise<T>;
}

export async function writeJson(pathname:string,value:unknown){
  const content=JSON.stringify(value,null,2);
  if(!process.env.VERCEL){const file=resolve(process.cwd(),pathname.replace(/^app\//,"data/"));mkdirSync(dirname(file),{recursive:true});writeFileSync(file,content,"utf8");return}
  await put(pathname,content,{access:"private",allowOverwrite:true,contentType:"application/json",cacheControlMaxAge:0});
}
