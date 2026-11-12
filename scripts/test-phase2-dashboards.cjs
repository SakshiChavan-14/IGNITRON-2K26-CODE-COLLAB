const http = require('http');
const { spawn, execSync } = require('child_process');
const path = require('path');

const BASE_URL = 'http://localhost:4000/api';

function request(method, endpoint, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (cookie) {
      options.headers['Cookie'] = cookie;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch {
          json = data;
        }

        const setCookie = res.headers['set-cookie'];
        let sessionCookie = null;
        if (setCookie) {
          const cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : setCookie;
          const match = cookieStr.match(/ignitron_session=([^;]+)/);
          if (match) sessionCookie = `ignitron_session=${match[1]}`;
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: json,
          sessionCookie,
        });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function waitForServer(retries = 30, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await request('GET', '/health');
      if (res.statusCode === 200) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${testName}`);
    passed++;
  } else {
    console.error(`  \x1b[31m✘ FAIL\x1b[0m: ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('=============================================================');
  console.log('   IGNITRON 2K26 — PHASE 2 DASHBOARD & ANNOUNCEMENT SUITE    ');
  console.log('=============================================================\n');

  let backendProc = null;
  const isRunning = await waitForServer(2, 500);

  if (!isRunning) {
    console.log('[Setup] Starting backend server process...');
    backendProc = spawn('node', ['apps/backend/dist/main.js'], {
      cwd: path.resolve(__dirname, '..'),
      env: { ...process.env, PORT: '4000' },
      stdio: 'inherit',
    });

    const ready = await waitForServer(35, 1000);
    if (!ready) {
      console.error('[Error] Backend server failed to start within timeout.');
      if (backendProc) {
        try { execSync(`taskkill /pid ${backendProc.pid} /f /t`); } catch {}
      }
      process.exit(1);
    }
    console.log('[Setup] Backend server is listening at http://localhost:4000\n');
  } else {
    console.log('[Setup] Backend server already running.\n');
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Admin Authentication
    // -------------------------------------------------------------------------
    console.log('[Test 1] Admin Authentication');
    const adminLoginRes = await request('POST', '/auth/admin/login', {
      email: 'admin@ignitron.local',
      password: 'Ignitron@Admin2026',
    });
    assert(adminLoginRes.statusCode === 200, 'Admin credentials authenticate successfully');
    const adminCookie = adminLoginRes.sessionCookie;
    assert(!!adminCookie, 'Admin session cookie issued');

    // -------------------------------------------------------------------------
    // TEST 2: Admin Dashboard Stats
    // -------------------------------------------------------------------------
    console.log('\n[Test 2] Admin Dashboard Extended Stats');
    const statsRes = await request('GET', '/admin/dashboard-stats', null, adminCookie);
    assert(statsRes.statusCode === 200, 'Admin dashboard stats API returns HTTP 200');
    const stats = statsRes.data?.data;
    assert(typeof stats?.totalTeams === 'number', 'Total teams is a number');
    assert(typeof stats?.activeTeams === 'number', 'Active teams is a number');
    assert(typeof stats?.unparticipatedTeams === 'number', 'Unparticipated teams count is provided');
    assert(Array.isArray(stats?.recentRegistrations), 'Recent registrations array is provided');
    assert(Array.isArray(stats?.recentLogins), 'Recent logins array is provided');

    // -------------------------------------------------------------------------
    // TEST 3: Announcements Lifecycle & Privacy
    // -------------------------------------------------------------------------
    console.log('\n[Test 3] Announcement Lifecycle & Public Visibility Privacy');
    
    // Create draft (unpublished) announcement
    const draftRes = await request('POST', '/admin/announcements', {
      title: 'Secret Draft Briefing',
      message: 'This briefing is not ready for contestants.',
      priority: 'NORMAL',
      isPublished: false,
    }, adminCookie);
    assert(draftRes.statusCode === 201, 'Admin can create draft announcement');
    const draftId = draftRes.data?.data?.id;

    // Create published urgent announcement
    const pubRes = await request('POST', '/admin/announcements', {
      title: 'Round 1 Protocol Announcement',
      message: 'All participants must inspect their terminals before start.',
      priority: 'URGENT',
      isPublished: true,
    }, adminCookie);
    assert(pubRes.statusCode === 201, 'Admin can create published announcement');
    const pubId = pubRes.data?.data?.id;

    // Public/Team endpoint: check that ONLY published announcement is returned
    const publicAnnRes = await request('GET', '/announcements');
    assert(publicAnnRes.statusCode === 200, 'Public announcements endpoint returns HTTP 200');
    const publishedList = publicAnnRes.data?.data || [];
    const hasDraft = publishedList.some((a) => a.id === draftId);
    const hasPub = publishedList.some((a) => a.id === pubId);
    assert(!hasDraft, 'Draft announcement is strictly HIDDEN from public/teams');
    assert(hasPub, 'Published announcement is visible to public/teams');

    // Admin endpoint: check that BOTH are returned
    const adminAnnRes = await request('GET', '/admin/announcements', null, adminCookie);
    const adminList = adminAnnRes.data?.data || [];
    assert(
      adminList.some((a) => a.id === draftId) && adminList.some((a) => a.id === pubId),
      'Admin can view all announcements including drafts',
    );

    // Toggle draft to published
    const toggleRes = await request('PATCH', `/admin/announcements/${draftId}/publish`, {
      isPublished: true,
    }, adminCookie);
    assert(toggleRes.statusCode === 200, 'Admin can publish previously drafted announcement');

    const publicAnnRes2 = await request('GET', '/announcements');
    assert(
      (publicAnnRes2.data?.data || []).some((a) => a.id === draftId),
      'Now-published announcement is visible to public/teams',
    );

    // -------------------------------------------------------------------------
    // TEST 4: Team Registration & Participant Dashboard
    // -------------------------------------------------------------------------
    console.log('\n[Test 4] Team Registration & Participant Dashboard Telemetry');
    const testCode = `P2-${Date.now().toString().slice(-4)}`;
    const regRes = await request('POST', '/auth/team/register', {
      teamName: `Team Velocity ${testCode}`,
      institution: 'State Institute of Technology',
      password: 'Password123!',
      participants: [
        {
          fullName: 'Rohan Sharma',
          email: `rohan_${testCode}@gmail.com`,
          phone: '9876543210',
          studentId: `STU-A-${testCode}`,
        },
        {
          fullName: 'Priya Patel',
          email: `priya_${testCode}@yahoo.com`,
          phone: '9876543211',
          studentId: `STU-B-${testCode}`,
        },
      ],
    });
    assert(regRes.statusCode === 201, 'New team registers successfully');
    const teamCode = regRes.data?.data?.teamCode;
    const teamId = regRes.data?.data?.id;

    // Lookup participants to get participant IDs
    const lookupRes = await request('GET', `/auth/team/lookup/${teamCode}`);
    assert(lookupRes.statusCode === 200, 'Team lookup returns registered participants');
    const participants = lookupRes.data?.team?.participants || lookupRes.data?.data?.participants || [];
    assert(participants.length === 2, 'Team lookup returns exactly 2 participants');

    // Team login as Participant A
    const teamLoginRes = await request('POST', '/auth/team/login', {
      teamCode: teamCode,
      password: 'Password123!',
      participantId: participants[0]?.id,
    });
    assert(teamLoginRes.statusCode === 200, 'Team logs in successfully as Participant A');
    const teamCookie = teamLoginRes.sessionCookie;

    // Fetch team competition status
    const statusRes = await request('GET', '/competition/team-status', null, teamCookie);
    assert(statusRes.statusCode === 200, 'Team competition status API returns HTTP 200');
    const teamStatus = statusRes.data?.data;

    assert(teamStatus?.teamCode === teamCode, 'Returns correct teamCode');
    assert(teamStatus?.institution === 'State Institute of Technology', 'Returns correct institution');
    assert(Array.isArray(teamStatus?.participants) && teamStatus.participants.length === 2, 'Returns exactly 2 participants');
    assert(teamStatus?.activeParticipant?.fullName === 'Rohan Sharma', 'Identifies active participant terminal');
    assert(Array.isArray(teamStatus?.roundCards) && teamStatus.roundCards.length === 3, 'Returns 3 official round cards');

    const r1 = teamStatus.roundCards.find((r) => r.roundNumber === 1);
    const r2 = teamStatus.roundCards.find((r) => r.roundNumber === 2);
    const r3 = teamStatus.roundCards.find((r) => r.roundNumber === 3);

    assert(r1?.name?.includes('MCQ Arena'), 'Card 1 is MCQ Arena');
    assert(r2?.name?.includes('Bug Hunt Arena'), 'Card 2 is Bug Hunt Arena');
    assert(r3?.name?.includes('Final Boss'), 'Card 3 is Final Boss Coding');

    // -------------------------------------------------------------------------
    // TEST 5: Leaderboard Publication Gate & Privacy
    // -------------------------------------------------------------------------
    console.log('\n[Test 5] Leaderboard Publication Gate & Privacy');

    // First ensure leaderboard is unpublished
    await request('POST', '/competition/leaderboard/publish', {
      isPublished: false,
    }, adminCookie);

    // Team queries leaderboard when unpublished
    const teamLbUnpublished = await request('GET', '/competition/leaderboard', null, teamCookie);
    assert(teamLbUnpublished.statusCode === 200, 'Team can query leaderboard endpoint');
    assert(teamLbUnpublished.data?.data?.isPublished === false, 'Leaderboard reports isPublished: false');
    assert(teamLbUnpublished.data?.data?.entries?.length === 0, 'Entries are strictly hidden from team when unpublished');

    // Admin queries leaderboard -> can inspect entries even if unpublished
    const adminLb = await request('GET', '/competition/leaderboard', null, adminCookie);
    assert(adminLb.statusCode === 200, 'Admin can inspect leaderboard');

    // Admin publishes leaderboard
    const pubLbRes = await request('POST', '/competition/leaderboard/publish', {
      isPublished: true,
    }, adminCookie);
    assert(pubLbRes.statusCode === 200, 'Admin can publish tournament leaderboard');

    // Team queries published leaderboard
    const teamLbPublished = await request('GET', '/competition/leaderboard', null, teamCookie);
    assert(teamLbPublished.data?.data?.isPublished === true, 'Leaderboard reports isPublished: true');
    assert(Array.isArray(teamLbPublished.data?.data?.entries), 'Published entries returned to team');

    // -------------------------------------------------------------------------
    // TEST 6: Strict Authorization Controls (Role Guarding)
    // -------------------------------------------------------------------------
    console.log('\n[Test 6] Strict Authorization Controls (Team Blocked from Admin APIs)');

    const teamToAdminStats = await request('GET', '/admin/dashboard-stats', null, teamCookie);
    assert(teamToAdminStats.statusCode === 403, 'Team is blocked from /admin/dashboard-stats with HTTP 403');

    const teamToAnnCreate = await request('POST', '/admin/announcements', {
      title: 'Hacked',
      message: 'Testing',
      priority: 'HIGH',
      isPublished: true,
    }, teamCookie);
    assert(teamToAnnCreate.statusCode === 403, 'Team is blocked from /admin/announcements with HTTP 403');

    const teamToPublishLb = await request('POST', '/competition/leaderboard/publish', {
      isPublished: false,
    }, teamCookie);
    assert(teamToPublishLb.statusCode === 403, 'Team is blocked from /competition/leaderboard/publish with HTTP 403');

    // -------------------------------------------------------------------------
    // Clean up created announcements
    // -------------------------------------------------------------------------
    if (draftId) await request('DELETE', `/admin/announcements/${draftId}`, null, adminCookie);
    if (pubId) await request('DELETE', `/admin/announcements/${pubId}`, null, adminCookie);

    // Summary
    console.log('\n=============================================================');
    console.log(`   TOTAL TESTS: ${passed + failed}`);
    console.log(`   PASSED:      \x1b[32m${passed}\x1b[0m`);
    console.log(`   FAILED:      \x1b[31m${failed}\x1b[0m`);
    console.log('=============================================================\n');

    if (backendProc) {
      try { execSync(`taskkill /pid ${backendProc.pid} /f /t`); } catch {}
    }
    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed with error:', err);
    if (backendProc) {
      try { execSync(`taskkill /pid ${backendProc.pid} /f /t`); } catch {}
    }
    process.exit(1);
  }
}

runTests();
