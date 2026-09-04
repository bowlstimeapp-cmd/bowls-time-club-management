import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { hasClubRole } from '../clubAuth/entry.ts';
export default async function(req: Request): Promise<Response> {
  try { const base44=createClientFromRequest(req); const user=await base44.auth.me(); if(!user)return Response.json({error:'Unauthorized'},{status:401});
    const {club_id,county_id}=await req.json().catch(()=>({})); if(!club_id||!county_id)return Response.json({error:'club_id and county_id are required'},{status:400});
    if(!(await hasClubRole(base44,user.email,club_id,['admin'])))return Response.json({error:'Forbidden: club admin required'},{status:403});
    const counties=await base44.asServiceRole.entities.County.filter({id:county_id,is_active:true}); if(!counties[0])return Response.json({error:'County not found or inactive'},{status:404});
    const existing=await base44.asServiceRole.entities.ClubCountyAffiliation.filter({club_id,county_id});
    if(existing.some(a=>a.status==='approved'))return Response.json({error:'Club is already affiliated with this county'},{status:400});
    if(existing.some(a=>a.status==='pending'))return Response.json({error:'Affiliation request already pending'},{status:400});
    const affiliation=await base44.asServiceRole.entities.ClubCountyAffiliation.create({club_id,county_id,status:'pending',requested_by:user.email});
    return Response.json({success:true,affiliation});
  } catch(e){return Response.json({error:e.message||'Failed to request club affiliation'},{status:500});}
}