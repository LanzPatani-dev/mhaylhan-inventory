import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: profile, error: adminProfileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if ((adminProfileError || profile?.role !== 'admin') && user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('staff_signup_requests')
    .select('id, full_name, username, email, status, requested_at')
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ requests: data ?? [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if ((profileError || profile?.role !== 'admin') && user.app_metadata?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const requestId = typeof body?.requestId === 'string' ? body.requestId : '';
  const decision = body?.decision;
  if (!requestId || !['approve', 'reject'].includes(decision)) {
    return NextResponse.json({ error: 'A request ID and valid decision are required.' }, { status: 400 });
  }

  if (decision === 'reject') {
    const { error } = await supabase
      .from('staff_signup_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
      .eq('id', requestId)
      .eq('status', 'pending');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const { data: signupRequest, error: requestError } = await supabase
    .from('staff_signup_requests')
    .select('id, full_name, username, email, status')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single();

  if (requestError || !signupRequest) {
    return NextResponse.json({ error: 'This signup request is no longer pending.' }, { status: 404 });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Staff approval is not configured on the server.' }, { status: 503 });
  }

  const adminClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: invitation, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    signupRequest.email,
    {
      data: { full_name: signupRequest.full_name, username: signupRequest.username, role: 'staff' },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin}/auth/callback?next=/reset-password`,
    }
  );

  if (inviteError || !invitation.user) {
    return NextResponse.json({ error: inviteError?.message || 'Could not send staff invitation.' }, { status: 502 });
  }

  const { error: updateError } = await supabase
    .from('staff_signup_requests')
    .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user.id })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (updateError) {
    await adminClient.auth.admin.deleteUser(invitation.user.id);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const { error: activationError } = await adminClient
    .from('user_profiles')
    .upsert({
      id: invitation.user.id,
      email: signupRequest.email,
      full_name: signupRequest.full_name,
      username: signupRequest.username,
      role: 'staff',
      is_active: true,
    }, { onConflict: 'id' });

  if (activationError) {
    await supabase.from('staff_signup_requests').update({ status: 'pending', reviewed_at: null, reviewed_by: null }).eq('id', requestId);
    await adminClient.auth.admin.deleteUser(invitation.user.id);
    return NextResponse.json({ error: `Invitation created, but profile activation failed: ${activationError.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, invitedEmail: signupRequest.email });
}
