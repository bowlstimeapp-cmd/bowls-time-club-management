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
    const {membershipId}=await req.json().catch(()=>({})); if(!membershipId)return Response.json({error:'Missing required field: membershipId'},{status:400});
    const ms=await base44.asServiceRole.entities.CountyMembership.filter({id:membershipId}); const m=ms[0]; if(!m)return Response.json({error:'Membership not found'},{status:404});
    await requireCountyRole(base44,user,m.county_id,['admin','secretary']);
    await base44.asServiceRole.entities.CountyMembership.delete(membershipId);
    return Response.json({success:true,membershipId});
  } catch(e){return Response.json({error:e.message||'Failed to reject county membership'},{status:e.status||500});}
}