import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
function isPlatformAdmin(user) { return user?.role === 'admin'; }
async function getCountyMembership(base44, userEmail, countyId) {
  const results = await base44.asServiceRole.entities.CountyMembership.filter({ county_id: countyId, user_email: userEmail, status: 'approved' });
  return results[0] || null;
}
async function hasCountyRole(base44, userEmail, countyId, roles) {
  const membership = await getCountyMembership(base44, userEmail, countyId);
  return !!membership && roles.includes(membership.role);
}
async function requireCountyRole(base44, user, countyId, roles) {
  if (isPlatformAdmin(user)) return;
  if (!(await hasCountyRole(base44, user.email, countyId, roles))) throw { status: 403, message: `Forbidden: requires county role ${roles.join(' or ')}` };
}
export default async function(req) {
  try {
    const base44=createClientFromRequest(req); const user=await base44.auth.me(); if(!user)return Response.json({error:'Unauthorized'},{status:401});
    const {countyId}=await req.json().catch(()=>({})); if(!countyId)return Response.json({error:'Missing required field: countyId'},{status:400});
    const ms=await base44.asServiceRole.entities.CountyMembership.filter({county_id:countyId,user_email:user.email}); const m=ms[0]; if(!m)return Response.json({error:'You are not a member of this county'},{status:404});
    await requireCountyRole(base44,user,countyId,['admin','secretary','selector','member']);
    if(m.role==='admin'&&m.status==='approved'){const admins=await base44.asServiceRole.entities.CountyMembership.filter({county_id:countyId,role:'admin',status:'approved'});if(admins.length<=1)return Response.json({error:'Cannot leave: you are the last remaining administrator'},{status:409});}
    await base44.asServiceRole.entities.CountyMembership.delete(m.id); return Response.json({success:true,countyId});
  } catch(e){return Response.json({error:e.message||'Failed to leave county'},{status:e.status||500});}
}