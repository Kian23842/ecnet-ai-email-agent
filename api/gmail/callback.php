<?php
$code  = $_GET['code'] ?? '';
$state = $_GET['state'] ?? '';
if (!$code || !$state) Response::error('Missing code or state', 400);

$stateData = json_decode(base64_decode($state), true);
$orgId     = $stateData['orgId'] ?? '';
if (!$orgId) Response::error('Invalid state', 400);

$row = Database::query('SELECT * FROM gcp_configs WHERE organization_id = ?', [$orgId])->fetch();
if (!$row) {
    $row = [
        'client_id'     => $_ENV['GOOGLE_CLIENT_ID'] ?? '',
        'client_secret' => Encryption::encrypt($_ENV['GOOGLE_CLIENT_SECRET'] ?? ''),
        'redirect_uri'  => $_ENV['GOOGLE_REDIRECT_URI'] ?? '',
    ];
}

$gmail  = new GmailClient($row);
$tokens = $gmail->exchangeCode($code);
if (empty($tokens['access_token'])) {
    http_response_code(500);
    echo '<h2>Authentication Failed</h2><p>Could not exchange code for tokens.</p>';
    exit;
}

$userInfo = $gmail->getUserInfo($tokens['access_token']);
$email    = $userInfo['email'] ?? '';
$accountId = Database::uuid();
$expiresAt = isset($tokens['expires_in'])
    ? date('Y-m-d H:i:s', time() + (int)$tokens['expires_in'])
    : null;

Database::query('
    INSERT INTO gmail_accounts (id, organization_id, email, access_token, refresh_token, expires_at, scope)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
        access_token  = VALUES(access_token),
        refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
        expires_at    = VALUES(expires_at),
        updated_at    = NOW()
', [
    $accountId, $orgId, $email,
    Encryption::encrypt($tokens['access_token']),
    isset($tokens['refresh_token']) ? Encryption::encrypt($tokens['refresh_token']) : null,
    $expiresAt,
    $tokens['scope'] ?? ''
]);

// Return success page that posts message to opener and closes
header('Content-Type: text/html');
echo <<<HTML
<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f8fafc;">
<div style="text-align:center;background:white;padding:2rem;border-radius:1rem;box-shadow:0 10px 15px -3px rgba(0,0,0,.1);">
  <h2 style="color:#2563eb;">Authentication Successful</h2>
  <p>Gmail account <strong>{$email}</strong> has been connected.</p>
  <script>
    if(window.opener){window.opener.postMessage({type:'GMAIL_AUTH_SUCCESS',email:'{$email}'},'*');setTimeout(()=>window.close(),1500);}
    else{setTimeout(()=>{window.location.href='/';},2000);}
  </script>
</div></body></html>
HTML;
exit;
