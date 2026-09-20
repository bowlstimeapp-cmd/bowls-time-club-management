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
const ALLOWED_ROLES=['admin','secretary','selector','member'];
export default async function(req) {
  try {
    const base44=createClientFromRequest(req); const user=await base44.auth.me(); if(!user)return Response.json({error:'Unauthorized'},{status:401});
    const {membershipId,newRole,countyId,email,name}=await req.json().catch(()=>({}));
    if(!ALLOWED_ROLES.includes(newRole)||(!membershipId&&!(countyId&&email)))return Response.json({error:'Missing membershipId or invalid role'},{status:400});
    let m=null;
    if(membershipId){
      const ms=await base44.asServiceRole.entities.CountyMembership.filter({id:membershipId}); m=ms[0];
      if(!m)return Response.json({error:'Membership not found'},{status:404});
    }else{
      // Club-affiliated member with no direct county membership yet — promote by creating one
      const ms=await base44.asServiceRole.entities.CountyMembership.filter({county_id:countyId,user_email:email,status:'approved'}); m=ms[0];
    }
    await requireCountyRole(base44,user,m?m.county_id:countyId,['admin']);
    if(!m){
      await base44.asServiceRole.entities.CountyMembership.create({county_id:countyId,user_email:email,user_name:name||email,role:newRole,status:'approved',joined_date:new Date().toISOString().slice(0,10)});
      return Response.json({success:true,email,role:newRole});
    }
    if(m.role==='admin'&&newRole!=='admin'){const admins=await base44.asServiceRole.entities.CountyMembership.filter({county_id:m.county_id,role:'admin',status:'approved'});if(admins.length<=1)return Response.json({error:'Cannot remove the last remaining administrator'},{status:409});}
    await base44.asServiceRole.entities.CountyMembership.update(m.id,{role:newRole}); return Response.json({success:true,membershipId:m.id,role:newRole});
  } catch(e){return Response.json({error:e.message||'Failed to change county member role'},{status:e.status||500});}
}